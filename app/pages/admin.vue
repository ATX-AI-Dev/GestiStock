<template>
  <div class="p-6">
    <div class="flex flex-col md:flex-row gap-6 items-start">
      <UCard class="w-full md:w-64 shrink-0" :ui="{ body: { padding: 'p-2' } }">
        <template #header><p class="text-xs font-bold text-gray-400 uppercase tracking-widest">Configuration</p></template>
        <div class="flex flex-col gap-1">
          <UButton v-for="(tab, index) in tabs" :key="index" :variant="currentTab === index ? 'solid' : 'ghost'"
            :icon="tab.icon" @click="changeTab(index)" class="justify-start" size="md">
            {{ tab.label }}
          </UButton>
        </div>
      </UCard>

      <div class="flex-1 w-full space-y-6">
        <div class="flex justify-between items-center bg-white dark:bg-gray-900 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-800">
          <h1 class="text-xl font-bold">{{ tabs[currentTab].label }}</h1>
          <UButton color="primary" icon="i-heroicons-plus" @click="openAddModal">Ajouter un élément</UButton>
        </div>

        <UCard :ui="{ body: { padding: 'p-0' } }">
          <UTable :columns="columns" :data="data" :loading="pending">
            <template #actions-cell="{ row }">
              <div class="flex justify-end gap-1">
                <UButton icon="i-heroicons-pencil-square" color="blue" variant="ghost" @click="openEditModal(row.original)" title="Modifier" />
                <UButton icon="i-heroicons-trash" color="red" variant="ghost" @click="remove(row.original.id)" title="Supprimer" />
              </div>
            </template>
          </UTable>
        </UCard>
      </div>
    </div>

    <UModal v-model:open="isModalOpen">
      <template #content>
        <UCard :ui="{ divide: 'divide-y divide-gray-100 dark:divide-gray-800' }">
          <template #header>
            <h3 class="font-bold text-lg">
              {{ editingId ? 'Modifier' : 'Nouveau' }} : {{ tabs[currentTab].label }}
            </h3>
          </template>

          <div class="p-5 space-y-4">
            <UFormField v-if="tabs[currentTab].parentTable" :label="'Sélectionner ' + tabs[currentTab].parentLabel" required>
              <USelectMenu v-model="parentId" :items="parentOptions" label-key="name" value-key="id" 
                placeholder="Choisir..." size="lg" />
            </UFormField>

            <UFormField label="Désignation" required>
              <UInput v-model="newItemName" placeholder="Entrez le nom..." autofocus @keyup.enter="save" size="lg" />
            </UFormField>

            <UFormField v-if="tabs[currentTab].table === 'categories'" label="Spécifications Matérielles">
              <div class="space-y-3">
                <div class="flex items-center gap-3 bg-gray-50 dark:bg-gray-800/50 p-4 rounded-lg border border-gray-100 dark:border-gray-700">
                  <USwitch v-model="isComputer" color="primary" />
                  <span class="text-sm font-medium">C'est un ordinateur (Active CPU, RAM, Stockage, OS)</span>
                </div>
                <div class="flex items-center gap-3 bg-gray-50 dark:bg-gray-800/50 p-4 rounded-lg border border-gray-100 dark:border-gray-700">
                  <USwitch v-model="hasGpu" color="primary" />
                  <span class="text-sm font-medium">Gérer les cartes graphiques dédiées (GPU)</span>
                </div>
              </div>
            </UFormField>
            
            <UFormField v-if="tabs[currentTab].table.includes('models')" label="Type d'appareil">
              <USelectMenu v-model="deviceType" :items="['Desktop', 'Mobile', 'Server']" size="lg" />
            </UFormField>
          </div>

          <template #footer>
            <div class="flex justify-end gap-3">
              <UButton color="gray" variant="ghost" @click="isModalOpen = false">Annuler</UButton>
              <UButton color="primary" @click="save" :loading="isSubmitting" class="px-6">Enregistrer</UButton>
            </div>
          </template>
        </UCard>
      </template>
    </UModal>
  </div>
</template>

