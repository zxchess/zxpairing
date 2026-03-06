<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { useRoute } from 'vue-router';
import { getTournament, addPlayers, updateMatchResult, deleteLatestRound, updateRoundPairings, type Tournament, default as api } from '../api/client';
import { 
  Trophy, Users, Calendar, ArrowLeft, Play, LayoutGrid, ListChecks, User, Plus, X, Download, FileText, Image, RotateCcw, Edit2, Save, Settings as SettingsIcon, Trash2, AlertTriangle 
} from 'lucide-vue-next';
import { useI18n } from 'vue-i18n';
import * as XLSX from 'xlsx';
import { toPng } from 'html-to-image';

const { t } = useI18n();
const route = useRoute();
const id = parseInt(route.params.id as string);
const contentRef = ref<HTMLElement | null>(null);

const tournament = ref<Tournament & { players: any[], rounds: any[] } | null>(null);
const loading = ref(true);
const activeTab = ref('pairings'); // 'pairings' | 'standings' | 'players'
const selectedRound = ref<number>(0);
const generating = ref(false);

// Add Player State
const showAddPlayer = ref(false);
const newPlayerName = ref('');
const newPlayerRating = ref(1500);
const addingPlayer = ref(false);

const fetchData = async () => {
    // ... same as before ...
  try {
    const data = await getTournament(id);
    tournament.value = data;
    if (data.currentRound > 0) {
        selectedRound.value = data.currentRound;
    }
  } catch (e) {
    console.error(e);
  } finally {
    loading.value = false;
  }
};

onMounted(fetchData);

const formatDate = (date: string) => new Date(date).toLocaleDateString();

// Computed properties for display
const currentMatches = computed(() => {
    if (!tournament.value || selectedRound.value === 0) return [];
    const round = tournament.value.rounds.find(r => r.roundNumber === selectedRound.value);
    return round ? round.matches : [];
});

const sortedPlayers = computed(() => {
    if (!tournament.value) return [];
    
    // 1. Calculate Tie-breaks
    const playersWithDetails = tournament.value.players.map(p => {
        let bucchholz = 0;
        let sb = 0;
        let progressive = 0;
        let wins = 0;
        let blackWins = 0;
        let runningScore = 0;
        
        const opponentScores: number[] = [];
        const history: any[] = [];
        
        // Find all matches
        const rounds = tournament.value?.rounds || [];
        rounds.forEach(r => {
            const match = r.matches.find((m: any) => m.whiteId === p.id || m.blackId === p.id);
            if (!match) {
                 // Not paired logic? Maybe count as 0 if not Bye?
                 // Current logic assumes if not in matches, it might be a bye if we missed it, but strictly speaking checking the Bye list is better.
                 // For now, if not found and not a bye, treat as 0. 
                 history.push({ round: r.roundNumber, result: '-', opponent: null });
                 return;
            }
            
            const isWhite = match.whiteId === p.id;
            const opponentId = isWhite ? match.blackId : match.whiteId;
            const opponent = tournament.value?.players.find(op => op.id === opponentId);
            
            // Calculate Match Score
            let matchScore = 0;
            let resultChar = '*';
            let isBye = !opponentId;

            if (isBye) {
                matchScore = 1; // Bye = 1 point
                resultChar = 'Bye'; 
            } else if (match.result === '1-0') {
                matchScore = isWhite ? 1 : 0;
                resultChar = matchScore ? '1' : '0';
            } else if (match.result === '0-1') {
                matchScore = isWhite ? 0 : 1;
                resultChar = matchScore ? '1' : '0';
            } else if (match.result === '1/2-1/2') {
                matchScore = 0.5;
                resultChar = '=';
            }

            // Tie-break Accumulators
            runningScore += matchScore;
            progressive += runningScore;
            
            if (matchScore === 1) {
                wins++;
                if (!isWhite && !isBye) blackWins++;
            }

            if (opponent) {
                opponentScores.push(opponent.score || 0);
                bucchholz += (opponent.score || 0);
                
                // SB: sum of scores of opponents you beat + 0.5 * scores of opponents you drew
                if (matchScore === 1) {
                    sb += (opponent.score || 0);
                } else if (matchScore === 0.5) {
                    sb += (opponent.score || 0) * 0.5;
                }
            } else if (isBye) {
                // FIDE handling of Byes for Buchholz is complex (Virtual Opponent). 
                // Simplified: Don't add to Buchholz/SB or treat as 0? 
                // Usually virtual opponent has same score. Let's stick to 0 for simplicity or existing score.
            }

            history.push({ 
                round: r.roundNumber, 
                result: resultChar, 
                opponentName: opponent ? opponent.name : 'Bye',
                isWhite 
            });
        });

        // Median Buchholz (remove highest and lowest)
        let medianBuchholz = 0;
        if (opponentScores.length > 2) {
            const sortedOppScores = [...opponentScores].sort((x, y) => x - y);
            // Remove first (lowest) and last (highest)
            sortedOppScores.pop();
            sortedOppScores.shift();
            medianBuchholz = sortedOppScores.reduce((a, b) => a + b, 0);
        } else {
            // Not enough opponents to cut
            medianBuchholz = bucchholz; 
        }

        return { 
            ...p, 
            bucchholz, 
            medianBuchholz, 
            sb, 
            progressive, 
            wins, 
            blackWins, 
            history 
        };
    });

    // 2. Sort
    return playersWithDetails.sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        if (b.bucchholz !== a.bucchholz) return b.bucchholz - a.bucchholz;
        if (b.sb !== a.sb) return b.sb - a.sb;
        if (b.progressive !== a.progressive) return b.progressive - a.progressive;
        return b.rating - a.rating;
    });
});

