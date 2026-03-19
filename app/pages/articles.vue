<template>
  <div class="space-y-6">
    <div class="flex justify-between items-center">
      <h1 class="text-2xl font-bold text-gray-800 dark:text-white">Catalogue Articles (CMDB)</h1>
      <UButton color="primary" icon="i-heroicons-plus" @click="openModal">Nouvel Article</UButton>
    </div>

    <UCard>
      <div class="mb-4">
        <UInput v-model="search" icon="i-heroicons-magnifying-glass" placeholder="Rechercher par ref, nom, marque..." size="lg" />
      </div>

      <UTable :columns="columns" :data="filteredArticles">
        <template #category_name-cell="{ row }">
          <UBadge color="gray" variant="subtle">{{ row.original.category_name || 'Non classé' }}</UBadge>
        </template>
        <template #has_serial_number-cell="{ row }">
          <div class="flex items-center gap-2">
            <UButton v-if="row.original.has_serial_number" color="primary" variant="soft" size="xs" icon="i-heroicons-list-bullet" @click="viewSerials(row.original)">Voir S/N</UButton>
            <span v-else class="text-gray-400 text-sm italic">Standard</span>
          </div>
        </template>
        
        <template #actions-cell="{ row }">
          <div class="flex items-center gap-1 justify-end">
            <UButton color="gray" variant="ghost" icon="i-heroicons-eye" @click="viewDetails(row.original)" title="Voir fiche technique" />
            <UButton color="blue" variant="ghost" icon="i-heroicons-pencil-square" @click="editArticle(row.original)" title="Modifier" />
            <UButton color="red" variant="ghost" icon="i-heroicons-trash" @click="confirmDelete(row.original)" title="Supprimer" />
          </div>
        </template>
      </UTable>
    </UCard>

    <UModal v-model:open="isDetailsOpen">
      <template #content>
        <UCard v-if="selectedDetails" :ui="{ divide: 'divide-y divide-gray-100 dark:divide-gray-800' }">
          <template #header>
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-3">
                <UIcon name="i-heroicons-information-circle" class="w-6 h-6 text-primary" />
                <h3 class="font-bold text-xl">{{ selectedDetails.label }}</h3>
              </div>
              <UBadge color="primary" variant="subtle">{{ selectedDetails.category_name || 'Sans catégorie' }}</UBadge>
            </div>
          </template>

          <div class="space-y-6">
            <div class="grid grid-cols-2 gap-4 bg-gray-50 dark:bg-gray-900 p-4 rounded-xl">
              <div><p class="text-xs text-gray-500 uppercase tracking-widest mb-1">Référence</p><p class="font-bold font-mono text-primary">{{ selectedDetails.code_article }}</p></div>
              <div><p class="text-xs text-gray-500 uppercase tracking-widest mb-1">Marque</p><p class="font-medium">{{ selectedDetails.brand_name || '-' }}</p></div>
              <div class="col-span-2"><p class="text-xs text-gray-500 uppercase tracking-widest mb-1">Fournisseur</p><p class="font-medium">{{ selectedDetails.supplier_name || '-' }}</p></div>
            </div>

            <div v-if="selectedDetails.specs?.cpu_brand || selectedDetails.specs?.gpu_brand" class="space-y-4">
               <h4 class="font-bold border-b border-gray-100 dark:border-gray-800 pb-2 text-primary flex items-center gap-2"><UIcon name="i-heroicons-cpu-chip" /> Spécifications Système</h4>
               <div class="grid grid-cols-2 gap-y-3 gap-x-4 text-sm">
                 <template v-if="selectedDetails.specs?.cpu_brand">
                   <div class="text-gray-500">Processeur:</div>
                   <div class="font-bold">{{ selectedDetails.specs?.cpu_brand }} {{ selectedDetails.specs?.cpu_family }} {{ selectedDetails.specs?.cpu_model }}</div>
                 </template>
                 
                 <template v-if="selectedDetails.specs?.gpu_brand">
                   <div class="text-gray-500">Carte Graphique:</div>
                   <div class="font-bold text-orange-600 dark:text-orange-400">
                     {{ selectedDetails.specs?.gpu_brand }} {{ selectedDetails.specs?.gpu_family }} {{ selectedDetails.specs?.gpu_model }}
                   </div>
                 </template>

                 <template v-if="selectedDetails.specs?.ram_qty">
                   <div class="text-gray-500">Mémoire (RAM):</div>
                   <div class="font-bold">{{ selectedDetails.specs?.ram_qty }} Go <span class="text-gray-400 font-normal">({{ selectedDetails.specs?.ram_type }})</span></div>
                 </template>
                 
                 <template v-if="selectedDetails.specs?.os">
                   <div class="text-gray-500">Système (OS):</div>
                   <div class="font-bold">{{ selectedDetails.specs?.os }}</div>
                 </template>
               </div>
               
               <div v-if="selectedDetails.specs?.storage?.length" class="mt-4 p-3 border border-gray-100 dark:border-gray-800 rounded-lg">
                 <div class="text-xs text-gray-500 uppercase tracking-widest mb-2 font-bold">Stockage Interne</div>
                 <div v-for="disk in selectedDetails.specs.storage" :key="disk.capacity" class="flex items-center gap-2 text-sm font-medium">
                   <UIcon name="i-heroicons-circle-stack" class="text-gray-400" /> {{ disk.type }} — {{ disk.capacity }}
                 </div>
               </div>
            </div>

            <div v-else-if="selectedDetails.category_name === 'Réseau'" class="space-y-4">
              <h4 class="font-bold border-b border-gray-100 dark:border-gray-800 pb-2 text-blue-500 flex items-center gap-2"><UIcon name="i-heroicons-server" /> Spécifications Réseau</h4>
              <div class="flex justify-between text-sm">
                 <span class="text-gray-500">Type d'équipement:</span>
                 <span class="font-bold">{{ selectedDetails.specs?.network_type || 'Non défini' }}</span>
              </div>
            </div>
          </div>
        </UCard>
      </template>
    </UModal>

    <UModal v-model:open="isModalOpen" :ui="{ width: 'sm:max-w-2xl' }">
      <template #content>
        <form @submit.prevent="saveArticle">
          <UCard :ui="{ divide: 'divide-y divide-gray-100 dark:divide-gray-800' }">
            
            <template #header>
              <h3 class="font-bold text-xl">{{ form.id ? 'Modifier l\'article' : 'Ajouter au catalogue' }}</h3>
            </template>
            
            <div class="max-h-[60vh] overflow-y-auto px-2 py-4 space-y-8">
              <div class="space-y-4 p-5 bg-gray-50 dark:bg-gray-900/50 rounded-xl border border-gray-200 dark:border-gray-800">
                <UFormField label="Référence Interne (Générée auto.)" required>
                  <UInput v-model="form.code_article" size="lg" class="w-full font-mono font-bold text-primary" placeholder="TTT-MMMM-DDDD1" />
                </UFormField>
                <UFormField label="Désignation (Nom complet)" required><UInput v-model="form.label" size="lg" class="w-full" /></UFormField>
                <UFormField label="Traçabilité">
                  <div class="flex items-center gap-3 bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-100 dark:border-gray-700 w-full">
                    <USwitch v-model="form.has_serial_number" />
                    <span class="text-sm font-medium">{{ form.has_serial_number ? 'Gestion unitaire par S/N (Obligatoire)' : 'Gestion en vrac (Standard)' }}</span>
                  </div>
                </UFormField>
              </div>

              <div class="space-y-4">
                <UFormField label="Catégorie">
                  <USelectMenu v-model="form.category" :items="refs?.categories || []" label-key="name" searchable creatable placeholder="Sélectionner ou taper..." size="lg" class="w-full">
                    <template #empty>Taper pour créer...</template>
                  </USelectMenu>
                </UFormField>
                <UFormField label="Marque">
                  <USelectMenu v-model="form.brand" :items="refs?.brands || []" label-key="name" searchable creatable placeholder="Sélectionner ou taper..." size="lg" class="w-full" />
                </UFormField>
                <UFormField label="Fournisseur">
                  <USelectMenu v-model="form.supplier" :items="refs?.suppliers || []" label-key="name" searchable creatable placeholder="Sélectionner ou taper..." size="lg" class="w-full" />
                </UFormField>
              </div>

              <div v-if="isComputerCategory || categoryHasGpu" class="space-y-6 pt-4 border-t border-gray-200 dark:border-gray-800">
                <h4 class="font-bold text-primary-500 flex items-center gap-2 text-lg"><UIcon name="i-heroicons-computer-desktop" class="w-6 h-6" /> Spécifications Matérielles</h4>
                
                <div v-if="isComputerCategory" class="p-5 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-200 dark:border-gray-700 space-y-4">
                  <label class="text-xs font-bold text-gray-500 uppercase tracking-widest block">Processeur (CPU)</label>
                  <div class="space-y-4">
                    <UFormField label="Marque">
                      <USelectMenu v-model="form.specs.cpu_brand" :items="refs?.cpu_brands || []" value-key="name" label-key="name" placeholder="Marque..." class="w-full" size="lg" />
                    </UFormField>
                    <UFormField label="Gamme (ex: Core i5)">
                      <USelectMenu v-model="form.specs.cpu_family" :items="availableCpuFamilies" value-key="name" label-key="name" :disabled="!form.specs.cpu_brand" placeholder="Gamme..." class="w-full" size="lg" />
                    </UFormField>
                    <UFormField label="Modèle exact">
                      <USelectMenu v-model="form.specs.cpu_model" :items="availableCpuModels" value-key="name" label-key="name" :disabled="!form.specs.cpu_family" placeholder="Modèle..." class="w-full" size="lg" />
                    </UFormField>
                  </div>
                </div>

                <div v-if="categoryHasGpu" class="p-5 bg-orange-50 dark:bg-orange-900/10 rounded-xl border border-orange-200 dark:border-orange-800/30 space-y-4">
                  <div class="flex items-center justify-between border-b border-orange-200/50 dark:border-orange-800/50 pb-3">
                    <label class="text-xs font-bold text-orange-600 dark:text-orange-400 uppercase tracking-widest block">Carte Graphique (GPU)</label>
                    <div class="flex items-center gap-3">
                      <span class="text-sm font-medium text-gray-600 dark:text-gray-300">Carte dédiée présente ?</span>
                      <USwitch v-model="form.specs.has_dedicated_gpu" color="orange" />
                    </div>
                  </div>
                  
                  <div v-if="form.specs.has_dedicated_gpu" class="space-y-4 pt-2">
                    <UFormField label="Marque GPU">
                      <USelectMenu v-model="form.specs.gpu_brand" :items="refs?.gpu_brands || []" value-key="name" label-key="name" placeholder="Marque..." class="w-full" size="lg" />
                    </UFormField>
                    <UFormField label="Gamme (ex: RTX 40 Series)">
                      <USelectMenu v-model="form.specs.gpu_family" :items="availableGpuFamilies" value-key="name" label-key="name" :disabled="!form.specs.gpu_brand" placeholder="Gamme..." class="w-full" size="lg" />
                    </UFormField>
                    <UFormField label="Modèle exact GPU">
                      <USelectMenu v-model="form.specs.gpu_model" :items="availableGpuModels" value-key="name" label-key="name" :disabled="!form.specs.gpu_family" placeholder="Modèle..." class="w-full" size="lg" />
                    </UFormField>
                  </div>
                </div>

                <div v-if="isComputerCategory" class="space-y-4 pt-2">
                  <UFormField label="Système d'exploitation">
                    <USelectMenu v-model="form.specs.os" :items="refs?.os_list || []" value-key="name" label-key="name" placeholder="Sélectionner un OS..." class="w-full" size="lg" />
                  </UFormField>
                  <UFormField label="Quantité RAM (Go)"><UInput v-model="form.specs.ram_qty" type="number" placeholder="Ex: 16" class="w-full" size="lg" /></UFormField>
                  <UFormField label="Type de RAM">
                    <USelectMenu v-model="form.specs.ram_type" :items="refs?.ram_types || []" value-key="name" label-key="name" placeholder="Type..." class="w-full" size="lg" />
                  </UFormField>
                </div>

                <div v-if="isComputerCategory" class="p-5 bg-gray-50 dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 space-y-4">
                  <div class="flex justify-between items-center mb-2">
                    <label class="text-sm font-bold uppercase tracking-wider text-gray-600 dark:text-gray-300">Stockage</label>
                    <UButton size="sm" color="gray" icon="i-heroicons-plus" @click="addStorage">Ajouter disque</UButton>
                  </div>
                  <div v-for="(disk, index) in form.specs.storage" :key="index" class="flex gap-2 items-center">
                    <USelectMenu v-model="disk.type" :items="refs?.storage_types || []" value-key="name" label-key="name" class="w-1/3" placeholder="Type..." size="lg" />
                    <UInput v-model="disk.capacity" class="flex-1" placeholder="Ex: 512 Go" size="lg" />
                    <UButton color="red" variant="soft" icon="i-heroicons-trash" size="lg" @click="removeStorage(index)" :disabled="form.specs.storage.length === 1" />
                  </div>
                </div>
              </div>

              <div v-if="isNetworkCategory" class="space-y-4 pt-4 border-t border-gray-200 dark:border-gray-800">
                <h4 class="font-bold text-blue-500 flex items-center gap-2 text-lg"><UIcon name="i-heroicons-server" class="w-6 h-6" /> Équipement Réseau</h4>
                <UFormField label="Type d'équipement">
                  <USelectMenu v-model="form.specs.network_type" :items="['Switch', 'Routeur', 'Pare-feu (Firewall)', 'NAS', 'Borne Wi-Fi (AP)']" creatable placeholder="Sélectionner..." size="lg" class="w-full" />
                </UFormField>
              </div>
            </div>

            <template #footer>
              <div class="flex justify-end gap-4">
                <UButton color="gray" variant="ghost" @click="isModalOpen = false" size="xl" class="px-8">Annuler</UButton>
                <UButton type="submit" color="primary" :loading="isSubmitting" size="xl" class="px-8 shadow-md">
                  {{ form.id ? 'Mettre à jour' : 'Enregistrer' }}
                </UButton>
              </div>
            </template>

          </UCard>
        </form>
      </template>
    </UModal>

    <UModal v-model:open="isSerialListOpen" :ui="{ width: 'sm:max-w-2xl' }">
      <template #content>
        <UCard :ui="{ divide: 'divide-y divide-gray-100 dark:divide-gray-800' }">
          <template #header>
            <div class="flex items-center justify-between">
              <h3 class="font-bold text-lg flex items-center gap-2">
                <UIcon name="i-heroicons-qr-code" class="text-primary w-6 h-6" />
                Unités en stock : {{ selectedArticle?.label }}
              </h3>
              <UBadge color="primary" variant="subtle" size="lg">Total : {{ currentSerials.length }}</UBadge>
            </div>
          </template>

          <div class="max-h-[60vh] overflow-y-auto px-2 py-4">
            <div v-if="currentSerials.length > 0" class="space-y-6">
              <div v-for="(serials, siteName) in groupedSerials" :key="siteName" class="bg-gray-50 dark:bg-gray-900/40 rounded-xl p-5 border border-gray-200 dark:border-gray-800">
                <div class="flex items-center justify-between mb-4 border-b border-gray-200 dark:border-gray-700 pb-2">
                  <div class="flex items-center gap-2 font-bold text-gray-700 dark:text-gray-200 uppercase tracking-wide text-sm">
                    <UIcon name="i-heroicons-building-office-2" class="text-gray-400 w-5 h-5" />
                    {{ siteName }}
                  </div>
                  <UBadge color="gray" variant="soft" title="Quantité sur ce site">{{ serials.length }}</UBadge>
                </div>
                <div class="flex flex-wrap gap-2">
                  <UBadge v-for="sn in serials" :key="sn.serial_number" color="primary" variant="soft" size="md" class="font-mono font-medium shadow-sm cursor-default">
                    {{ sn.serial_number }}
                  </UBadge>
                </div>
              </div>
            </div>
            <div v-else class="text-center py-12 flex flex-col items-center justify-center text-gray-400">
              <UIcon name="i-heroicons-inbox" class="w-12 h-12 mb-3 opacity-20" />
              <p class="text-sm">Aucune unité avec S/N enregistrée pour cet article.</p>
            </div>
          </div>
          
          <template #footer>
            <div class="flex justify-end"><UButton color="gray" variant="ghost" @click="isSerialListOpen = false" size="lg">Fermer</UButton></div>
          </template>
        </UCard>
      </template>
    </UModal>
  </div>
