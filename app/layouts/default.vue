<template>
  <div class="min-h-screen bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100 transition-colors duration-300">
    
    <header class="border-b border-gray-200 dark:border-gray-800 bg-white/80 dark:bg-gray-900/80 backdrop-blur sticky top-0 z-50">
      <div class="max-w-7xl mx-auto px-6 sm:px-8 lg:px-12 h-16 flex items-center justify-between">
        
        <div class="flex items-center gap-2 cursor-pointer" @click="navigateTo('/')">
          <UIcon name="i-heroicons-cube-transparent" class="w-8 h-8 text-primary" />
          <span class="text-xl font-bold tracking-tight">GestiStock</span>
        </div>

        <div class="flex items-center gap-4">
          <nav class="hidden md:flex items-center gap-1">
            <UButton to="/" variant="ghost" color="gray" icon="i-heroicons-home">Accueil</UButton>
            <UButton to="/stocks" variant="ghost" color="gray" icon="i-heroicons-archive-box">Stocks</UButton>
            <UButton to="/articles" variant="ghost" color="gray" icon="i-heroicons-squares-2x2">Articles</UButton>
            <UButton to="/sites" variant="ghost" color="gray" icon="i-heroicons-building-office">Sites</UButton>
            <UButton to="/inventory" variant="ghost" color="gray" icon="i-heroicons-clipboard-document-check">Inventaires</UButton>
            <UButton to="/history" variant="ghost" color="gray" icon="i-heroicons-clock">Historique</UButton>
            <UButton to="/admin" variant="ghost" color="gray" icon="i-heroicons-cog-6-tooth">Configuration</UButton>          
          </nav>

          <div class="h-6 w-px bg-gray-200 dark:bg-gray-800 mx-2 hidden md:block"></div>

          <ClientOnly>
            <UButton
              :icon="isDark ? 'i-heroicons-moon' : 'i-heroicons-sun'"
              color="gray"
              variant="ghost"
              aria-label="Theme"
              @click="isDark = !isDark"
            />
          </ClientOnly>
        </div>
      </div>
    </header>

    <main class="max-w-7xl mx-auto px-6 sm:px-8 lg:px-12 py-10">
      <slot />
    </main>

  </div>
</template>

<script setup>
const colorMode = useColorMode()

// Logique pour basculer entre sombre et clair
const isDark = computed({
  get () {
    return colorMode.value === 'dark'
  },
  set () {
    colorMode.preference = colorMode.value === 'dark' ? 'light' : 'dark'
  }
})
</script>