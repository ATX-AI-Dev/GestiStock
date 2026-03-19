<template>
  <div class="space-y-6">
    <div class="flex justify-between items-center">
      <h1 class="text-2xl font-bold text-gray-800 dark:text-white">État des Stocks</h1>
      <UButton color="primary" icon="i-heroicons-plus-circle" size="lg" @click="openModal">
        Nouveau Mouvement
      </UButton>

      <UModal v-model:open="isOpen">
        <template #content>
          <UCard class="w-full max-w-xl shadow-2xl border-t-4 border-primary-500">
            <template #header>
              <div class="flex items-center gap-3">
                <div class="p-2 bg-primary-100 dark:bg-primary-900 rounded-lg text-primary-600">
                  <UIcon name="i-heroicons-arrows-right-left" class="w-6 h-6" />
                </div>
                <div>
                  <h3 class="font-bold text-xl">Nouveau Mouvement</h3>
                  <p class="text-xs text-gray-500">Saisie d'une opération de stock</p>
                </div>
              </div>
            </template>

            <form @submit.prevent="submitMove" class="space-y-6 py-2">
              <div class="grid grid-cols-2 gap-4">
                <UFormField label="Type d'opération" required>
                  <USelectMenu v-model="move.type" :items="typeOptions" size="lg" />
                </UFormField>

                <UFormField label="Article concerné" required>
                  <USelectMenu 
                    v-model="move.article_id" 
                    :items="articlesList" 
                    label-key="label" 
                    value-attribute="id" 
                    searchable 
                    size="lg" 
                    class="w-full"
                    :ui="{ width: 'w-full min-w-[300px]', option: { base: 'whitespace-nowrap truncate' } }"
                  />
                </UFormField>
              </div>

              <UDivider />

              <div v-if="currentType === 'IN'" class="grid grid-cols-2 gap-4">
                <UFormField label="Site de destination" required>
                  <USelectMenu v-model="move.to_site_id" :items="sitesList" label-key="name" value-attribute="id" size="lg" class="w-full" :ui="{ width: 'w-full min-w-[250px]' }" />
                </UFormField>
                <UFormField label="Prix d'Achat Unitaire (€)" required>
                  <UInput v-model="move.purchase_price" type="number" step="0.01" size="lg" />
                </UFormField>
              </div>

              <div v-if="currentType === 'OUT'" class="grid grid-cols-2 gap-4">
                <UFormField label="Site d'origine" required>
                  <USelectMenu v-model="move.from_site_id" :items="filteredSites" label-key="name" value-attribute="id" size="lg" class="w-full" :disabled="!move.article_id" placeholder="Sites avec stock..." :ui="{ width: 'w-full min-w-[250px]' }" />
                </UFormField>
                <UFormField label="Prix de Vente (€)" required>
                  <UInput v-model="move.sale_price" type="number" step="0.01" size="lg" />
                </UFormField>
              </div>

              <div v-if="currentType === 'TRANSFER'" class="grid grid-cols-2 gap-4">
                <UFormField label="Site d'origine" required>
                  <USelectMenu 
                    v-model="move.from_site_id" 
                    :items="filteredSites" 
                    label-key="name" 
                    value-attribute="id" 
                    size="lg" 
                    class="w-full" 
                    :disabled="!move.article_id" 
                    placeholder="Sites avec stock..." 
                    :ui="{ width: 'w-full min-w-[250px]' }" 
                  />
                </UFormField>
                <UFormField label="Site de destination" required>
                  <USelectMenu 
                    v-model="move.to_site_id" 
                    :items="filteredDestinationSites" 
                    label-key="name" 
                    value-attribute="id" 
                    size="lg" 
                    class="w-full" 
                    :disabled="!move.from_site_id"
                    placeholder="Choisir une destination..."
                    :ui="{ width: 'w-full min-w-[250px]' }" 
                  />
                </UFormField>
              </div>

              <div v-if="showSerials" class="p-4 rounded-xl bg-gray-50 dark:bg-gray-900 border border-gray-200">
                <label class="text-xs font-bold uppercase text-primary-600 mb-2 block">
                  Traçabilité S/N <span class="text-gray-400 font-normal">(Quantité auto-calculée)</span>
                </label>
                
                <div v-if="currentType === 'IN'">
                  <div class="flex gap-2 mb-2">
                    <UInput 
                      v-model="tempSn" 
                      placeholder="Scanner ou taper S/N puis Entrée..." 
                      size="lg" 
                      class="flex-1"
                      @keydown.enter.prevent="addSerial"
                      :loading="isCheckingSn"
                    />
                    <UButton color="gray" icon="i-heroicons-plus" @click="addSerial" :loading="isCheckingSn" />
                  </div>
                  <div class="flex flex-wrap gap-2 mt-2">
                    <UBadge 
                      v-for="(sn, index) in move.serials_in" 
                      :key="index" 
                      color="primary" 
                      variant="subtle"
                      class="cursor-pointer hover:bg-red-100 hover:text-red-700"
                      @click="removeSerial(index)"
                      title="Cliquez pour retirer"
                    >
                      {{ sn }} &times;
                    </UBadge>
                    <p v-if="move.serials_in.length === 0" class="text-xs text-gray-400 italic">Aucun S/N saisi.</p>
                  </div>
                </div>

                <div v-else>
                  <p v-if="!move.from_site_id" class="text-xs text-orange-500 italic">Veuillez d'abord choisir un site d'origine</p>
                  <USelectMenu 
                    v-else
                    v-model="move.selected_serials" 
                    :items="availableSerials" 
                    placeholder="Sélectionner les S/N à sortir..." 
                    searchable 
                    multiple
                    size="lg"
                    class="w-full"
                    :loading="isFetchingSerials" 
                    :ui="{ width: 'w-full min-w-[300px]' }"
                  />
                  <div class="flex flex-wrap gap-2 mt-3">
                    <UBadge v-for="sn in move.selected_serials" :key="sn" color="green" variant="subtle">
                      {{ sn }}
                    </UBadge>
                  </div>
                </div>
              </div>

              <div class="flex justify-center border-t pt-4">
                <div class="text-center">
                  <label class="text-xs font-bold text-gray-400 uppercase block mb-1">Quantité</label>
                  <UInput 
                    v-model="move.quantity" 
                    type="number" 
                    min="1" 
                    class="w-32 text-center text-xl font-bold" 
                    size="xl" 
                    :disabled="showSerials" 
                  />
                </div>
              </div>

              <div class="flex gap-4 mt-6">
                <UButton color="gray" variant="ghost" @click="isOpen = false" class="flex-1 justify-center">Annuler</UButton>
                <UButton type="submit" color="primary" size="xl" class="flex-[2] justify-center" :loading="isSubmitting">
                  Valider l'opération
                </UButton>
              </div>
            </form>
          </UCard>
        </template>
      </UModal>
    </div>

    <div class="flex flex-col sm:flex-row gap-4 bg-gray-50 dark:bg-gray-900 p-4 rounded-xl border border-gray-200 dark:border-gray-800">
      <UInput 
        v-model="searchQuery" 
        icon="i-heroicons-magnifying-glass" 
        placeholder="Rechercher un article..." 
        size="lg"
        class="flex-1"
        :ui="{ icon: { trailing: { pointer: '' } } }"
      >
        <template #trailing>
          <UButton v-show="searchQuery" color="gray" variant="link" icon="i-heroicons-x-mark" :padded="false" @click="searchQuery = ''" />
        </template>
      </UInput>
      
      <USelectMenu 
        v-model="filterSite" 
        :items="siteFilterOptions" 
        label-key="name" 
        value-attribute="id" 
        size="lg"
        class="w-full sm:w-72" 
      />
    </div>

    <UCard>
      <UTable :columns="columns" :data="filteredStocksTable" :loading="pending">
        <template #quantity-cell="{ row }">
          <UBadge :color="row.original.quantity <= row.original.alert_threshold ? 'red' : 'green'" variant="subtle">
            {{ row.original.quantity }}
          </UBadge>
        </template>
        <template #empty-state>
          <div class="flex flex-col items-center justify-center py-6 text-gray-500">
            <UIcon name="i-heroicons-inbox" class="w-8 h-8 mb-2" />
            <p>Aucun stock ne correspond à vos filtres.</p>
          </div>
        </template>
      </UTable>
    </UCard>
  </div>
