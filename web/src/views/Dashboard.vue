<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { Plus, Calendar, Trophy, ArrowRight, Trash2, RotateCcw, MapPin, Layers } from 'lucide-vue-next';
import { useRouter } from 'vue-router';
import { 
    fetchTournaments, createTournament as apiCreateTournament, 
    fetchTrash, deleteTournament as apiDelete, restoreTournament as apiRestore, 
    fetchEvents, createEvent as apiCreateEvent, deleteEvent as apiDeleteEvent,
    type Tournament, type TournamentEvent 
} from '../api/client';
import { useI18n } from 'vue-i18n';

const { t } = useI18n();
const events = ref<TournamentEvent[]>([]);
const orphanTournaments = ref<Tournament[]>([]);
const loading = ref(true);
const router = useRouter();
const isTrashView = ref(false);

const loadData = async () => {
    try {
        loading.value = true;
        if (isTrashView.value) {
            orphanTournaments.value = await fetchTrash();
            events.value = []; // Trash only shows tournaments for now
        } else {
            const [allEvents, allTournaments] = await Promise.all([
                fetchEvents(),
                fetchTournaments()
            ]);
            
            // Map tournaments to events
            events.value = allEvents.map(e => ({
                ...e,
                tournaments: allTournaments.filter(t => t.eventId === e.id)
            }));
            
            // Filter orphans
            orphanTournaments.value = allTournaments.filter(t => !t.eventId);
        }
    } catch (e) {
        console.error(e);
    } finally {
        loading.value = false;
    }
};

onMounted(loadData);

const toggleTrash = () => {
    isTrashView.value = !isTrashView.value;
    loadData();
};

// ... Tournament functions (Delete, Restore) ...
const handleDeleteTournament = async (id: number, e: Event) => {
    e.stopPropagation();
    if (confirm(t('dashboard.confirmDelete'))) {
        try {
            await apiDelete(id);
            await loadData();
        } catch (e) {
            console.error(e);
            alert('Delete failed');
        }
    }
};

const handleRestoreTournament = async (id: number, e: Event) => {
    e.stopPropagation();
    try {
        await apiRestore(id);
        await loadData();
    } catch (e) {
        console.error(e);
    }
};

// ... Event functions ...
const handleCreateEvent = async () => {
    const name = prompt(t('dashboard.enterEventName', 'Enter Event Name'));
    if (!name) return;
    try {
        await apiCreateEvent(name);
        await loadData();
    } catch (e) {
        console.error(e);
        alert('Failed to create event');
    }
};

const handleDeleteEvent = async (id: number, e: Event) => {
    e.stopPropagation();
    if (confirm(t('dashboard.confirmDeleteEvent', 'Delete event and all its groups?'))) {
        try {
            await apiDeleteEvent(id);
            await loadData();
        } catch (e) {
            console.error(e);
            alert('Delete failed');
        }
    }
};

// Create Group (Tournament) inside Event
const handleCreateGroup = async (eventId?: number) => {
    const name = prompt(t('prompt.enterName'));
    if (!name) return;
    
    const system = prompt(t('prompt.selectSystem'), 'swiss');
    if (system === 'swiss' || system === 'round_robin') {
        try {
            await apiCreateTournament(name, system, eventId);
            await loadData();
        } catch (e) {
            console.error(e);
            alert(t('prompt.createFailed'));
        }
    }
};

const goToDetail = (id: number) => {
    if (isTrashView.value) return;
    router.push(`/tournaments/${id}`);
};

const formatDate = (date: string) => new Date(date).toLocaleDateString();
</script>

