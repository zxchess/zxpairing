<script setup lang="ts">
import { LayoutDashboard, Trophy, Settings } from 'lucide-vue-next';
import { RouterLink, RouterView, useRoute } from 'vue-router';
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';

const route = useRoute();
const { t } = useI18n();

const navItems = computed(() => [
  { name: t('nav.dashboard'), path: '/', icon: LayoutDashboard },
  { name: t('nav.tournaments'), path: '/tournaments', icon: Trophy }, 
  { name: t('nav.settings'), path: '/settings', icon: Settings },
]);

const isActive = (path: string) => route.path === path;
</script>

<template>
  <div class="min-h-screen bg-background text-text flex">
    <!-- Sidebar -->
    <aside class="w-56 border-r border-border flex flex-col fixed h-full bg-surface/50 backdrop-blur-xl z-10">
      <div class="p-6 border-b border-border/50">
        <div class="flex items-center gap-3">
          <img src="/logo.png" alt="Logo" class="w-8 h-8 object-contain drop-shadow-[0_0_8px_rgba(59,130,246,0.5)]" />
          <h1 class="text-lg font-bold tracking-wide text-white">智析编排</h1>
        </div>
      </div>

      <nav class="flex-1 p-4 space-y-1">
        <RouterLink
          v-for="item in navItems"
          :key="item.path"
          :to="item.path"
          class="flex items-center gap-3 px-4 py-3 rounded-lg transition-all group"
          :class="isActive(item.path) ? 'bg-primary/10 text-primary' : 'text-secondary hover:text-white hover:bg-white/5'"
        >
          <component 
            :is="item.icon" 
            class="w-5 h-5 transition-colors"
            :class="isActive(item.path) ? 'text-primary' : 'group-hover:text-white'"
          />
          <span class="font-medium">{{ item.name }}</span>
        </RouterLink>
      </nav>
      
      <div class="p-4 border-t border-border/50">
        <div class="flex items-center justify-between px-4 py-2">
           <div class="flex items-center gap-3">
              <div class="w-8 h-8 rounded-full bg-gradient-to-tr from-primary to-purple-500"></div>
              <div>
                <div class="text-sm font-medium text-white">{{ $t('nav.admin') }}</div>
                <div class="text-xs text-secondary">{{ $t('nav.license') }}</div>
              </div>
           </div>
           
           <button 
             @click="$i18n.locale = $i18n.locale === 'zh' ? 'en' : 'zh'"
             class="text-xs font-bold text-secondary hover:text-white bg-white/5 hover:bg-white/10 px-2 py-1 rounded transition-colors"
           >
             {{ $i18n.locale === 'zh' ? 'EN' : '中' }}
           </button>
        </div>
      </div>
    </aside>

    <!-- Main Content -->
    <main class="flex-1 ml-56 p-8">
      <div class="max-w-6xl mx-auto">
         <RouterView />
      </div>
    </main>
  </div>
</template>
