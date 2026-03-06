import axios from 'axios';

const api = axios.create({
    baseURL: 'http://localhost:3001/api',
    timeout: 10000,
});

export interface TournamentEvent {
    id: number;
    name: string;
    location?: string;
    startDate: string;
    tournaments?: Tournament[];
}

export interface Tournament {
    id: number;
    name: string;
    eventId?: number;
    note?: string;
    system: 'swiss' | 'round_robin';
    status: string;
    currentRound: number;
    createdAt: string;
}

export const fetchEvents = async (): Promise<TournamentEvent[]> => {
    const res = await api.get('/events');
    return res.data;
};

export const createEvent = async (name: string, location?: string, startDate?: string) => {
    const res = await api.post('/events', { name, location, startDate });
    return res.data;
};

export const deleteEvent = async (id: number) => {
    const res = await api.delete(`/events/${id}`);
    return res.data;
};

export const fetchTournaments = async (): Promise<Tournament[]> => {
    const res = await api.get('/tournaments');
    return res.data;
};

export const createTournament = async (name: string, system: 'swiss' | 'round_robin', eventId?: number) => {
    const res = await api.post('/tournaments', { name, system, eventId });
    return res.data;
};

export const getTournament = async (id: number) => {
    const res = await api.get(`/tournaments/${id}`);
    return res.data;
};

export const fetchTrash = async (): Promise<Tournament[]> => {
    const res = await api.get('/tournaments/trash');
    return res.data;
};

export const deleteTournament = async (id: number) => {
    const res = await api.delete(`/tournaments/${id}`);
    return res.data;
};

export const restoreTournament = async (id: number) => {
    const res = await api.post(`/tournaments/${id}/restore`);
    return res.data;
};

export const permanentDeleteTournament = async (id: number) => {
    const res = await api.delete(`/tournaments/${id}/permanent`);
    return res.data;
};

export const addPlayers = async (tournamentId: number, players: { name: string; rating: number }[]) => {
    const res = await api.post(`/tournaments/${tournamentId}/players`, { players });
    return res.data;
};

export const updateMatchResult = async (matchId: number, result: string) => {
    const res = await api.put(`/matches/${matchId}`, { result });
    return res.data;
};

// Rollback round
export const deleteLatestRound = async (id: number) => {
    const res = await api.delete(`/tournaments/${id}/rounds/latest`);
    return res.data;
};

// Update tournament settings
export const updateTournament = async (id: number, data: { name?: string; note?: string; status?: string }) => {
    const res = await api.put(`/tournaments/${id}`, data);
    return res.data;
};

// Update round pairings
export const updateRoundPairings = async (tournamentId: number, roundNumber: number, pairings: any[]) => {
    const res = await api.put(`/tournaments/${tournamentId}/rounds/${roundNumber}/pairings`, { pairings });
    return res.data;
};

export default api;