</template>

<script setup>
const toast = useToast()
const { data: articles, refresh: refreshArticles } = await useFetch('/api/articles')
const { data: refs, refresh: refreshRefs } = await useFetch('/api/references')

const isModalOpen = ref(false)
const isSerialListOpen = ref(false)
const isDetailsOpen = ref(false)
const isSubmitting = ref(false)
const search = ref('')
const selectedArticle = ref(null)
const selectedDetails = ref(null)
const currentSerials = ref([])

const getBaseForm = () => ({
  id: null,
  code_article: '', label: '', has_serial_number: false,
  category: null, brand: null, supplier: null,
  specs: {
    cpu_brand: '', cpu_family: '', cpu_model: '', 
    has_dedicated_gpu: false, gpu_brand: '', gpu_family: '', gpu_model: '',
    ram_qty: '', ram_type: '', os: '', network_type: '',
    storage: [{ type: 'NVMe', capacity: '' }]
  }
})
const form = ref(getBaseForm())

const columns = [
  { accessorKey: 'code_article', header: 'Réf' }, 
  { accessorKey: 'category_name', header: 'Catégorie' },
  { accessorKey: 'brand_name', header: 'Marque' },
  { accessorKey: 'label', header: 'Désignation' }, 
  { accessorKey: 'has_serial_number', header: 'Traçabilité' }, 
  { accessorKey: 'actions', header: '' }
]

