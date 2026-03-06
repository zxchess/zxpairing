import Fastify from 'fastify';
import cors from '@fastify/cors';
import axios from 'axios';
import { z } from 'zod';
import { serializerCompiler, validatorCompiler, ZodTypeProvider } from 'fastify-type-provider-zod';
import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

dotenv.config();

const server = Fastify({
    logger: true,
}).withTypeProvider<ZodTypeProvider>();

server.setValidatorCompiler(validatorCompiler);
server.setSerializerCompiler(serializerCompiler);

// 配置 CORS
await server.register(cors, {
    origin: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
});

const ENGINE_URL = process.env.ENGINE_URL || 'http://127.0.0.1:8000';

// 健康检查
server.get('/health', async () => {
    return { status: 'ok', engine: ENGINE_URL };
});

// --- Event Routes ---

// Get all events
server.get('/api/events', async (request, reply) => {
    const events = await prisma.event.findMany({
        where: { deletedAt: null },
        include: { tournaments: { where: { deletedAt: null } } },
        orderBy: { createdAt: 'desc' }
    });
    return events;
});

// Get single event
server.get('/api/events/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const event = await prisma.event.findUnique({
        where: { id: parseInt(id) },
        include: { tournaments: { where: { deletedAt: null } } }
    });
    if (!event) return reply.status(404).send({ error: 'Event not found' });
    return event;
});

// Create event
server.post('/api/events', {
    schema: {
        body: z.object({
            name: z.string(),
            location: z.string().optional(),
            startDate: z.string().optional(),
        }),
    },
}, async (request, reply) => {
    const { name, location, startDate } = request.body;
    try {
        const event = await prisma.event.create({
            data: {
                name,
                location,
                startDate: startDate ? new Date(startDate) : undefined,
            }
        });
        return event;
    } catch (e) {
        return reply.status(500).send({ error: 'Failed to create event' });
    }
});

// Delete event (Soft delete)
server.delete('/api/events/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    try {
        await prisma.event.update({
            where: { id: parseInt(id) },
            data: { deletedAt: new Date() }
        });
        // Soft-delete children
        await prisma.tournament.updateMany({
            where: { eventId: parseInt(id) },
            data: { deletedAt: new Date() }
        });
        return { success: true };
    } catch (e) {
        return reply.status(500).send({ error: 'Failed to delete event' });
    }
});

// 对阵代理接口 (转发给 Python 引擎)
// 0. 获取赛事列表
server.get('/api/tournaments', async (request, reply) => {
    const tournaments = await prisma.tournament.findMany({
        where: { deletedAt: null },
        orderBy: { createdAt: 'desc' },
        include: { _count: { select: { players: true } } }
    });
    return tournaments;
});

// 0.1 获取回收站列表
server.get('/api/tournaments/trash', async (request, reply) => {
    const tournaments = await prisma.tournament.findMany({
        where: { deletedAt: { not: null } },
        orderBy: { deletedAt: 'desc' },
        include: { _count: { select: { players: true } } }
    });
    return tournaments;
});

// 1. 创建赛事
server.post('/api/tournaments', {
    schema: {
        body: z.object({
            name: z.string(),
            system: z.enum(['swiss', 'round_robin']),
            eventId: z.number().optional(),
        }),
    },
}, async (request, reply) => {
    const { name, system, eventId } = request.body;
    const tournament = await prisma.tournament.create({
        data: { name, system, status: 'PENDING', eventId },
    });
    return tournament;
});

// 2. 获取赛事详情
// 2. 获取赛事详情 (Check if deleted?? for now allow viewing but maybe warn)
server.get('/api/tournaments/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const tournament = await prisma.tournament.findUnique({
        where: { id: parseInt(id) },
        include: { players: true, rounds: { include: { matches: true } } },
    });
    // If deleted, maybe 404 or specific status?
    if (!tournament) return reply.status(404).send({ error: 'Tournament not found' });
    return tournament;
});

// 2.1 软删除赛事
server.delete('/api/tournaments/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    try {
        const tournament = await prisma.tournament.update({
            where: { id: parseInt(id) },
            data: { deletedAt: new Date() }
        });
        return tournament;
    } catch (e) {
        console.error(`[API] Delete failed:`, e);
        return reply.status(500).send(e);
    }
});

// 2.2 恢复赛事
server.post('/api/tournaments/:id/restore', async (request, reply) => {
    const { id } = request.params as { id: string };
    try {
        const tournament = await prisma.tournament.update({
            where: { id: parseInt(id) },
            data: { deletedAt: null }
        });
        return tournament;
    } catch (e) {
        console.error(`[API] Restore failed:`, e);
        return reply.status(500).send(e);
    }
});

// 2.3 永久删除 (Optional, for cleaning trash)
server.delete('/api/tournaments/:id/permanent', async (request, reply) => {
    const { id } = request.params as { id: string };
    await prisma.tournament.delete({
        where: { id: parseInt(id) }
    });
    return { success: true };
});

