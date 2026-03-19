<template>
  <div class="space-y-6">
    <div class="flex justify-between items-center">
      <h1 class="text-2xl font-bold text-gray-800 dark:text-white">Audit & Inventaires</h1>
      <div v-if="!activeCampaign" class="flex gap-2">
        <USelectMenu v-model="selectedSite" :items="sitesList" label-key="name" placeholder="Choisir un site..." class="w-48" />
        <UButton color="primary" icon="i-heroicons-play" @click="startCampaign" :disabled="!selectedSite" :loading="isStarting">
          Démarrer
        </UButton>
      </div>
      <div v-else class="flex gap-3 items-center">
        <UBadge color="orange" size="lg" class="animate-pulse">Inventaire en cours : {{ activeCampaign.site_name }}</UBadge>
        <UButton color="red" icon="i-heroicons-lock-closed" @click="closeCampaign" :loading="isClosing">
          Clôturer & Régulariser
        </UButton>
        <UButton color="gray" variant="ghost" @click="activeCampaign = null">Quitter (Pause)</UButton>
      </div>
    </div>

    <UCard v-if="!activeCampaign">
      <UTable :columns="campaignColumns" :data="campaigns" :loading="pending">
        <template #status-cell="{ row }">
          <UBadge :color="row.original.status === 'COMPLETED' ? 'green' : 'orange'" variant="subtle">
            {{ row.original.status === 'COMPLETED' ? 'Clôturé' : 'En cours' }}
          </UBadge>
        </template>
        <template #created_at-cell="{ row }">
          {{ new Date(row.original.created_at).toLocaleDateString('fr-FR', { hour: '2-digit', minute:'2-digit' }) }}
        </template>
        <template #actions-cell="{ row }">
          <UButton v-if="row.original.status === 'IN_PROGRESS'" color="primary" variant="soft" size="sm" @click="resumeCampaign(row.original.id)">
            Reprendre le comptage
          </UButton>
          <UButton v-else color="gray" variant="ghost" size="sm" icon="i-heroicons-eye" @click="resumeCampaign(row.original.id)">
            Voir le rapport
          </UButton>
        </template>
      </UTable>
    </UCard>

    <div v-else class="grid grid-cols-1 lg:grid-cols-3 gap-6">
      
      <UCard v-if="activeCampaign.status === 'IN_PROGRESS'" class="lg:col-span-1 border-t-4 border-primary-500">
        <template #header><h3 class="font-bold">Zone de Saisie</h3></template>
        <div class="space-y-6">
          <UFormField label="1. Article scanné/compté">
            <USelectMenu v-model="selectedArticle" :items="articlesList" label-key="label" searchable size="lg" class="w-full" />
          </UFormField>

          <div v-if="selectedArticle" class="p-4 bg-gray-50 dark:bg-gray-900 rounded-xl border border-gray-200">
            <div v-if="selectedArticle.has_serial_number">
               <label class="text-xs font-bold uppercase block mb-2">Scanner un S/N</label>
               <UInput v-model="tempSn" placeholder="S/N + Entrée" size="lg" @keydown.enter.prevent="addCount" autofocus />
            </div>
            <div v-else>
               <label class="text-xs font-bold uppercase block mb-2">Quantité trouvée</label>
               <div class="flex gap-2">
                 <UInput v-model.number="tempQty" type="number" min="1" size="lg" class="flex-1" />
                 <UButton color="primary" @click="addCount">Ajouter</UButton>
               </div>
            </div>
          </div>
        </div>
      </UCard>

      <UCard :class="activeCampaign.status === 'IN_PROGRESS' ? 'lg:col-span-2' : 'lg:col-span-3'">
        <template #header>
          <div class="flex justify-between items-center">
            <h3 class="font-bold">Lignes de Rapprochement</h3>
            <span class="text-sm text-gray-500">{{ lines.length }} références attendues</span>
          </div>
        </template>
        
        <div class="space-y-4 max-h-[60vh] overflow-y-auto">
          <div v-for="line in lines" :key="line.article_id" class="p-4 rounded-xl border" :class="getLineColor(line)">
            <div class="flex justify-between items-start mb-2">
              <div>
                <p class="font-bold text-lg">{{ line.label }}</p>
                <p class="text-xs text-gray-500 font-mono">{{ line.code_article }}</p>
              </div>
              <div class="text-right">
                <p class="text-xs uppercase tracking-widest text-gray-400">Progression</p>
                <p class="font-bold text-xl">{{ line.counted_quantity }} / {{ line.expected_quantity }}</p>
              </div>
            </div>

            <div v-if="line.has_serial_number" class="mt-3 text-sm">
               <div class="flex flex-wrap gap-1 mt-1">
                 <UBadge v-for="sn in line.expected_serials" :key="'exp'+sn" :color="line.counted_serials?.includes(sn) ? 'green' : 'gray'" variant="subtle">
                   {{ sn }}
                 </UBadge>
                 <UBadge v-for="sn in (line.counted_serials || []).filter(s => !line.expected_serials?.includes(s))" :key="'new'+sn" color="orange" variant="solid" title="Inconnu sur ce site !">
                   {{ sn }} (Surplus)
                 </UBadge>
               </div>
            </div>
          </div>
        </div>
      </UCard>

    </div>
  </div>
