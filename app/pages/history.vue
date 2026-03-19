<template>
  <div class="space-y-6">
    <div class="flex justify-between items-center">
      <h1 class="text-2xl font-bold text-gray-800 dark:text-white">Historique des Mouvements</h1>
      <UButton icon="i-heroicons-arrow-path" color="gray" variant="ghost" @click="refreshData" :loading="pending" />
    </div>

    <UCard>
      <div class="flex flex-col md:flex-row gap-6 items-end">
        <UFormField label="Date de début">
          <UInput type="date" v-model="startDate" size="lg" icon="i-heroicons-calendar" />
        </UFormField>
        <UFormField label="Date de fin">
          <UInput type="date" v-model="endDate" size="lg" icon="i-heroicons-calendar" />
        </UFormField>
        
        <UButton v-if="startDate || endDate" color="gray" variant="ghost" icon="i-heroicons-x-mark" @click="resetFilters" size="lg">
          Effacer
        </UButton>
        
        <div class="flex-1"></div>
        
        <UFormField label="Mouvements par page">
          <USelectMenu v-model="limit" :items="[2, 5, 10, 20, 50, 100]" size="lg" class="w-24" />
        </UFormField>
      </div>
    </UCard>

    <UCard>
      
      <div class="flex items-center justify-between bg-primary-50 dark:bg-primary-900/20 p-4 rounded-xl mb-4 border border-primary-100 dark:border-primary-800" v-if="total > limit">
        <div class="text-sm font-bold text-primary-600 dark:text-primary-400 flex items-center gap-2">
          <UIcon name="i-heroicons-cursor-arrow-rays" class="w-5 h-5" />
          Navigation manuelle
        </div>
        <div class="flex items-center gap-4">
          <UButton color="primary" variant="soft" icon="i-heroicons-chevron-left" @click="page--" :disabled="page <= 1">
            Précédent
          </UButton>
          <UBadge size="lg" color="primary" variant="solid">Page {{ page }} / {{ Math.ceil(total / limit) }}</UBadge>
          <UButton color="primary" variant="soft" icon="i-heroicons-chevron-right" trailing @click="page++" :disabled="page >= Math.ceil(total / limit)">
            Suivant
          </UButton>
        </div>
      </div>

      <UTable :columns="columns" :data="paginatedData" :rows="paginatedData" :loading="pending">
        
        <template #created_at-cell="{ row }">
          <div class="flex flex-col" v-if="row?.original?.created_at || row?.created_at">
            <span class="text-sm font-bold text-gray-700 dark:text-gray-300">
              {{ new Date(row?.original?.created_at || row?.created_at).toLocaleDateString('fr-FR') }}
            </span>
            <span class="text-xs text-gray-400">
              {{ new Date(row?.original?.created_at || row?.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute:'2-digit' }) }}
            </span>
          </div>
        </template>

        <template #article_label-cell="{ row }">
          <div class="flex flex-col">
            <span class="font-medium text-primary">{{ row?.original?.article_label || row?.article_label }}</span>
            <span class="text-xs text-gray-500 font-mono">{{ row?.original?.serial_number || row?.serial_number || 'Pas de S/N' }}</span>
          </div>
        </template>

        <template #price-cell="{ row }">
          <div class="font-mono font-medium" v-if="row?.original || row">
            <span v-if="(row?.original?.type || row?.type) === 'IN'" class="text-green-600">
              + {{ row?.original?.purchase_price || row?.purchase_price }} € <small>(Achat)</small>
            </span>
            <span v-else-if="(row?.original?.type || row?.type) === 'OUT'" 
                  :class="{
                    'text-red-600 font-bold': Number(row?.original?.sale_price || row?.sale_price) < Number(row?.original?.purchase_price || row?.purchase_price),
                    'text-blue-600': Number(row?.original?.sale_price || row?.sale_price) >= Number(row?.original?.purchase_price || row?.purchase_price) || !(row?.original?.purchase_price || row?.purchase_price)
                  }">
              - {{ row?.original?.sale_price || row?.sale_price }} € <small>(Vente)</small>
            </span>
            <span v-else class="text-gray-400">—</span>
          </div>
        </template>

        <template #type-cell="{ row }">
          <UBadge :color="getTypeColor(row?.original?.type || row?.type)" variant="subtle" size="md">
            {{ row?.original?.type || row?.type }}
          </UBadge>
        </template>

        <template #movement-cell="{ row }">
          <div class="flex items-center gap-2 text-xs font-medium" v-if="row?.original || row">
            <span class="truncate max-w-[80px]">{{ row?.original?.from_site_name || row?.from_site_name || 'Extérieur' }}</span>
            <UIcon name="i-heroicons-arrow-long-right" class="text-gray-400 w-4 h-4" />
            <span class="truncate max-w-[80px]">{{ row?.original?.to_site_name || row?.to_site_name || 'Client' }}</span>
          </div>
        </template>
      </UTable>

      <div v-if="total > limit" class="flex items-center justify-between mt-4 pt-4 border-t border-gray-100 dark:border-gray-800">
        <span class="text-sm text-gray-500">Affichage de {{ paginatedData.length }} sur {{ total }} mouvements</span>
        
        <UPagination 
          :model-value="page"
          :page="page"
          @update:model-value="val => page = val"
          @update:page="val => page = val"
          :page-count="Number(limit)"
          :items-per-page="Number(limit)"
          :total="total" 
        />
      </div>
    </UCard>
  </div>
</template>

<script setup>
const columns = [
  { accessorKey: 'created_at', header: 'Date', key: 'created_at', label: 'Date' },
  { accessorKey: 'article_label', header: 'Article', key: 'article_label', label: 'Article' },
  { id: 'movement', header: 'Trajet', key: 'movement', label: 'Trajet' },
  { accessorKey: 'type', header: 'Type', key: 'type', label: 'Type' },
  { accessorKey: 'quantity', header: 'Qté', key: 'quantity', label: 'Qté' },
  { id: 'price', header: 'Valeur Unitaire', key: 'price', label: 'Valeur Unitaire' }
]

const page = ref(1)
const limit = ref(10)
const startDate = ref('')
const endDate = ref('')

// Chargement pur de la BDD
const { data: rawHistory, pending, refresh } = await useFetch('/api/history', { default: () => [] })

// 1. Moteur de Recherche / Filtrage
const filteredData = computed(() => {
  let arr = Array.isArray(rawHistory.value) ? rawHistory.value : []
  if (startDate.value) {
    arr = arr.filter(item => {
      if (!item.created_at) return false
      const d = item.created_at.split('T')[0]
      if (endDate.value) {
        return d >= startDate.value && d <= endDate.value
      } else {
        return d === startDate.value
      }
    })
  }
  return arr
})

const total = computed(() => filteredData.value.length)

// 2. Moteur de Pagination
const paginatedData = computed(() => {
  const p = Number(page.value) || 1
  const l = Number(limit.value) || 10
  const start = (p - 1) * l
  const end = start + l
  return filteredData.value.slice(start, end)
})

// Remise à zéro si on change la limite ou les dates
watch([limit, startDate, endDate], () => {
  page.value = 1
})

function refreshData() {
  refresh()
}

function resetFilters() {
  startDate.value = ''
  endDate.value = ''
}

function getTypeColor(type) {
  switch (type) {
    case 'IN': return 'success'
    case 'OUT': return 'info'
    case 'TRANSFER': return 'warning'
    default: return 'gray'
  }
}
</script>