// 3. 批量添加选手
server.post('/api/tournaments/:id/players', {
    schema: {
        body: z.object({
            players: z.array(z.object({
                name: z.string(),
                rating: z.number().optional().default(0),
            })),
        }),
    },
}, async (request, reply) => {
    const { id } = request.params as { id: string };
    // Check if tournament exists
    const tournament = await prisma.tournament.findUnique({ where: { id: parseInt(id) } });
    if (!tournament) return reply.status(404).send({ error: 'Tournament not found' });

    // Transaction to add players
    const createdPlayers = await prisma.$transaction(
        request.body.players.map(p => prisma.player.create({
            data: {
                name: p.name,
                rating: p.rating,
                tournamentId: parseInt(id),
            }
        }))
    );
    return createdPlayers;
});

// Update tournament (settings)
server.put<{ Params: { id: string }, Body: { name?: string; note?: string; status?: string } }>('/api/tournaments/:id', async (request, reply) => {
    const { id } = request.params;
    const { name, note, status } = request.body;

    try {
        const updated = await prisma.tournament.update({
            where: { id: parseInt(id) },
            data: {
                ...(name && { name }),
                ...(note !== undefined && { note: note as string | null }),
                ...(status && { status })
            }
        });
        return updated;
    } catch (error) {
        server.log.error(error);
        return reply.status(500).send({ error: 'Failed to update tournament' });
    }
});

// 4. 生成下一轮对阵 (Core Logic)
server.post('/api/tournaments/:id/pair', async (request, reply) => {
    const { id } = request.params as { id: string };
    const tournament = await prisma.tournament.findUnique({
        where: { id: parseInt(id) },
        include: { players: true }
    });

    if (!tournament) return reply.status(404).send({ error: 'Tournament not found' });

    // 1. Prepare data for Python Engine
    const playersForEngine = await Promise.all(tournament.players.map(async (p) => {
        // Determine history from DB matches
        const matches = await prisma.match.findMany({
            where: {
                OR: [{ whiteId: p.id }, { blackId: p.id }],
                result: { not: null } // Only completed matches
            }
        });

        const history = matches.map(m => {
            const isWhite = m.whiteId === p.id;
            const opponentId = isWhite ? m.blackId : m.whiteId;

            // Calculate float score
            let score = 0.0;
            if (m.result === '1-0') score = isWhite ? 1.0 : 0.0;
            else if (m.result === '0-1') score = isWhite ? 0.0 : 1.0;
            else if (m.result === '1/2-1/2') score = 0.5;

            return {
                opponent: opponentId || "BYE", // 'BYE' string for engine
                color: isWhite ? "W" : "B",
                result: score
            };
        });

        return {
            id: p.id,
            name: p.name,
            rating: p.rating,
            score: p.score, // Cached score, usually engine relies on history to re-calculate pairs, but standard input requires score.
            // Ideally we should sync p.score with history sum
            history: history,
            rank: p.rank
        };
    }));

    // Re-calculate score from history to be safe? 
    // For now trust DB cached score or simply sum history result?
    // Engine might use input score for basic sorting.
    playersForEngine.forEach(p => {
        p.score = p.history.reduce((acc, h) => acc + h.result, 0.0);
    });

    const nextRoundNum = tournament.currentRound + 1;
    const sys = tournament.system as 'swiss' | 'round_robin';

    try {
        const payload = {
            system: sys,
            round_num: nextRoundNum,
            players: playersForEngine
        };

        const response = await axios.post(`${ENGINE_URL}/pair`, payload);
        const pairingData = response.data; // List of responses

        // Find the requested round
        const targetRoundData = pairingData.find((r: any) => r.round === nextRoundNum);

        if (!targetRoundData) {
            // If Round Robin returns all rounds, but we asked for specifically nextRoundNum?
            // Engine interface says if we pass round_num > 0 for RR, it returns singular list.
            // Let's assume engine works as verified.
            return reply.status(500).send({ error: 'Engine did not return pairings for this round', engineResponse: pairingData });
        }

        const pairings = targetRoundData.pairings; // [{white: pid, black: pid}, ...]

        // 3. Save to DB
        const round = await prisma.round.create({
            data: {
                roundNumber: nextRoundNum,
                tournamentId: parseInt(id),
            }
        });

        // Create matches
        await prisma.$transaction(pairings.map((p: any) => prisma.match.create({
            data: {
                roundId: round.id,
                whiteId: p.white,
                blackId: p.black,
                result: null // Pending
            }
        })));

        // Update tournament
        await prisma.tournament.update({
            where: { id: parseInt(id) },
            data: { currentRound: nextRoundNum, status: 'ONGOING' }
        });

        return { roundId: round.id, matches: pairings };

    } catch (error: any) {
        server.log.error(error);
        return reply.status(500).send({
            error: 'Pairing Failed',
            details: error.response?.data || error.message
        });
    }
});