const groupedSerials = computed(() => {
  if (!currentSerials.value || currentSerials.value.length === 0) return {}
  return currentSerials.value.reduce((acc, curr) => {
    const site = curr.site_name || 'Inconnu'
    if (!acc[site]) acc[site] = []
    acc[site].push(curr)
    return acc
  }, {})
})

const filteredArticles = computed(() => {
  if (!articles.value) return []
  const query = search.value.toLowerCase()
  return articles.value.filter(a => 
    (a.label || '').toLowerCase().includes(query) || 
    (a.code_article || '').toLowerCase().includes(query) ||
    (a.brand_name || '').toLowerCase().includes(query)
  )
})

const currentCategoryName = computed(() => {
  if (!form.value.category) return ''
  return typeof form.value.category === 'object' ? form.value.category.name : form.value.category
})

// === LOGIQUE DYNAMIQUE DES CATEGORIES ===
const isComputerCategory = computed(() => {
  if (!refs.value?.categories || !currentCategoryName.value) return false
  const cat = refs.value.categories.find(c => c.name === currentCategoryName.value)
  return cat ? cat.is_computer : false
})

// Vérifie si la catégorie sélectionnée possède le flag GPU en Base de données
const categoryHasGpu = computed(() => {
  if (!refs.value?.categories || !currentCategoryName.value) return false
  const cat = refs.value.categories.find(c => c.name === currentCategoryName.value)
  return cat ? cat.has_gpu : false
})