<script setup>
const tabs = [
  { label: 'Catégories', table: 'categories', icon: 'i-heroicons-tag' },
  { label: 'Marques Article', table: 'brands', icon: 'i-heroicons-building-office' },
  { label: 'Fournisseurs', table: 'suppliers', icon: 'i-heroicons-truck' },
  { label: 'CPU Marques', table: 'cpu_brands', icon: 'i-heroicons-cpu-chip' },
  { label: 'CPU Gammes', table: 'cpu_ranges', icon: 'i-heroicons-rectangle-stack', parentTable: 'cpu_brands', parentLabel: 'la Marque' },
  { label: 'CPU Modèles', table: 'cpu_models', icon: 'i-heroicons-variable', parentTable: 'cpu_ranges', parentLabel: 'la Gamme' },
  { label: 'GPU Marques', table: 'gpu_brands', icon: 'i-heroicons-sparkles' },
  { label: 'GPU Gammes', table: 'gpu_ranges', icon: 'i-heroicons-square-3-stack-3d', parentTable: 'gpu_brands', parentLabel: 'la Marque' },
  { label: 'GPU Modèles', table: 'gpu_models', icon: 'i-heroicons-bolt', parentTable: 'gpu_ranges', parentLabel: 'la Gamme' },
  { label: 'OS', table: 'os_list', icon: 'i-heroicons-window' },
  { label: 'RAM', table: 'ram_types', icon: 'i-heroicons-ticket' },
  { label: 'Stockage', table: 'storage_types', icon: 'i-heroicons-circle-stack' }
]

const currentTab = ref(0)
const data = ref([])
const parentOptions = ref([])
const pending = ref(false)
const isModalOpen = ref(false)
const isSubmitting = ref(false)

const editingId = ref(null)
const newItemName = ref('')
const parentId = ref(null)
const deviceType = ref('Desktop')
const hasGpu = ref(false)
const isComputer = ref(false) // NOUVEAU

const columns = [{ accessorKey: 'id', header: 'ID' }, { accessorKey: 'name', header: 'Désignation' }, { accessorKey: 'actions', header: '' }]

async function load() {
  pending.value = true
  try {
    data.value = await $fetch(`/api/admin/settings?table=${tabs[currentTab.value].table}`)
    if (tabs[currentTab.value].parentTable) {
      parentOptions.value = await $fetch(`/api/admin/settings?table=${tabs[currentTab.value].parentTable}`)
    }
  } catch (e) { data.value = [] } finally { pending.value = false }
}

function changeTab(index) { currentTab.value = index; load() }

function resetForm() {
  editingId.value = null
  newItemName.value = ''
  parentId.value = null
  deviceType.value = 'Desktop'
  hasGpu.value = false
  isComputer.value = false // NOUVEAU
}

function openAddModal() {
  resetForm()
  isModalOpen.value = true
}

function openEditModal(row) {
  resetForm()
  editingId.value = row.id
  newItemName.value = row.name
  hasGpu.value = row.has_gpu || false
  isComputer.value = row.is_computer || false // NOUVEAU
  deviceType.value = row.device_type || 'Desktop'
  
  if (tabs[currentTab.value].parentTable) {
    parentId.value = row.brand_id || row.range_id || null
  }
  
  isModalOpen.value = true
}

async function save() {
  if (!newItemName.value.trim()) return
  if (tabs[currentTab.value].parentTable && !parentId.value) {
    alert("Veuillez sélectionner un parent !"); return
  }
  isSubmitting.value = true
  try {
    const payload = {
        id: editingId.value,
        name: newItemName.value.trim(),
        brand_id: tabs[currentTab.value].parentTable?.includes('brands') ? parentId.value : undefined,
        range_id: tabs[currentTab.value].parentTable?.includes('ranges') ? parentId.value : undefined,
        device_type: tabs[currentTab.value].table.includes('models') ? deviceType.value : undefined,
        has_gpu: tabs[currentTab.value].table === 'categories' ? hasGpu.value : undefined,
        is_computer: tabs[currentTab.value].table === 'categories' ? isComputer.value : undefined // NOUVEAU
    }
    
    const method = editingId.value ? 'PUT' : 'POST'
    
    await $fetch(`/api/admin/settings?table=${tabs[currentTab.value].table}`, { method, body: payload })
    
    resetForm()
    isModalOpen.value = false
    load()
  } catch (e) {
    alert("Erreur lors de l'enregistrement.")
  } finally { 
    isSubmitting.value = false 
  }
}

async function remove(id) {
  if (confirm('Supprimer cet élément ?')) {
    await $fetch(`/api/admin/settings?table=${tabs[currentTab.value].table}&id=${id}`, { method: 'DELETE' })
    load()
  }
}

onMounted(load)
</script>