</template>

<script setup>
const toast = useToast()

const { data: sitesList } = await useFetch('/api/sites')
const { data: articlesList } = await useFetch('/api/articles')
const { data: campaigns, refresh: refreshCampaigns, pending } = await useFetch('/api/inventory')

const selectedSite = ref(null)
const isStarting = ref(false)
const isClosing = ref(false)

const activeCampaign = ref(null)
const lines = ref([])
const selectedArticle = ref(null)

const tempSn = ref('')
const tempQty = ref(1)

const campaignColumns = [
  { accessorKey: 'site_name', header: 'Site' },
  { accessorKey: 'created_at', header: 'Date Ouverture' },
  { accessorKey: 'total_lines', header: 'Réf. Auditées' },
  { accessorKey: 'status', header: 'Statut' },
  { accessorKey: 'actions', header: '' }
]

// Couleur du bloc selon l'écart
const getLineColor = (line) => {
  if (line.counted_quantity === line.expected_quantity) return 'bg-green-50/50 border-green-200 dark:bg-green-900/10'
  if (line.counted_quantity > line.expected_quantity) return 'bg-orange-50/50 border-orange-200 dark:bg-orange-900/10'
  return 'bg-red-50/50 border-red-200 dark:bg-red-900/10' // Manquant
}

async function startCampaign() {
  if (!selectedSite.value) return
  isStarting.value = true
  try {
    const res = await $fetch('/api/inventory', { method: 'POST', body: { site_id: selectedSite.value.id } })
    await resumeCampaign(res.id)
    toast.add({ title: 'Inventaire démarré', description: 'Snapshot du stock effectué.', color: 'green' })
    refreshCampaigns()
  } catch (e) {
    toast.add({ title: 'Impossible de démarrer', description: e.statusMessage, color: 'red' })
  } finally {
    isStarting.value = false
    selectedSite.value = null
  }
}

async function resumeCampaign(id) {
  const data = await $fetch(`/api/inventory?id=${id}`)
  activeCampaign.value = data.campaign
  lines.value = data.lines
}

async function addCount() {
  if (!selectedArticle.value) return
  
  // Trouve la ligne ou la crée virtuellement
  let line = lines.value.find(l => l.article_id === selectedArticle.value.id)
  if (!line) {
    line = { 
      campaign_id: activeCampaign.value.id, article_id: selectedArticle.value.id, 
      label: selectedArticle.value.label, code_article: selectedArticle.value.code_article,
      has_serial_number: selectedArticle.value.has_serial_number,
      expected_quantity: 0, counted_quantity: 0, expected_serials: [], counted_serials: [] 
    }
    lines.value.unshift(line) // Ajoute en haut
  }

  if (line.has_serial_number) {
    const sn = tempSn.value.trim()
    if (!sn) return
    if (!line.counted_serials) line.counted_serials = []
    if (line.counted_serials.includes(sn)) {
      toast.add({ title: 'Doublon', description: 'S/N déjà scanné.', color: 'orange' })
      tempSn.value = ''
      return
    }
    line.counted_serials.push(sn)
    line.counted_quantity = line.counted_serials.length
    tempSn.value = ''
  } else {
    line.counted_quantity += tempQty.value
    tempQty.value = 1
  }

  // Sauvegarde instantanée en BDD
  await $fetch('/api/inventory', { 
    method: 'PUT', 
    body: { 
      campaign_id: line.campaign_id, 
      article_id: line.article_id, 
      counted_quantity: line.counted_quantity, 
      counted_serials: line.counted_serials 
    } 
  })
}

async function closeCampaign() {
  if (!confirm('Attention : Cela va générer des mouvements de régularisation pour tous les écarts trouvés. Continuer ?')) return
  isClosing.value = true
  try {
    await $fetch('/api/inventory-close', { method: 'POST', body: { campaign_id: activeCampaign.value.id } })
    toast.add({ title: 'Inventaire Clôturé', description: 'Les stocks ont été régularisés avec succès.', color: 'green' })
    activeCampaign.value = null
    refreshCampaigns()
  } catch (e) {
    toast.add({ title: 'Erreur', description: e.statusMessage, color: 'red' })
  } finally {
    isClosing.value = false
  }
}
</script>