const isNetworkCategory = computed(() => currentCategoryName.value === 'Réseau')

const targetDeviceType = computed(() => {
  const cat = currentCategoryName.value
  if (['PC portable', 'PC tablette'].includes(cat)) return 'Mobile'
  if (['Serveur'].includes(cat)) return 'Server'
  return 'Desktop'
})

// --- CASCADES CPU BASEES SUR L'ID DE LA MARQUE/GAMME ---
const availableCpuFamilies = computed(() => {
  if (!refs.value?.cpu_ranges || !form.value.specs.cpu_brand) return []
  // On retrouve l'objet Marque pour avoir son ID
  const brand = refs.value.cpu_brands?.find(b => b.name === form.value.specs.cpu_brand)
  if (!brand) return []
  return refs.value.cpu_ranges.filter(f => f.brand_id === brand.id)
})

const availableCpuModels = computed(() => {
  if (!refs.value?.cpu_models || !form.value.specs.cpu_family) return []
  // On retrouve l'objet Gamme pour avoir son ID
  const family = refs.value.cpu_ranges?.find(f => f.name === form.value.specs.cpu_family)
  if (!family) return []
  return refs.value.cpu_models.filter(m => m.range_id === family.id && m.device_type === targetDeviceType.value)
})

watch(() => form.value.specs.cpu_brand, () => { form.value.specs.cpu_family = ''; form.value.specs.cpu_model = '' })
watch(() => form.value.specs.cpu_family, () => { form.value.specs.cpu_model = '' })

