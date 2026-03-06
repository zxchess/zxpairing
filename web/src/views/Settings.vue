<script setup lang="ts">
import { useI18n } from 'vue-i18n';
import { Globe, Info, Check } from 'lucide-vue-next';

const { t, locale } = useI18n();

const changeLocale = (lang: string) => {
    locale.value = lang;
    // Persist to localStorage if needed (i18n setup usually handles this or we need to add manual persistence here)
    localStorage.setItem('locale', lang);
};
</script>

<template>
  <div class="space-y-8 animate-fade-in">
    <div class="flex items-center justify-between border-b border-border/50 pb-6">
      <div>
         <h1 class="text-3xl font-bold text-white mb-2">{{ t('nav.settings') }}</h1>
         <p class="text-secondary">{{ t('common.settingsDesc', 'Manage your application preferences') }}</p>
      </div>
    </div>
    
    <!-- Language Settings -->
    <div class="space-y-4">
       <h3 class="text-lg font-bold text-white flex items-center gap-2">
           <Globe class="w-5 h-5 text-primary" /> {{ t('settings.language', 'Language') }}
       </h3>
       <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
           <div 
             @click="changeLocale('en')"
             class="bg-surface border rounded-xl p-4 flex items-center justify-between cursor-pointer transition-all hover:bg-white/5 active:scale-[0.98]"
             :class="locale === 'en' ? 'border-primary ring-1 ring-primary/50' : 'border-border'"
           >
               <div class="flex items-center gap-3">
                   <div class="text-2xl">🇺🇸</div>
                   <div>
                       <div class="font-bold text-white">English</div>
                       <div class="text-xs text-secondary">US English</div>
                   </div>
               </div>
               <div v-if="locale === 'en'" class="bg-primary text-white rounded-full p-1">
                   <Check class="w-4 h-4" />
               </div>
           </div>
           
           <div 
             @click="changeLocale('zh')"
             class="bg-surface border rounded-xl p-4 flex items-center justify-between cursor-pointer transition-all hover:bg-white/5 active:scale-[0.98]"
             :class="locale === 'zh' ? 'border-primary ring-1 ring-primary/50' : 'border-border'"
           >
               <div class="flex items-center gap-3">
                   <div class="text-2xl">🇨🇳</div>
                   <div>
                       <div class="font-bold text-white">简体中文</div>
                       <div class="text-xs text-secondary">Simplified Chinese</div>
                   </div>
               </div>
               <div v-if="locale === 'zh'" class="bg-primary text-white rounded-full p-1">
                   <Check class="w-4 h-4" />
               </div>
           </div>
       </div>
    </div>
    
    <!-- App Info -->
    <div class="space-y-4">
       <h3 class="text-lg font-bold text-white flex items-center gap-2">
           <Info class="w-5 h-5 text-primary" /> {{ t('settings.about', 'About') }}
       </h3>
       <div class="bg-surface border border-border rounded-xl p-6">
           <div class="flex items-center gap-4 mb-4">
               <img src="/logo.png" alt="Logo" class="w-12 h-12 object-contain" />
               <div>
                   <h4 class="font-bold text-white text-lg">智析编排 (Swiss Pairing)</h4>
                   <p class="text-secondary text-sm">v1.0.0 (Beta)</p>
               </div>
           </div>
           <p class="text-secondary text-sm leading-relaxed">
               A modern, efficient chess pairing system supporting Swiss and Round Robin formats.
               Powered by Python Engine and Vue 3.
           </p>
       </div>
    </div>
  </div>
</template>