// Helper to recalculate player score
const updatePlayerScore = async (playerId: string) => {
    const matches = await prisma.match.findMany({
        where: {
            OR: [{ whiteId: playerId }, { blackId: playerId }],
            result: { not: null }
        }
    });

    let totalScore = 0.0;
    for (const m of matches) {
        // Check for BYE (opponent is null) - Auto Win (1.0)
        if (m.whiteId === playerId && !m.blackId) {
            totalScore += 1.0;
            continue;
        }
        if (m.blackId === playerId && !m.whiteId) {
            totalScore += 1.0;
            continue;
        }

        const isWhite = m.whiteId === playerId;
        if (m.result === '1-0') {
            totalScore += (isWhite ? 1.0 : 0.0);
        } else if (m.result === '0-1') {
            totalScore += (isWhite ? 0.0 : 1.0);
        } else if (m.result === '1/2-1/2') {
            totalScore += 0.5;
        }
    }

    await prisma.player.update({
        where: { id: playerId },
        data: { score: totalScore }
    });
};

// 5. 更新对局结果
server.put('/api/matches/:id', {
    schema: {
        body: z.object({
            result: z.enum(['1-0', '0-1', '1/2-1/2', '*']), // '*' for reset
        }),
    },
}, async (request, reply) => {
    const { id } = request.params as { id: string };
    const { result } = request.body;

    console.log(`[API] Updating match ${id} result to ${result}`);

    try {
        // 1. Update Match
        const match = await prisma.match.update({
            where: { id: parseInt(id) },
            data: { result: result === '*' ? null : result },
            include: { round: true }
        });

        const tournamentId = match.round.tournamentId;



        // 3. Update both players
        if (match.whiteId) await updatePlayerScore(match.whiteId);
        if (match.blackId) await updatePlayerScore(match.blackId);

        return match;
    } catch (error) {
        server.log.error(error);
        return reply.status(500).send({ error: 'Failed to update match result' });
    }
});

// Delete latest round (Rollback)
server.delete<{ Params: { id: string } }>('/api/tournaments/:id/rounds/latest', async (request, reply) => {
    const { id } = request.params;
    const tournamentId = parseInt(id);

    try {
        const tournament = await prisma.tournament.findUnique({
            where: { id: tournamentId },
            include: { players: true }
        });

        if (!tournament) return reply.status(404).send({ error: 'Tournament not found' });
        if (tournament.currentRound === 0) return reply.status(400).send({ error: 'No rounds to delete' });

        const roundToDelete = tournament.currentRound;

        // Transaction to ensure atomicity
        await prisma.$transaction(async (tx) => {
            // 1. Delete Matches in this round
            // We need to find the round ID first or delete by roundNumber + tournamentId if possible?
            // Prisma schema usually links Match to Round. Let's find the round first.
            const round = await tx.round.findFirst({
                where: { tournamentId, roundNumber: roundToDelete }
            });

            if (round) {
                await tx.match.deleteMany({
                    where: { roundId: round.id }
                });
                await tx.round.delete({
                    where: { id: round.id }
                });
            }

            // 2. Decrement Round Count
            await tx.tournament.update({
                where: { id: tournamentId },
                data: { currentRound: { decrement: 1 } }
            });
        });

        // 3. Recalculate scores for ALL players
        // We do this outside the transaction or inside? Outside is fine as it's just calculation updates.
        // But to be safe and consistent, we should practically do it. 
        // Note: updatePlayerScore uses 'prisma' global instance, so if we want to be transactional we might need to pass tx.
        // For now, let's keep it simple. The data matches are gone, so recalculation will be correct based on remaining matches.
        for (const player of tournament.players) {
            await updatePlayerScore(player.id);
        }

        return { success: true, message: `Round ${roundToDelete} rolled back` };

    } catch (error) {
        server.log.error(error);
        return reply.status(500).send({ error: 'Failed to rollback round' });
    }
});

// Update round pairings (Manual Pairing)
server.put<{ Params: { id: string; roundNumber: string }, Body: { pairings: { matchId: number; whiteId: string | null; blackId: string | null }[] } }>('/api/tournaments/:id/rounds/:roundNumber/pairings', async (request, reply) => {
    const { id, roundNumber } = request.params;
    const { pairings } = request.body;
    const tournamentId = parseInt(id);
    const roundNum = parseInt(roundNumber);

    try {
        const tournament = await prisma.tournament.findUnique({
            where: { id: tournamentId }
        });
        if (!tournament) return reply.status(404).send({ error: 'Tournament not found' });

        // Verify round exists
        const round = await prisma.round.findFirst({
            where: { tournamentId, roundNumber: roundNum }
        });

        if (!round) return reply.status(404).send({ error: 'Round not found' });

        // Batch update in transaction
        await prisma.$transaction(
            pairings.map(p =>
                prisma.match.update({
                    where: { id: p.matchId },
                    data: {
                        whiteId: p.whiteId,
                        blackId: p.blackId
                    }
                })
            )
        );

        return { success: true };

    } catch (error) {
        server.log.error(error);
        return reply.status(500).send({ error: 'Failed to update pairings' });
    }
});

const start = async () => {
    try {
        const port = parseInt(process.env.PORT || '3000');
        await server.listen({ port, host: '0.0.0.0' });
        console.log(`🚀 Node.js Gateway running at http://localhost:${port}`);
    } catch (err) {
        server.log.error(err);
        process.exit(1);
    }
};

start();