// --- CASCADES GPU BASEES SUR L'ID DE LA MARQUE/GAMME ---
const availableGpuFamilies = computed(() => {
  if (!refs.value?.gpu_ranges || !form.value.specs.gpu_brand) return []
  const brand = refs.value.gpu_brands?.find(b => b.name === form.value.specs.gpu_brand)
  if (!brand) return []
  return refs.value.gpu_ranges.filter(f => f.brand_id === brand.id)
})

const availableGpuModels = computed(() => {
  if (!refs.value?.gpu_models || !form.value.specs.gpu_family) return []
  const family = refs.value.gpu_ranges?.find(f => f.name === form.value.specs.gpu_family)
  if (!family) return []
  return refs.value.gpu_models.filter(m => m.range_id === family.id && m.device_type === targetDeviceType.value)
})

watch(() => form.value.specs.gpu_brand, () => { form.value.specs.gpu_family = ''; form.value.specs.gpu_model = '' })
watch(() => form.value.specs.gpu_family, () => { form.value.specs.gpu_model = '' })
watch(() => form.value.specs.has_dedicated_gpu, (val) => { 
  if(!val) { 
    form.value.specs.gpu_brand = ''; 
    form.value.specs.gpu_family = ''; 
    form.value.specs.gpu_model = ''; 
  } 
})