</template>

<script setup>
const toast = useToast()
const isOpen = ref(false)
const isSubmitting = ref(false)
const isCheckingSn = ref(false)
const tempSn = ref('')

// --- ÉTATS DE FILTRAGE (Nouveau) ---
const searchQuery = ref('')
const filterSite = ref(null)

const typeOptions = [
  { label: 'Entrée (Achat)', value: 'IN' },
  { label: 'Sortie (Vente)', value: 'OUT' },
  { label: 'Transfert', value: 'TRANSFER' }
]

const getInitialState = () => ({
  type: typeOptions[0],
  article_id: null,
  from_site_id: null,
  to_site_id: null,
  quantity: 1,
  purchase_price: 0,
  sale_price: 0,
  serials_in: [],
  selected_serials: []
})

const move = ref(getInitialState())

const extractId = (field) => {
  if (!field) return null
  if (typeof field === 'object') return Number(field.id || field.value)
  return Number(field)
}

const currentType = computed(() => move.value.type?.value || 'IN')

// Requêtes de données
const { data: stocks, refresh, pending } = useFetch('/api/stocks', { lazy: true, default: () => [] })
const { data: articlesList } = useFetch('/api/articles', { lazy: true, default: () => [] })
const { data: sitesList } = useFetch('/api/sites', { lazy: true, default: () => [] })