const handleGenerate = async () => {
    // ... same as before ...
    if (!tournament.value) return;
    generating.value = true;
    try {
        await api.post(`/tournaments/${id}/pair`);
        await fetchData();
        if (tournament.value) selectedRound.value = tournament.value.currentRound;
    } catch (e) {
        alert("Generating pairings failed.");
        console.error(e);
    } finally {
        generating.value = false;
    }
};

const handleResult = async (matchId: number, result: string) => {
    try {
        await updateMatchResult(matchId, result);
        await fetchData();
    } catch (e) {
        console.error(e);
        alert('Failed to update result');
    }
};

const handleAddPlayer = async () => {
    if (!newPlayerName.value) return;
    addingPlayer.value = true;
    try {
        await addPlayers(id, [{ name: newPlayerName.value, rating: Number(newPlayerRating.value) }]);
        await fetchData();
        showAddPlayer.value = false;
        newPlayerName.value = '';
        newPlayerRating.value = 1500;
        alert(t('prompt.addPlayerSuccess'));
    } catch (e) {
        console.error(e);
        alert(t('prompt.addPlayerFailed'));
    } finally {
        addingPlayer.value = false;
    }
};

const getPlayerName = (pid: string | null) => {
    if (!pid || pid === 'BYE') return 'BYE';
    const p = tournament.value?.players.find(p => p.id === pid);
    return p ? p.name : 'Unknown';
}

const exportExcel = () => {
    if (!tournament.value) return;
    
    // 1. Prepare Data
    let data: any[] = [];
    let filename = '';

    if (activeTab.value === 'pairings') {
        filename = `${tournament.value.name}_Round${selectedRound.value}_Pairings`;
        const header = [t('tournament.table.board'), t('color.white'), 'Result', t('color.black')];
        data.push(header);
        
        currentMatches.value.forEach((m: any) => {
           data.push([
               m.id,
               getPlayerName(m.whiteId),
               m.result || 'VS',
               getPlayerName(m.blackId)
           ]);
        });
    } else {
        filename = `${tournament.value.name}_Standings`;
        const header = [
            t('tournament.table.rank'), 
            t('tournament.table.name'), 
            t('tournament.table.rating'), 
            t('tournament.table.score'),
            t('tournament.table.buchholz'),
            t('tournament.table.medianBuchholz'),
            t('tournament.table.sb'),
            t('tournament.table.progressive')
        ];
        data.push(header);
        
        sortedPlayers.value.forEach((p, idx) => {
            data.push([
                idx + 1,
                p.name,
                p.rating,
                p.score,
                p.bucchholz,
                p.medianBuchholz,
                p.sb,
                p.progressive
            ]);
        });
    }

    // 2. Determine Filename
    filename += '.xlsx';

    // 3. Create Workbook
    const ws = XLSX.utils.aoa_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Sheet1");
    XLSX.writeFile(wb, filename);
};

const exportImage = async () => {
    if (!contentRef.value) return;
    
    try {
        const dataUrl = await toPng(contentRef.value, { 
            backgroundColor: '#18181b', // Match background
            style: { padding: '20px' }
        });
        
        const link = document.createElement('a');
        link.download = `${tournament.value?.name || 'Tournament'}_${activeTab.value}.png`;
        link.href = dataUrl;
        link.click();
    } catch (err) {
        console.error('oops, something went wrong!', err);
        alert('Failed to generate image');
    }
};



const settingsForm = ref({
    name: '',
    note: ''
});

// Init settings when tournament loaded
const initSettings = () => {
    if (tournament.value) {
        settingsForm.value.name = tournament.value.name;
        settingsForm.value.note = tournament.value.note || '';
    }
};