<template>
  <div class="space-y-8 animate-fade-in">
    <!-- Header -->
    <div class="flex justify-between items-end border-b border-border/50 pb-6">
      <div>
        <h1 class="text-4xl font-bold tracking-tight text-white mb-2">{{ isTrashView ? $t('common.trash') : $t('dashboard.title') }}</h1>
        <p class="text-secondary max-w-xl">{{ $t('dashboard.subtitle') }}</p>
      </div>
      <div class="flex items-center gap-3">
          <button 
            @click="toggleTrash"
            class="flex items-center gap-2 px-5 py-2.5 rounded-full font-medium transition-all"
            :class="isTrashView ? 'bg-surface text-white hover:bg-surface/80' : 'text-secondary hover:text-white hover:bg-white/5'"
          >
            <Trash2 class="w-5 h-5" v-if="!isTrashView" />
            <ArrowRight class="w-5 h-5 rotate-180" v-else />
            {{ isTrashView ? $t('dashboard.backToList') : $t('dashboard.viewTrash') }}
          </button>
          
          <button 
            v-if="!isTrashView"
            @click="handleCreateEvent"
            class="flex items-center gap-2 bg-primary hover:bg-primary/90 text-white px-5 py-2.5 rounded-full font-medium transition-all shadow-lg shadow-primary/20"
          >
            <Layers class="w-5 h-5" />
            {{ t('dashboard.createEvent', 'New Event') }}
          </button>
      </div>
    </div>

    <div v-if="loading" class="flex items-center justify-center py-20 text-secondary">
        {{ $t('common.loading') }}
    </div>

    <div v-else class="space-y-8">
        
        <!-- EVENTS SECTION -->
        <div v-if="!isTrashView && events.length > 0" class="grid grid-cols-1 gap-6">
            <div v-for="event in events" :key="event.id" class="bg-surface border border-border rounded-2xl overflow-hidden shadow-sm hover:border-border/80 transition-all">
                <!-- Event Header -->
                <div class="p-6 border-b border-border/50 bg-white/5 flex justify-between items-start">
                    <div>
                        <div class="flex items-center gap-3 mb-1">
                            <h2 class="text-2xl font-bold text-white">{{ event.name }}</h2>
                            <span class="text-xs font-mono text-secondary bg-black/20 px-2 py-1 rounded">{{ event.tournaments?.length || 0 }} Groups</span>
                        </div>
                        <div class="flex items-center gap-4 text-sm text-secondary">
                            <span class="flex items-center gap-1"><Calendar class="w-4 h-4"/> {{ formatDate(event.startDate) }}</span>
                            <span v-if="event.location" class="flex items-center gap-1"><MapPin class="w-4 h-4"/> {{ event.location }}</span>
                        </div>
                    </div>
                    <div class="flex items-center gap-2">
                        <button 
                           @click="handleCreateGroup(event.id)"
                           class="flex items-center gap-2 bg-primary/10 hover:bg-primary/20 text-primary px-4 py-2 rounded-lg font-medium transition-colors text-sm"
                        >
                           <Plus class="w-4 h-4" /> {{ t('dashboard.addGroup', 'Add Group') }}
                        </button>
                        <button 
                           @click="handleDeleteEvent(event.id, $event)"
                           class="p-2 text-secondary hover:text-red-500 transition-colors"
                        >
                           <Trash2 class="w-4 h-4" />
                        </button>
                    </div>
                </div>
                
                <!-- Groups List (Horizontal Scroll or Grid) -->
                <div class="p-6 bg-background/30">
                    <div v-if="!event.tournaments || event.tournaments.length === 0" class="text-center py-8 text-secondary border border-dashed border-border rounded-xl">
                        {{ t('dashboard.noGroups', 'No groups yet. Add a group to start pairing.') }}
                    </div>
                    <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                         <div 
                            v-for="t in event.tournaments" :key="t.id"
                            @click="goToDetail(t.id)"
                            class="group bg-surface border border-border rounded-xl p-4 hover:border-primary/50 hover:bg-surface/80 transition-all cursor-pointer flex justify-between items-center"
                          >
                             <div>
                                 <div class="flex items-center gap-2 mb-1">
                                     <span class="font-bold text-white group-hover:text-primary transition-colors">{{ t.name }}</span>
                                     <span class="text-[10px] font-mono bg-white/10 px-1.5 py-0.5 rounded text-secondary uppercase">{{ t.system }}</span>
                                 </div>
                                 <div class="text-xs text-secondary flex items-center gap-2">
                                     <span :class="t.status === 'ONGOING' ? 'text-green-500' : 'text-gray-500'">● {{ t.status }}</span>
                                     <span>R{{ t.currentRound }}</span>
                                 </div>
                             </div>
                             <ArrowRight class="w-4 h-4 text-border group-hover:text-primary transition-transform group-hover:translate-x-1" />
                          </div>
                    </div>
                </div>
            </div>
        </div>

        <!-- ORPHAN TOURNAMENTS (Legacy) -->
        <div v-if="orphanTournaments.length > 0 || isTrashView">
            <h3 v-if="!isTrashView && events.length > 0" class="text-xl font-bold text-white mb-4 flex items-center gap-2">
                <Layers class="w-5 h-5 text-secondary" /> {{ t('dashboard.otherTournaments', 'Other Tournaments') }}
            </h3>
            
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div 
                v-for="t in orphanTournaments" :key="t.id"
                @click="goToDetail(t.id)"
                class="group bg-surface border border-border rounded-xl p-6 hover:border-primary/50 hover:bg-surface/80 transition-all cursor-pointer relative overflow-hidden shadow-sm"
                :class="{ 'opacity-70 grayscale': isTrashView }"
              >
                <!-- Existing Card Content -->
                <div class="flex items-start justify-between mb-6">
                  <div class="p-3 bg-white/5 rounded-xl text-primary group-hover:bg-primary group-hover:text-white transition-colors">
                    <Trophy class="w-6 h-6" />
                  </div>
                  <span class="text-xs font-bold font-mono tracking-wider text-secondary bg-white/5 px-2.5 py-1 rounded-full uppercase">{{ $t(`system.${t.system}`) }}</span>
                </div>
                
                <h3 class="text-xl font-bold text-white mb-2 group-hover:text-primary transition-colors flex items-center justify-between">
                    {{ t.name }}
                    <div class="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button 
                            v-if="!isTrashView"
                            @click="handleDeleteTournament(t.id, $event)"
                            class="p-2 text-red-500 hover:bg-red-500/10 rounded-full transition-colors"
                        >
                            <Trash2 class="w-4 h-4" />
                        </button>
                        <button 
                            v-if="isTrashView"
                            @click="handleRestoreTournament(t.id, $event)"
                            class="p-2 text-green-500 hover:bg-green-500/10 rounded-full transition-colors"
                        >
                            <RotateCcw class="w-4 h-4" />
                        </button>
                    </div>
                </h3>
                
                <div class="flex items-center gap-4 text-sm text-secondary mt-4 pt-4 border-t border-border/50">
                   <div class="flex items-center gap-1.5">
                     <Calendar class="w-4 h-4" />
                     <span>{{ formatDate(t.createdAt) }}</span>
                   </div>
                   <div class="flex items-center gap-1.5">
                      <span class="w-2 h-2 rounded-full" :class="t.status === 'ONGOING' ? 'bg-green-500 animate-pulse' : 'bg-gray-500'"></span>
                      <span>R{{ t.currentRound }}</span>
                   </div>
                </div>
              </div>
              
              <!-- Create Independent Group Button -->
              <div 
                v-if="!isTrashView"
                @click="handleCreateGroup()" 
                class="border border-dashed border-border rounded-xl p-6 flex flex-col items-center justify-center cursor-pointer hover:bg-white/5 transition-colors group text-secondary hover:text-primary min-h-[200px]"
              >
                  <Plus class="w-12 h-12 mb-4 group-hover:scale-110 transition-transform" />
                  <span class="font-bold">{{ t('dashboard.createIndependent', 'Create Independent Group') }}</span>
              </div>
            </div>
        </div>
        
        <!-- Empty State (No events, no tournaments) -->
        <div v-if="!loading && events.length === 0 && orphanTournaments.length === 0 && !isTrashView" class="flex flex-col items-center justify-center py-20 border border-dashed border-border rounded-2xl bg-surface/30">
            <Layers class="w-16 h-16 text-border mb-4" />
            <h3 class="text-lg font-medium text-white">{{ t('dashboard.noEvents', 'No events found') }}</h3>
            <p class="text-secondary mb-6">{{ t('dashboard.getStartedEvent', 'Create an event to organize your tournament groups.') }}</p>
            <button @click="handleCreateEvent" class="bg-primary text-white px-6 py-3 rounded-xl font-bold hover:bg-primary/90 transition-all shadow-lg shadow-primary/20">
                {{ t('dashboard.createEvent', 'Create New Event') }}
            </button>
        </div>
    </div>
  </div>
</template>