// --- AUTO REF GÉNÉRATION ---
const formatCodePart = (str, len) => {
  if (!str) return 'X'.repeat(len)
  return String(str).normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z0-9]/g, "").toUpperCase().substring(0, len).padEnd(len, 'X')
}

watch([() => form.value.category, () => form.value.brand, () => form.value.label], () => {
  if (form.value.id) return
  const catStr = typeof form.value.category === 'object' ? form.value.category?.name : form.value.category
  const brandStr = typeof form.value.brand === 'object' ? form.value.brand?.name : form.value.brand
  const labelStr = form.value.label
  if (!catStr && !brandStr && !labelStr) return
  const baseCode = `${formatCodePart(catStr, 3)}-${formatCodePart(brandStr, 4)}-${formatCodePart(labelStr, 4)}`

  let maxN = 0
  if (articles.value) {
    articles.value.forEach(a => {
      if (a.code_article && a.code_article.startsWith(baseCode)) {
        const num = parseInt(a.code_article.substring(baseCode.length), 10)
        if (!isNaN(num) && num > maxN) maxN = num
      }
    })
  }
  form.value.code_article = `${baseCode}${maxN + 1}`
}, { deep: true })


const addStorage = () => form.value.specs.storage.push({ type: 'NVMe', capacity: '' })
const removeStorage = (index) => form.value.specs.storage.splice(index, 1)

function openModal() {
  form.value = getBaseForm()
  isModalOpen.value = true
}

function viewDetails(article) {
  selectedDetails.value = article
  isDetailsOpen.value = true
}

function editArticle(article) {
  form.value = {
    id: article.id,
    code_article: article.code_article,
    label: article.label,
    has_serial_number: article.has_serial_number,
    category: article.category_name,
    brand: article.brand_name,
    supplier: article.supplier_name,
    specs: article.specs ? JSON.parse(JSON.stringify(article.specs)) : getBaseForm().specs
  }
  if (!form.value.specs.storage || form.value.specs.storage.length === 0) {
    form.value.specs.storage = [{ type: 'NVMe', capacity: '' }]
  }
  isModalOpen.value = true
}

async function viewSerials(article) {
  selectedArticle.value = article
  const data = await $fetch(`/api/serials?article_id=${article.id}`)
  currentSerials.value = data
  isSerialListOpen.value = true
}

async function saveArticle() {
  isSubmitting.value = true
  try {
    if (!isComputerCategory.value && !isNetworkCategory.value) {
      form.value.specs = {}
    }
    const method = form.value.id ? 'PUT' : 'POST'
    await $fetch('/api/articles', { method, body: form.value })
    toast.add({ title: 'Succès', description: form.value.id ? 'Article mis à jour' : 'Article ajouté au catalogue', color: 'green' })
    isModalOpen.value = false
    refreshArticles()
    refreshRefs()
  } catch (e) {
    toast.add({ title: 'Erreur', description: 'Action impossible', color: 'red' })
  } finally {
    isSubmitting.value = false
  }
}

async function confirmDelete(article) {
  if (!confirm(`Supprimer ${article.label} ?`)) return
  try {
    await $fetch('/api/articles', { method: 'DELETE', body: { id: article.id } })
    refreshArticles()
  } catch (e) { toast.add({ title: 'Erreur', description: e.statusMessage, color: 'red' }) }
}
</script>