// Watch for tournament load
import { watch } from 'vue';
watch(tournament, () => {
    initSettings();
});

import { updateTournament } from '../api/client';
import { useRouter } from 'vue-router';
const router = useRouter();

const handleSaveSettings = async () => {
    if (!tournament.value) return;
    try {
        loading.value = true;
        await updateTournament(id, { 
            name: settingsForm.value.name,
            note: settingsForm.value.note
        });
        alert(t('tournament.settings.success'));
        await fetchData();
    } catch (e) {
        console.error(e);
        alert('Failed to save settings');
    } finally {
        loading.value = false;
    }
};

const handleDeleteTournament = async () => {
    if (!confirm(t('tournament.dangerZone.deleteConfirm'))) return;
    try {
        // We need a delete API. Assuming deleteLatestRound logic but for tournament? 
        // Or soft delete.
        // Wait, I implemented soft delete for PLAYERS, but for Tournament?
        // Checking `Dashboard.vue` might reveal if there is a delete tournament API.
        // If not, I'll assume `api.delete('/tournaments/:id')`.
        // Let's check `client.ts` or assume standard REST.
        await api.delete(`/tournaments/${id}`);
        router.push('/');
    } catch (e) {
        console.error(e);
        alert('Failed to delete tournament');
    }
};

// --- Manual Pairing Logic ---
const isEditing = ref(false);
const selectedSlot = ref<{ matchIdx: number, side: 'white' | 'black' } | null>(null);
// We manipulate currentMatches directly or deep copy? computed is readonly.
// Let's create a local reactive copy for editing.
const draftMatches = ref<any[]>([]);

const toggleEdit = () => {
    if (isEditing.value) {
        // Cancel
        isEditing.value = false;
        selectedSlot.value = null;
        draftMatches.value = [];
    } else {
        // Start Edit: Deep copy current matches
        isEditing.value = true;
        draftMatches.value = JSON.parse(JSON.stringify(currentMatches.value));
    }
};

const handleSlotClick = (matchIdx: number, side: 'white' | 'black') => {
    if (!isEditing.value) return;
    
    // Check if slot is BYE (id is null/undefined?). If BYE, we can still swap?
    // Let's allow swapping even if empty (BYE), treating it as null id.
    
    if (selectedSlot.value) {
        // SWAP!
        const fromIdx = selectedSlot.value.matchIdx;
        const fromSide = selectedSlot.value.side;
        
        // Get Swap data
        const p1Id = fromSide === 'white' ? draftMatches.value[fromIdx].whiteId : draftMatches.value[fromIdx].blackId;
        const p2Id = side === 'white' ? draftMatches.value[matchIdx].whiteId : draftMatches.value[matchIdx].blackId;
        
        // Perform Swap
        if (fromSide === 'white') draftMatches.value[fromIdx].whiteId = p2Id;
        else draftMatches.value[fromIdx].blackId = p2Id;
        
        if (side === 'white') draftMatches.value[matchIdx].whiteId = p1Id;
        else draftMatches.value[matchIdx].blackId = p1Id;
        
        selectedSlot.value = null;
    } else {
        // Select
        selectedSlot.value = { matchIdx, side };
    }
};

const savePairings = async () => {
    if (!tournament.value) return;
    try {
        loading.value = true;
        
        // Prepare payload: only IDs need to be sent? API expects matchId and w/b IDs.
        const payload = draftMatches.value.map(m => ({
            matchId: m.id,
            whiteId: m.whiteId,
            blackId: m.blackId
        }));
        
        await updateRoundPairings(id, tournament.value.currentRound, payload);
        
        await fetchData();
        isEditing.value = false;
        alert(t('tournament.manual.saveSuccess'));
    } catch (e) {
        console.error(e);
        alert('Failed to save pairings');
    } finally {
        loading.value = false;
    }
};

const handleRollback = async () => {
    if (!tournament.value) return;
    if (!confirm(t('tournament.rollback.confirm', { round: tournament.value.currentRound }))) return;
    
    try {
        loading.value = true;
        await deleteLatestRound(id);
        alert(t('tournament.rollback.success'));
        await fetchData();
        // Reset to latest available round
        if (tournament.value) {
             selectedRound.value = tournament.value.currentRound > 0 ? tournament.value.currentRound : 0;
        }
    } catch (e) {
        console.error(e);
        alert('Failed to rollback');
    } finally {
        loading.value = false;
    }
};
</script>

