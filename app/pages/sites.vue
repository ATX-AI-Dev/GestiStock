<template>
  <div class="space-y-6">
    <div class="flex justify-between items-center">
      <h1 class="text-2xl font-bold text-gray-800 dark:text-white">Sites de Stockage</h1>
      
      <UModal v-model:open="isModalOpen">
        <UButton color="success" icon="i-heroicons-plus" @click="openCreateModal">
          Ajouter un site
        </UButton>

        <template #content>
          <UCard>
            <template #header>
              <h3 class="font-semibold text-lg">
                {{ isEditing ? 'Modifier le site' : 'Nouveau site de stockage' }}
              </h3>
            </template>

            <form @submit.prevent="saveSite" class="space-y-4">
              <UFormField label="Nom du site" name="name" required>
                <UInput v-model="siteForm.name" placeholder="Ex: Entrepôt Nord" />
              </UFormField>

              <UFormField label="Description" name="description">
                <UTextarea v-model="siteForm.description" placeholder="Détails de l'emplacement..." />
              </UFormField>

              <UFormField label="Statut" name="is_active">
                <div class="flex items-center gap-2">
                  <USwitch v-model="siteForm.is_active" />
                  
                  <span class="text-sm font-medium" :class="siteForm.is_active ? 'text-green-600' : 'text-red-500'">
                    {{ siteForm.is_active ? 'Actif' : 'Inactif' }}
                  </span>
                </div>
              </UFormField>

              <div class="flex justify-end gap-3 mt-6">
                <UButton color="gray" variant="ghost" @click="isModalOpen = false">Annuler</UButton>
                <UButton type="submit" color="primary" :loading="isSubmitting">
                  {{ isEditing ? 'Mettre à jour' : 'Enregistrer' }}
                </UButton>
              </div>
            </form>
          </UCard>
        </template>
      </UModal>
    </div>

    <div v-if="pending" class="flex justify-center p-10">
      <UIcon name="i-heroicons-arrow-path" class="w-8 h-8 animate-spin text-primary" />
    </div>
    <UAlert v-else-if="error" color="error" variant="subtle" icon="i-heroicons-exclamation-triangle" title="Erreur réseau" :description="error.message" />

    <UCard v-else>
      <UTable :columns="columns" :data="sites || []">
        <template #is_active-cell="{ row }">
          <UBadge :color="row.original.is_active ? 'success' : 'error'" variant="subtle">
            {{ row.original.is_active ? 'Actif' : 'Inactif' }}
          </UBadge>
        </template>
        
        <template #actions-cell="{ row }">
          <div class="flex gap-2">
            <UButton title="Modifier" color="gray" variant="ghost" icon="i-heroicons-pencil-square" @click="openEditModal(row.original)" />
            
            <UButton title="Supprimer" color="red" variant="ghost" icon="i-heroicons-trash" @click="deleteSite(row.original.id)" />
          </div>
        </template>
      </UTable>
    </UCard>
  </div>
</template>

<script setup>
const toast = useToast()

const columns = [
  { accessorKey: 'id', header: 'ID' },
  { accessorKey: 'name', header: 'Nom du site' },
  { accessorKey: 'description', header: 'Description' },
  { accessorKey: 'is_active', header: 'Statut' },
  { id: 'actions', header: 'Actions' } 
]

const { data: sites, pending, error, refresh } = await useFetch('/api/sites')

const isModalOpen = ref(false)
const isSubmitting = ref(false)
const isEditing = ref(false)

const siteForm = ref({
  id: null,
  name: '',
  description: '',
  is_active: true
})

function openCreateModal() {
  isEditing.value = false
  siteForm.value = { id: null, name: '', description: '', is_active: true }
  isModalOpen.value = true
}

function openEditModal(siteData) {
  isEditing.value = true
  siteForm.value = { ...siteData } 
  isModalOpen.value = true
}

async function saveSite() {
  isSubmitting.value = true
  try {
    const method = isEditing.value ? 'PUT' : 'POST'
    
    await $fetch('/api/sites', {
      method: method,
      body: siteForm.value
    })
    
    isModalOpen.value = false
    toast.add({ 
      title: 'Succès', 
      description: isEditing.value ? 'Le site a été mis à jour.' : 'Le site a été ajouté.', 
      color: 'success' 
    })
    
    refresh()
    
  } catch (err) {
    toast.add({ title: 'Erreur', description: 'Une erreur est survenue.', color: 'error' })
  } finally {
    isSubmitting.value = false
  }
}

async function deleteSite(id) {
  if (!confirm("Êtes-vous sûr de vouloir supprimer ce site ? Cette action est irréversible.")) return;

  try {
    await $fetch('/api/sites', {
      method: 'DELETE',
      body: { id }
    })
    
    toast.add({ title: 'Succès', description: 'Le site a été supprimé.', color: 'success' })
    refresh()
    
  } catch (err) {
    const errorMessage = err.response?._data?.statusMessage || 'Impossible de supprimer le site.'
    toast.add({ title: 'Opération refusée', description: errorMessage, color: 'error' })
  }
}
</script>