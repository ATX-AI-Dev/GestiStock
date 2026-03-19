<template>
  <div class="space-y-10">
    <div class="flex justify-between items-start">
      <div>
        <h1 class="text-3xl font-bold tracking-tight">Tableau de Bord</h1>
        <p class="text-gray-500">Pilotage de l'inventaire en temps réel.</p>
      </div>
      <div class="text-right">
        <UBadge color="primary" variant="subtle" size="lg" class="font-mono px-4 py-2">
          VALORISATION TOTALE : {{ stats?.totalValue }} €
        </UBadge>
      </div>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
      <UCard @click="navigateTo('/articles')" class="cursor-pointer hover:border-primary transition-all group">
        <div class="flex items-center gap-4">
          <div class="p-3 bg-primary/10 rounded-lg group-hover:bg-primary/20"><UIcon name="i-heroicons-tag" class="w-8 h-8 text-primary" /></div>
          <div><p class="text-sm text-gray-500 font-bold uppercase">Total Articles</p><p class="text-2xl font-black">{{ stats?.articlesCount }}</p></div>
        </div>
      </UCard>

      <UCard @click="navigateTo('/stocks?alert=true')" class="cursor-pointer hover:border-red-500 transition-all group">
        <div class="flex items-center gap-4">
          <div class="p-3 bg-red-500/10 rounded-lg group-hover:bg-red-500/20"><UIcon name="i-heroicons-exclamation-triangle" class="w-8 h-8 text-red-500" /></div>
          <div><p class="text-sm text-gray-500 font-bold uppercase">Alertes Stock</p><p class="text-2xl font-black text-red-500">{{ stats?.alertsCount }}</p></div>
        </div>
      </UCard>

      <UCard @click="navigateTo('/sites')" class="cursor-pointer hover:border-blue-500 transition-all group">
        <div class="flex items-center gap-4">
          <div class="p-3 bg-blue-500/10 rounded-lg group-hover:bg-blue-500/20"><UIcon name="i-heroicons-building-office" class="w-8 h-8 text-blue-500" /></div>
          <div><p class="text-sm text-gray-500 font-bold uppercase">Sites Actifs</p><p class="text-2xl font-black">{{ stats?.sitesCount }}</p></div>
        </div>
      </UCard>
    </div>

    <section class="space-y-4 pt-4 border-t border-gray-100 dark:border-gray-800">
      <div class="flex items-center gap-2 text-gray-400 font-bold uppercase text-xs tracking-widest">
        <UIcon name="i-heroicons-map" /> Quantités par site
      </div>
      <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
        <div v-for="site in stats?.distribution" :key="site.id" 
             @click="navigateTo(`/stocks?site_id=${site.id}`)"
             class="p-4 rounded-xl border border-gray-200 dark:border-gray-800 hover:border-primary cursor-pointer transition-all flex justify-between items-center bg-white dark:bg-gray-900 shadow-sm"
        >
          <span class="font-bold text-sm truncate mr-2">{{ site.name }}</span>
          <UBadge color="primary" variant="soft" size="lg">{{ site.total_qty || 0 }}</UBadge>
        </div>
      </div>
    </section>

    <section class="space-y-4 pt-6">
      <div class="flex items-center gap-2 text-gray-400 font-bold uppercase text-xs tracking-widest">
        <UIcon name="i-heroicons-clock" /> 6 Derniers mouvements
      </div>
      
      <div class="flex flex-col gap-3">
        <div v-for="(move, index) in stats?.lastMovements" :key="index" 
             @click="navigateTo('/history')"
             class="p-4 rounded-xl border border-gray-200 dark:border-gray-800 hover:border-blue-500 cursor-pointer transition-all flex flex-col sm:flex-row justify-between sm:items-center bg-white dark:bg-gray-900 shadow-sm gap-4"
        >
          <div class="flex items-center gap-4">
            <div :class="getIconBg(move.type)" class="p-2 rounded-xl flex items-center justify-center">
              <UIcon :name="getIconName(move.type)" :class="getIconColor(move.type)" class="w-6 h-6" />
            </div>
            <div class="flex flex-col">
              <span class="font-bold text-gray-800 dark:text-gray-100">{{ move.article_label }}</span>
              <span class="text-xs text-gray-500 font-mono">{{ new Date(move.created_at).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' }) }}</span>
            </div>
          </div>

          <div class="flex items-center justify-end flex-1 gap-4 sm:gap-6">
            
            <div v-if="move.type === 'OUT'" class="flex flex-col text-right hidden sm:flex">
              <span class="text-[10px] text-gray-400 uppercase tracking-widest">Origine</span>
              <span class="text-sm font-medium">{{ move.from_site_name || 'Inconnu' }}</span>
            </div>
            
            <div v-else-if="move.type === 'TRANSFER'" class="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-100 dark:border-gray-700 text-sm">
              <span class="truncate font-medium text-gray-600 dark:text-gray-300" :title="move.from_site_name">{{ move.from_site_name }}</span>
              <UIcon name="i-heroicons-arrow-right" class="text-gray-400 flex-shrink-0" />
              <span class="truncate font-medium text-gray-600 dark:text-gray-300" :title="move.to_site_name">{{ move.to_site_name }}</span>
            </div>

            <div class="flex items-baseline gap-2 whitespace-nowrap bg-gray-50/50 dark:bg-gray-800/30 px-3 py-1 rounded-lg">
              <span class="text-xs text-gray-400 tracking-widest">Quantité :</span>
              <span class="font-mono font-black text-xl" 
                    :class="{
                      'text-green-500': move.type === 'IN',
                      'text-red-500': move.type === 'OUT',
                      'text-yellow-500': move.type === 'TRANSFER'
                    }">
                {{ move.quantity }}
              </span>
            </div>

          </div>
        </div>

        <div v-if="!stats?.lastMovements?.length" class="text-center py-10 border-2 border-dashed border-gray-200 dark:border-gray-800 rounded-xl text-gray-500 italic text-sm">
          Aucun mouvement récent.
        </div>
      </div>
    </section>
  </div>
</template>

<script setup>
const { data: stats } = await useFetch('/api/stats')
// Helpers pour centraliser le design des icônes selon le type
const getIconName = (type) => {
  if (type === 'IN') return 'i-heroicons-arrow-down-left'
  if (type === 'OUT') return 'i-heroicons-arrow-up-right'
  return 'i-heroicons-arrows-right-left'
}

const getIconColor = (type) => {
  if (type === 'IN') return 'text-green-600'
  if (type === 'OUT') return 'text-orange-600'
  return 'text-blue-600'
}

const getIconBg = (type) => {
  if (type === 'IN') return 'bg-green-100 dark:bg-green-900/30'
  if (type === 'OUT') return 'bg-orange-100 dark:bg-orange-900/30'
  return 'bg-blue-100 dark:bg-blue-900/30'
}
</script>