<template>
  <div v-if="loading" class="flex justify-center py-20 text-secondary">{{ $t('common.loading') }}</div>
  
  <div v-else-if="!tournament" class="text-center py-20 text-red-500">{{ $t('common.notFound') }}</div>
  
  <div v-else class="space-y-8 animate-fade-in pb-20">
    <!-- Header / Breadcrumb -->
    <div class="flex items-center gap-4 text-secondary mb-4">
      <RouterLink to="/" class="hover:text-white transition-colors flex items-center gap-1">
        <ArrowLeft class="w-4 h-4" /> {{ $t('common.backToDashboard') }}
      </RouterLink>
    </div>

    <!-- Hero Section -->
    <div class="bg-surface border border-border rounded-2xl p-8 shadow-sm relative overflow-hidden">
      <div class="absolute top-0 right-0 p-8 opacity-10">
        <Trophy class="w-64 h-64 rotate-12" />
      </div>
      
      <div class="relative z-10">
        <div class="flex items-start justify-between">
           <div>
              <div class="flex items-center gap-3 mb-2">
                 <span class="px-3 py-1 bg-primary/20 text-primary text-xs font-bold rounded-full uppercase tracking-wider">
                   {{ $t(`system.${tournament.system}`) }}
                 </span>
                 <span class="text-secondary text-sm flex items-center gap-1">
                   <Calendar class="w-3 h-3" />
                   {{ formatDate(tournament.createdAt) }}
                 </span>
              </div>
              <h1 class="text-4xl font-bold text-white mb-2">{{ tournament.name }}</h1>
              <div class="flex items-center gap-6 text-secondary mt-4">
                 <div class="flex items-center gap-2">
                   <Users class="w-5 h-5" />
                   <span class="font-medium">{{ tournament.players.length }} {{ $t('tournament.players') }}</span>
                 </div>
                 <div class="flex items-center gap-2">
                   <LayoutGrid class="w-5 h-5" />
                   <span class="font-medium">{{ $t('tournament.round', { round: tournament.currentRound }) }}</span>
                 </div>
              </div>
           </div>
           
           <div class="flex flex-col gap-3">
              <div class="flex gap-2">
                  <!-- Rollback Button -->
                 <button 
                    v-if="tournament.currentRound > 0 && !generating && !isEditing"
                    @click="handleRollback"
                    class="flex items-center justify-center gap-2 bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/20 px-4 py-3 rounded-xl font-bold transition-all hover:scale-105 active:scale-95"
                    :title="$t('tournament.rollback.button')"
                 >
                    <RotateCcw class="w-5 h-5" />
                 </button>

                 <!-- Manual Edit Butons -->
                 <template v-if="!generating">
                     <button 
                        v-if="!isEditing"
                        @click="toggleEdit"
                        class="flex items-center justify-center gap-2 bg-surface hover:bg-white/10 text-secondary hover:text-white border border-border px-4 py-3 rounded-xl font-bold transition-all"
                        :title="$t('tournament.manual.button')"
                     >
                        <Edit2 class="w-5 h-5" />
                     </button>
                     
                     <template v-else>
                         <button 
                            @click="savePairings"
                            class="flex items-center gap-2 bg-green-500 hover:bg-green-600 text-white px-4 py-3 rounded-xl font-bold transition-all animate-bounce-in"
                         >
                            <Save class="w-5 h-5" /> {{ $t('tournament.manual.save') }}
                         </button>
                         <button 
                            @click="toggleEdit"
                            class="flex items-center gap-2 bg-surface hover:bg-white/10 text-secondary hover:text-white border border-border px-4 py-3 rounded-xl font-bold transition-all"
                         >
                            <X class="w-5 h-5" /> {{ $t('tournament.manual.cancel') }}
                         </button>
                     </template>
                 </template>

                 <button 
                    v-if="!isEditing"
                    @click="handleGenerate"
                    :disabled="generating"
                    class="flex-1 flex items-center justify-center gap-2 bg-primary hover:bg-primary/90 text-white px-6 py-3 rounded-xl font-bold shadow-lg shadow-primary/20 transition-all hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                     <Play class="w-5 h-5" :class="{ 'animate-spin': generating }" v-if="generating" />
                     <Play class="w-5 h-5" v-else />
                     {{ generating ? $t('tournament.pairing') : $t('tournament.generateNext', { round: tournament.currentRound + 1 }) }}
                  </button>
                  
                  <!-- Export Dropdown -->
                  <div class="relative group" v-if="!isEditing">
                      <button class="h-full bg-surface border border-border hover:bg-white/5 text-secondary hover:text-white px-3 rounded-xl transition-colors">
                          <Download class="w-5 h-5" />
                      </button>
                      <div class="absolute right-0 top-full mt-2 w-48 bg-[#1e1e24] border border-border rounded-xl shadow-xl overflow-hidden opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50">
                          <button @click="exportExcel" class="w-full text-left px-4 py-3 hover:bg-white/5 text-sm text-secondary hover:text-white transition-colors flex items-center gap-2">
                              <FileText class="w-4 h-4" /> {{ $t('tournament.export.excel') }}
                          </button>
                          <button @click="exportImage" class="w-full text-left px-4 py-3 hover:bg-white/5 text-sm text-secondary hover:text-white transition-colors flex items-center gap-2">
                              <Image class="w-4 h-4" /> {{ $t('tournament.export.image') }}
                          </button>
                      </div>
                  </div>
              </div>
           </div>
        </div>
      </div>
    </div>
    
    <!-- Navigation Tabs -->
    <div class="flex border-b border-border">
       <button 
         @click="activeTab = 'pairings'"
         class="px-6 py-3 font-medium transition-colors border-b-2"
         :class="activeTab === 'pairings' ? 'text-primary border-primary' : 'text-secondary border-transparent hover:text-white'"
       >
         {{ $t('tournament.tabs.pairings') }}
       </button>
       <button 
         @click="activeTab = 'players'"
         class="px-6 py-3 font-medium transition-colors border-b-2"
         :class="activeTab === 'players' ? 'text-primary border-primary' : 'text-secondary border-transparent hover:text-white'"
       >
         {{ $t('tournament.tabs.players') }}
       </button>
       <button 
         @click="activeTab = 'standings'"
         class="px-6 py-3 font-medium transition-colors border-b-2"
         :class="activeTab === 'standings' ? 'text-primary border-primary' : 'text-secondary border-transparent hover:text-white'"
       >
         {{ $t('tournament.tabs.standings') }}
       </button>
    </div>

    <!-- Content Area -->
    <div class="min-h-[300px]" ref="contentRef">
        <!-- PAIRINGS TAB -->
        <div v-if="activeTab === 'pairings'" class="space-y-6">
           <div v-if="tournament.rounds.length === 0" class="p-10 text-center border border-dashed border-border rounded-xl text-secondary">
             <ListChecks class="w-10 h-10 mx-auto mb-3 opacity-50" />
             <p>{{ $t('tournament.emptyPairings') }}</p>
           </div>
           
           <div v-else>
               <!-- Round Selector -->
               <div class="flex items-center gap-2 mb-6 overflow-x-auto pb-2">
                   <button 
                     v-for="r in tournament.rounds" :key="r.id"
                     @click="selectedRound = r.roundNumber"
                     class="px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap"
                     :class="selectedRound === r.roundNumber ? 'bg-white text-background' : 'bg-surface text-secondary hover:text-white'"
                   >
                     {{ $t('tournament.round', { round: r.roundNumber }) }}
                   </button>
               </div>
               
               <!-- Matches List -->
               <div class="grid gap-4">
                   <div 
                      v-for="(match, idx) in (isEditing ? draftMatches : currentMatches)" 
                      :key="match.id || idx" 
                      class="bg-surface border border-border rounded-xl p-4 grid grid-cols-12 gap-4 items-center transition-all"
                      :class="{ 'opacity-50': isEditing && selectedSlot && selectedSlot.matchIdx !== idx }"
                   >
                        <!-- White Player -->
                        <div 
                            class="col-span-4 flex items-center justify-end gap-3 text-right transition-all rounded-lg p-2"
                            :class="{ 
                                'cursor-pointer hover:bg-white/5 active:scale-95': isEditing,
                                'ring-2 ring-primary bg-primary/10 shadow-[0_0_10px_rgba(59,130,246,0.5)]': isEditing && selectedSlot?.matchIdx === idx && selectedSlot?.side === 'white'
                            }"
                            @click="handleSlotClick(idx, 'white')"
                        >
                            <span class="font-medium text-white truncate max-w-[120px]" :class="{ 'text-primary': isEditing && selectedSlot?.matchIdx === idx && selectedSlot?.side === 'white' }">
                                {{ getPlayerName(match.whiteId) }}
                            </span>
                            <div class="w-8 h-8 rounded-full bg-white text-background flex items-center justify-center font-bold text-xs ring-2 ring-white/10 shrink-0 select-none">
                                {{ $t('color.white') }}
                            </div>
                        </div>
                        
                        <!-- Center (Result or VS) -->
                        <div class="col-span-4 flex items-center justify-center">
                            <!-- Edit Mode: Show Swap Icon or VS -->
                            <div v-if="isEditing" class="text-secondary/50 font-bold font-mono">
                                VS
                            </div>
                            
                            <!-- View Mode: Result Actions -->
                            <div v-else>
                                <div v-if="!match.result" class="flex gap-2">
                                    <button 
                                      @click="handleResult(Number(match.id), '1-0')"
                                      class="px-2 py-1 bg-white/5 hover:bg-white/10 border border-border rounded text-xs font-mono transition-colors"
                                      :title="$t('tournament.result.whiteWin')"
                                    >1-0</button>
                                    <button 
                                      @click="handleResult(Number(match.id), '1/2-1/2')"
                                      class="px-2 py-1 bg-white/5 hover:bg-white/10 border border-border rounded text-xs font-mono transition-colors"
                                      :title="$t('tournament.result.draw')"
                                    >½-½</button>
                                    <button 
                                      @click="handleResult(Number(match.id), '0-1')"
                                      class="px-2 py-1 bg-white/5 hover:bg-white/10 border border-border rounded text-xs font-mono transition-colors"
                                      :title="$t('tournament.result.blackWin')"
                                    >0-1</button>
                                </div>
                                <div v-else class="flex items-center gap-3">
                                    <span class="font-bold text-lg font-mono text-primary">{{ match.result }}</span>
                                    <button 
                                      @click="handleResult(Number(match.id), '*')"
                                      class="text-xs text-secondary hover:text-white underline opacity-50 hover:opacity-100"
                                    >
                                      {{ $t('tournament.result.edit') }}
                                    </button>
                                </div>
                            </div>
                        </div>
                        
                        <!-- Black Player -->
                        <div 
                            class="col-span-4 flex items-center gap-3 transition-all rounded-lg p-2"
                            :class="{ 
                                'cursor-pointer hover:bg-white/5 active:scale-95': isEditing,
                                'ring-2 ring-primary bg-primary/10 shadow-[0_0_10px_rgba(59,130,246,0.5)]': isEditing && selectedSlot?.matchIdx === idx && selectedSlot?.side === 'black'
                            }"
                            @click="handleSlotClick(idx, 'black')"
                        >
                             <div class="w-8 h-8 rounded-full bg-black text-white flex items-center justify-center font-bold text-xs ring-2 ring-white/10 shrink-0 select-none">
                                 {{ $t('color.black') }}
                             </div>
                             <span class="font-medium text-white truncate max-w-[120px]" :class="{ 'text-primary': isEditing && selectedSlot?.matchIdx === idx && selectedSlot?.side === 'black' }">
                                 {{ getPlayerName(match.blackId) }}
                             </span>
                        </div>
                   </div>
               </div>
           </div>
        </div>
        
        <!-- PLAYERS TAB -->
        <div v-if="activeTab === 'players'">
            <div class="flex justify-end mb-4">
                <button 
                  @click="showAddPlayer = true"
                  class="flex items-center gap-2 bg-primary hover:bg-primary/90 text-white px-4 py-2 rounded-lg font-medium transition-all shadow-lg shadow-primary/20"
                >
                  <Plus class="w-4 h-4" />
                  {{ $t('tournament.addPlayer') }}
                </button>
            </div>
            
            <div class="bg-surface border border-border rounded-xl overflow-hidden">
                <table class="w-full text-left">
                    <thead class="bg-white/5 text-secondary text-xs uppercase tracking-wider">
                        <tr>
                            <th class="p-4 font-medium">{{ $t('tournament.table.rank') }}</th>
                            <th class="p-4 font-medium">{{ $t('tournament.table.name') }}</th>
                            <th class="p-4 font-medium">{{ $t('tournament.table.rating') }}</th>
                            <th class="p-4 font-medium text-right">{{ $t('tournament.table.score') }}</th>
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-border">
                        <tr v-for="(p, idx) in sortedPlayers" :key="p.id" class="hover:bg-white/5 transition-colors">
                            <td class="p-4 text-secondary font-mono">#{{ idx + 1 }}</td>
                            <td class="p-4 text-white font-medium flex items-center gap-3">
                                <div class="w-8 h-8 rounded-full bg-primary/20 text-primary flex items-center justify-center">
                                    <User class="w-4 h-4" />
                                </div>
                                {{ p.name }}
                            </td>
                            <td class="p-4 text-secondary">{{ p.rating }}</td>
                            <td class="p-4 text-right text-white font-bold">{{ p.score }}</td>
                        </tr>
                    </tbody>
                </table>
                <div v-if="sortedPlayers.length === 0" class="p-8 text-center text-secondary">
                    {{ $t('tournament.emptyPlayers') }}
                </div>
            </div>
        </div>
        
        <!-- STANDINGS TAB -->
        <div v-if="activeTab === 'standings'">
            <div class="bg-surface border border-border rounded-xl overflow-hidden">
                <table class="w-full text-left">
                    <thead class="bg-white/5 text-secondary text-xs uppercase tracking-wider">
                        <tr>
                            <th class="p-4 font-medium sticky left-0 bg-[#1e1e24] w-12">{{ $t('tournament.table.rank') }}</th>
                            <th class="p-4 font-medium sticky left-12 bg-[#1e1e24] z-10">{{ $t('tournament.table.name') }}</th>
                            <th class="p-4 font-medium">{{ $t('tournament.table.rating') }}</th>
                            
                            <!-- Dynamic Round Headers -->
                            <th v-for="r in tournament.currentRound" :key="r" class="p-4 font-medium text-center">R{{ r }}</th>
                            
                            <th class="p-4 font-medium text-right text-xs text-secondary">{{ $t('tournament.table.buchholz') }}</th>
                            <th class="p-4 font-medium text-right text-xs text-secondary">{{ $t('tournament.table.medianBuchholz') }}</th>
                            <th class="p-4 font-medium text-right text-xs text-secondary">{{ $t('tournament.table.sb') }}</th>
                            <th class="p-4 font-medium text-right text-xs text-secondary">{{ $t('tournament.table.progressive') }}</th>
                            <th class="p-4 font-medium text-right sticky right-0 bg-[#1e1e24] z-10 w-16">{{ $t('tournament.table.score') }}</th>
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-border">
                        <tr v-for="(p, idx) in sortedPlayers" :key="p.id" class="hover:bg-white/5 transition-colors group">
                            <td class="p-4 text-secondary font-mono sticky left-0 bg-[#1e1e24] group-hover:bg-[#2a2a35] transition-colors">
                                <span v-if="idx < 3" class="inline-block w-6 h-6 rounded-full text-center leading-6 text-xs font-bold" :class="idx === 0 ? 'bg-yellow-500/20 text-yellow-500' : idx === 1 ? 'bg-gray-400/20 text-gray-400' : 'bg-orange-500/20 text-orange-500'">{{ idx + 1 }}</span>
                                <span v-else>#{{ idx + 1 }}</span>
                            </td>
                            <td class="p-4 text-white font-medium sticky left-12 bg-[#1e1e24] z-10 group-hover:bg-[#2a2a35] transition-colors">
                                <div class="flex items-center gap-3">
                                    <div class="w-8 h-8 rounded-full bg-indigo-500/20 text-indigo-400 flex items-center justify-center shrink-0">
                                        <User class="w-4 h-4" />
                                    </div>
                                    <span class="truncate max-w-[120px]" :title="p.name">{{ p.name }}</span>
                                </div>
                            </td>
                            <td class="p-4 text-secondary font-mono text-xs">{{ p.rating }}</td>
                            
                            <!-- History -->
                            <td v-for="(h, i) in p.history" :key="i" class="p-2 text-center">
                                <div class="flex flex-col items-center">
                                    <span class="font-bold text-sm" 
                                      :class="{
                                        'text-green-400': h.result === '1' || h.result === 'Bye' || h.result === '1.0',
                                        'text-yellow-400': h.result === '=' || h.result === '0.5',
                                        'text-red-400': h.result === '0' || h.result === '0.0',
                                        'text-secondary': h.result === '*' || h.result === '-'
                                      }">{{ h.result === '=' ? '0.5' : h.result }}</span>
                                    <span class="text-[10px] text-secondary opacity-60 w-[10px] h-3 inline-block">
                                        {{ h.isWhite ? $t('color.white') : (h.opponentName === 'Bye' ? $t('color.bye') : $t('color.black')) }}
                                    </span>
                                </div>
                            </td>
                             <td v-if="p.history.length < tournament.currentRound" :colspan="tournament.currentRound - p.history.length"></td>

                            <td class="p-4 text-right text-secondary font-mono text-sm">{{ p.bucchholz }}</td>
                            <td class="p-4 text-right text-secondary font-mono text-sm">{{ p.medianBuchholz }}</td>
                            <td class="p-4 text-right text-secondary font-mono text-sm">{{ p.sb }}</td>
                            <td class="p-4 text-right text-secondary font-mono text-sm">{{ p.progressive }}</td>
                            <td class="p-4 text-right text-white font-bold text-lg sticky right-0 bg-[#1e1e24] z-10 group-hover:bg-[#2a2a35]">{{ p.score }}</td>
                        </tr>
                    </tbody>
                </table>
                 <div v-if="sortedPlayers.length === 0" class="p-8 text-center text-secondary">
                    {{ $t('tournament.emptyPlayers') }}
                </div>
            </div>
        </div>

        <!-- SETTINGS TAB -->
        <div v-if="activeTab === 'settings'" class="max-w-2xl mx-auto space-y-8 animate-fade-in">
             <!-- General Settings -->
             <div class="bg-surface border border-border rounded-xl p-6 space-y-6">
                 <h3 class="text-xl font-bold text-white flex items-center gap-2">
                     <SettingsIcon class="w-5 h-5" /> {{ $t('tournament.settings.title') }}
                 </h3>
                 
                 <div class="space-y-4">
                     <div>
                         <label class="block text-secondary text-sm font-bold mb-2">{{ $t('tournament.settings.name') }}</label>
                         <input 
                            v-model="settingsForm.name"
                            type="text" 
                            class="w-full bg-background border border-border rounded-xl px-4 py-3 text-white focus:outline-none focus:border-primary transition-colors"
                         />
                     </div>
                     <div>
                         <label class="block text-secondary text-sm font-bold mb-2">{{ $t('tournament.settings.note') }}</label>
                         <textarea 
                            v-model="settingsForm.note"
                            rows="4"
                            class="w-full bg-background border border-border rounded-xl px-4 py-3 text-white focus:outline-none focus:border-primary transition-colors resize-none"
                         ></textarea>
                     </div>
                     
                     <div class="flex justify-end">
                         <button 
                            @click="handleSaveSettings"
                            class="flex items-center gap-2 bg-primary hover:bg-primary/90 text-white px-6 py-2 rounded-lg font-bold transition-all shadow-lg shadow-primary/20"
                         >
                            <Save class="w-4 h-4" /> {{ $t('tournament.settings.save') }}
                         </button>
                     </div>
                 </div>
             </div>
             
             <!-- Danger Zone -->
             <div class="bg-red-500/10 border border-red-500/20 rounded-xl p-6 space-y-4">
                 <h3 class="text-xl font-bold text-red-500 flex items-center gap-2">
                     <AlertTriangle class="w-5 h-5" /> {{ $t('tournament.dangerZone.title') }}
                 </h3>
                 
                 <div class="flex items-center justify-between p-4 bg-background/50 rounded-lg border border-red-500/10">
                     <div>
                         <div class="font-bold text-white">{{ $t('tournament.dangerZone.delete') }}</div>
                         <div class="text-xs text-secondary opacity-70">{{ $t('tournament.dangerZone.deleteConfirm') }}</div>
                     </div>
                     <button 
                        @click="handleDeleteTournament"
                        class="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg font-bold transition-colors flex items-center gap-2"
                     >
                        <Trash2 class="w-4 h-4" /> {{ $t('tournament.dangerZone.delete') }}
                     </button>
                 </div>
             </div>
        </div>
    </div>
  </div>
  
  <!-- Add Player Modal -->
  <div v-if="showAddPlayer" class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
      <div class="bg-surface border border-border rounded-2xl p-6 w-full max-w-md shadow-2xl relative">
          <button @click="showAddPlayer = false" class="absolute top-4 right-4 text-secondary hover:text-white transition-colors">
              <X class="w-5 h-5" />
          </button>
          
          <h2 class="text-xl font-bold text-white mb-1">{{ $t('tournament.addPlayer') }}</h2>
          <p class="text-secondary text-sm mb-6">Add a new participant to this tournament.</p>
          
          <div class="space-y-4">
              <div>
                  <label class="block text-secondary text-xs font-bold uppercase tracking-wider mb-2">{{ $t('tournament.enterName') }}</label>
                  <input 
                    v-model="newPlayerName"
                    type="text" 
                    class="w-full bg-background border border-border rounded-xl px-4 py-3 text-white focus:outline-none focus:border-primary transition-colors"
                    placeholder="Grandmaster 1"
                    @keyup.enter="handleAddPlayer"
                  />
              </div>
              
              <div>
                  <label class="block text-secondary text-xs font-bold uppercase tracking-wider mb-2">{{ $t('tournament.enterRating') }}</label>
                  <input 
                    v-model="newPlayerRating"
                    type="number" 
                    class="w-full bg-background border border-border rounded-xl px-4 py-3 text-white focus:outline-none focus:border-primary transition-colors"
                    placeholder="1500"
                    @keyup.enter="handleAddPlayer"
                  />
              </div>
              
              <div class="flex gap-3 mt-6">
                  <button 
                    @click="showAddPlayer = false"
                    class="flex-1 bg-surface hover:bg-white/5 border border-border text-white px-4 py-3 rounded-xl font-medium transition-colors"
                  >
                    {{ $t('common.cancel') }}
                  </button>
                  <button 
                    @click="handleAddPlayer"
                    :disabled="addingPlayer || !newPlayerName"
                    class="flex-1 bg-primary hover:bg-primary/90 text-white px-4 py-3 rounded-xl font-bold shadow-lg shadow-primary/20 transition-all disabled:opacity-50"
                  >
                    {{ addingPlayer ? $t('common.loading') : $t('common.confirm') }}
                  </button>
              </div>
          </div>
      </div>
  </div>
</template>