// --- LOGIQUE DE FILTRAGE DE LA TABLE (Le "grep / awk") ---

// Construit les options du menu de filtre en ajoutant "Tous les sites" au sommet
const siteFilterOptions = computed(() => {
  return [
    { id: null, name: 'Tous les sites' }, 
    ...(sitesList.value || [])
  ]
})

// Moteur de filtrage temps réel
const filteredStocksTable = computed(() => {
  let result = stocks.value || []

  // 1. Filtrage par site (Awk)
  const targetSiteId = extractId(filterSite.value)
  if (targetSiteId) {
    result = result.filter(row => Number(row.site_id) === targetSiteId)
  }

  // 2. Filtrage par recherche de texte (Grep)
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase().trim()
    result = result.filter(row => {
      // On cherche dans le label de l'article de manière insensible à la casse
      const label = (row.article_label || '').toLowerCase()
      return label.includes(query)
    })
  }

  return result
})

const columns = [
  { accessorKey: 'site_name', header: 'Site' },
  { accessorKey: 'article_label', header: 'Article' },
  { accessorKey: 'quantity', header: 'Stock actuel' },
  { accessorKey: 'alert_threshold', header: 'Alerte' }
]

function openModal() {
  move.value = getInitialState()
  tempSn.value = ''
  isOpen.value = true
}

// Logiques du formulaire (S/N, Anti-Loop, etc.)
const showSerials = computed(() => {
  const aId = extractId(move.value.article_id)
  if (!aId || !articlesList.value) return false
  const art = articlesList.value.find(a => Number(a.id) === aId)
  return !!art?.has_serial_number
})

const filteredSites = computed(() => {
  if (currentType.value === 'IN') return sitesList.value
  const aId = extractId(move.value.article_id)
  if (!aId || !stocks.value) return []
  const sitesWithStock = stocks.value.filter(s => Number(s.article_id) === aId && Number(s.quantity) > 0).map(s => Number(s.site_id))
  return sitesList.value.filter(site => sitesWithStock.includes(Number(site.id)))
})

const filteredDestinationSites = computed(() => {
  const fromId = extractId(move.value.from_site_id)
  if (!fromId || !sitesList.value) return sitesList.value || []
  return sitesList.value.filter(site => Number(site.id) !== fromId)
})

watch(() => move.value.from_site_id, (newVal) => {
  const fromId = extractId(newVal)
  const toId = extractId(move.value.to_site_id)
  if (fromId && toId && fromId === toId) {
    move.value.to_site_id = null
  }
})

const availableSerials = ref([])
const isFetchingSerials = ref(false)

watch([() => move.value.article_id, () => move.value.from_site_id, currentType], async () => {
  const aId = extractId(move.value.article_id)
  const sId = extractId(move.value.from_site_id)
  
  move.value.selected_serials = []
  availableSerials.value = []

  if (currentType.value === 'IN' || !aId || !sId) return

  isFetchingSerials.value = true
  try {
    const res = await $fetch(`/api/serials`, { params: { article_id: aId, site_id: sId } })
    availableSerials.value = res.map(item => item.serial_number || item)
  } catch (error) {
    console.error("Erreur S/N :", error)
  } finally {
    isFetchingSerials.value = false
  }
}, { immediate: true })

const addSerial = async () => {
  const sn = tempSn.value.trim()
  if (!sn) return

  if (move.value.serials_in.includes(sn)) {
    toast.add({ title: 'Doublon local', description: `Vous avez déjà scanné le S/N ${sn}.`, color: 'orange' })
    tempSn.value = ''
    return
  }

  isCheckingSn.value = true
  try {
    const existsInDb = await $fetch(`/api/check-serial?sn=${encodeURIComponent(sn)}`)
    if (existsInDb) {
      toast.add({ title: 'S/N Existant', description: `Le numéro de série ${sn} est déjà enregistré !`, color: 'red' })
      return
    }
    move.value.serials_in.push(sn)
    tempSn.value = ''
  } catch (e) {
    toast.add({ title: 'Erreur réseau', description: 'Impossible de vérifier la disponibilité du S/N.', color: 'red' })
  } finally {
    isCheckingSn.value = false
  }
}

const removeSerial = (index) => {
  move.value.serials_in.splice(index, 1)
}

watch(() => move.value.serials_in, (newVal) => {
  if (showSerials.value && currentType.value === 'IN') move.value.quantity = newVal.length || 1
}, { deep: true })

watch(() => move.value.selected_serials, (newVal) => {
  if (showSerials.value && currentType.value !== 'IN') move.value.quantity = newVal.length || 1
}, { deep: true })

watch([() => move.value.article_id, currentType], () => {
  move.value.from_site_id = null
  move.value.selected_serials = []
  move.value.serials_in = []
  tempSn.value = ''
})

async function submitMove() {
  const safeArticleId = extractId(move.value.article_id)
  const safeFromId = extractId(move.value.from_site_id)
  const safeToId = extractId(move.value.to_site_id)

  if (!safeArticleId) {
    toast.add({ title: 'Erreur', description: 'Article manquant', color: 'red' })
    return
  }

  isSubmitting.value = true

  try {
    const payload = { 
      type: currentType.value,
      article_id: safeArticleId,
      from_site_id: safeFromId,
      to_site_id: safeToId,
      quantity: Number(move.value.quantity) || 1,
      purchase_price: Number(move.value.purchase_price) || 0,
      sale_price: Number(move.value.sale_price) || 0,
      serials: [] 
    }
    
    if (showSerials.value) {
      if (currentType.value === 'IN') {
        if (move.value.serials_in.length === 0) throw new Error("Veuillez saisir au moins un Numéro de Série.")
        payload.serials = Array.from(move.value.serials_in) 
      } else {
        if (move.value.selected_serials.length === 0) throw new Error("Veuillez sélectionner au moins un Numéro de Série.")
        payload.serials = Array.from(move.value.selected_serials) 
      }
      payload.quantity = payload.serials.length
    }

    await $fetch('/api/stocks', { method: 'POST', body: payload })
    
    toast.add({ title: 'Succès', description: 'Mouvement enregistré', color: 'green' })
    isOpen.value = false
    refresh()
  } catch (e) {
    toast.add({ title: 'Erreur', description: e.message || e.data?.message || 'Erreur lors de l\'enregistrement', color: 'red' })
  } finally {
    isSubmitting.value = false
  }
}
</script>