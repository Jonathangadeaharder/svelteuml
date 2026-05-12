import { get, writable } from 'svelte/store';
import { playPreview, stopPreview } from '$lib/audio';
import { findCorrectSlot, SONG_DECK, shuffled, validatePlacement } from '$lib/songs';
import type { Phase, Player, Screen, Song } from '$lib/types';
import {
	getGameState,
	getPlayerTimelines,
	getRoomPlayers,
	placeCard,
	subscribeToRoom,
	updateGameState,
	useToken,
} from '$lib/room';
import type { RoomPlayer } from '$lib/room';

export interface RemoteGameConfig {
	roomCode: string;
	roomId: string;
	myPlayerId: string;
	isHost: boolean;
}

const screen = writable<Screen>('lobby');
const round = writable(1);
const players = writable<Player[]>([]);
const drawPile = writable<Song[]>([]);
const activeCard = writable<Song | null>(null);
const activePlayerId = writable('');
const phase = writable<Phase>('draw');
const hoverSlot = writable<number | null>(null);
const placedSlot = writable<number | null>(null);
const placedResult = writable<boolean | null>(null);
const interceptor = writable<string | null>(null);
const winner = writable<Player | null>(null);
const dragging = writable(false);
const connected = writable(false);
const roomCode = writable('');
const myPlayerId = writable('');
const isHost = writable(false);

let config: RemoteGameConfig | null = null;
let channel: ReturnType<typeof subscribeToRoom> | null = null;
let playTimer: ReturnType<typeof setTimeout> | undefined;
let aiTimers: ReturnType<typeof setTimeout>[] = [];

function mapRoomPlayers(roomPlayers: RoomPlayer[], timelines: Map<string, Song[]>): Player[] {
	return roomPlayers.map((rp, i) => ({
		id: rp.id,
		name: rp.name,
		avatar: rp.avatar,
		timeline: timelines.get(rp.id) ?? [],
		tokens: rp.tokens,
	}));
}

async function loadInitialState(cfg: RemoteGameConfig) {
	const [roomPlayers, timelinesRows] = await Promise.all([
		getRoomPlayers(cfg.roomId),
		getPlayerTimelines(cfg.roomId),
	]);

	const timelineMap = new Map<string, Song[]>();
	// Rows are expected sorted by t.position ascending — getPlayerTimelines orders by position.
	// splice is safe because positions are contiguous within each player.
	for (const t of timelinesRows) {
		const song = SONG_DECK.find((s) => s.id === t.song_id);
		if (!song) continue;
		const existing = timelineMap.get(t.player_id) ?? [];
		if (t.position <= existing.length) {
			existing.splice(t.position, 0, song);
		} else {
			existing.push(song);
		}
		timelineMap.set(t.player_id, existing);
	}

	const mapped = mapRoomPlayers(roomPlayers, timelineMap);
	players.set(mapped);
	myPlayerId.set(cfg.myPlayerId);
	isHost.set(cfg.isHost);
	roomCode.set(cfg.roomCode);

	const state = await getGameState(cfg.roomId);
	if (state) {
		round.set(state.round);
		phase.set(state.phase as Phase);
		activePlayerId.set(state.active_player_id ?? '');
		drawPile.set(state.draw_pile ?? []);
		activeCard.set(state.active_card);
		screen.set('play');
	}
}

async function syncDrawNext() {
	if (!config) return;
	const pile = get(drawPile);
	if (pile.length === 0) return;

	const [next, ...rest] = pile;
	await updateGameState(config.roomCode, {
		drawPile: rest,
		activeCard: next,
		phase: 'draw',
	});
}

async function handleRemoteChange(
	payload: { event: string; table: string; new: Record<string, unknown> },
	cfg: RemoteGameConfig
) {
	if (payload.table === 'game_state') {
		const state = payload.new;
		round.set((state.round as number) ?? get(round));
		phase.set((state.phase as Phase) ?? get(phase));
		activePlayerId.set((state.active_player_id as string) ?? get(activePlayerId));
		drawPile.set((state.draw_pile as Song[]) ?? get(drawPile));
		activeCard.set((state.active_card as Song | null) ?? null);

		if (payload.event === 'UPDATE') {
			hoverSlot.set(null);
			placedSlot.set(null);
			placedResult.set(null);
			interceptor.set(null);
		}
	} else if (payload.table === 'players' || payload.table === 'timelines') {
		try {
			const [roomPlayers, timelinesRows] = await Promise.all([
				getRoomPlayers(cfg.roomId),
				getPlayerTimelines(cfg.roomId),
			]);
			const timelineMap = new Map<string, Song[]>();
			for (const t of timelinesRows) {
				const song = SONG_DECK.find((s) => s.id === t.song_id);
				if (!song) continue;
				const existing = timelineMap.get(t.player_id) ?? [];
				if (t.position <= existing.length) {
					existing.splice(t.position, 0, song);
				} else {
					existing.push(song);
				}
				timelineMap.set(t.player_id, existing);
			}
			players.set(mapRoomPlayers(roomPlayers, timelineMap));
		} catch {
			// Graceful degradation: skip update on fetch failure
		}
	} else if (payload.table === 'rooms') {
		const state = payload.new;
		if (state.status === 'playing' && get(screen) === 'lobby') {
			screen.set('play');
		}
		if (state.status === 'finished' || state.winner_player_id) {
			const currentPlayers = get(players);
			const w = currentPlayers.find((p) => p.id === state.winner_player_id);
			if (w) {
				winner.set(w);
				screen.set('win');
			}
		}
	}
}

export async function connectRemoteGame(cfg: RemoteGameConfig) {
	config = cfg;
	await loadInitialState(cfg);
	connected.set(true);

	channel = subscribeToRoom(cfg.roomId, (payload) => {
		handleRemoteChange(payload, cfg);
	});
}

export function disconnectRemoteGame() {
	if (channel) {
		void removeChannel(channel);
		channel = null;
	}
	clearTimers();
	config = null;
	connected.set(false);
	screen.set('lobby');
}

async function removeChannel(ch: NonNullable<typeof channel>) {
	const { supabase } = await import('$lib/supabase');
	supabase.removeChannel(ch);
}

function clearTimers() {
	if (playTimer) clearTimeout(playTimer);
	for (const t of aiTimers) clearTimeout(t);
	aiTimers = [];
}

async function drawNext() {
	if (!config) return;
	const pile = get(drawPile);
	if (pile.length === 0) return;
	const [next, ...rest] = pile;
	drawPile.set(rest);
	activeCard.set(next);
	phase.set('draw');
	hoverSlot.set(null);
	placedSlot.set(null);
	placedResult.set(null);
	interceptor.set(null);
}

async function startGame() {
	if (!config || get(screen) !== 'lobby') return;
	if (!config.isHost) return;
	const { startGame } = await import('$lib/room');
	await startGame(config.roomCode);

	const freshDeck = shuffled(SONG_DECK);
	const initialPlayers = get(players);
	const remaining = freshDeck.slice(initialPlayers.length);
	drawPile.set(remaining);
	await updateGameState(config.roomCode, {
		drawPile: remaining,
		activeCard: remaining[0] ?? null,
		phase: 'draw',
		activePlayerId: initialPlayers[0]?.id,
	});
}

async function onPlay() {
	phase.set('listen');
	const card = get(activeCard);
	if (card) void playPreview(card);
	if (playTimer) clearTimeout(playTimer);
	playTimer = setTimeout(() => {
		if (get(phase) === 'listen') phase.set('place');
	}, 1400);
}

async function onPlace(slot: number) {
	if (get(phase) !== 'place' || !config) return;
	const card = get(activeCard);
	if (!card) return;

	hoverSlot.set(slot);
	placedSlot.set(slot);

	const currentPlayers = get(players);
	const currentActiveId = get(activePlayerId);
	const active = currentPlayers.find((p) => p.id === currentActiveId);
	if (!active) return;

	const ok = validatePlacement(active.timeline, card, slot);
	placedResult.set(ok);

	if (ok) {
		const newTimeline = [...active.timeline.slice(0, slot), card, ...active.timeline.slice(slot)];
		players.set(
			currentPlayers.map((p) => (p.id === currentActiveId ? { ...p, timeline: newTimeline } : p))
		);

		await placeCard(config.roomCode, currentActiveId, card.id, slot, true);

		if (newTimeline.length >= 10) {
			setTimeout(() => {
				winner.set(currentPlayers.find((p) => p.id === currentActiveId)!);
				screen.set('win');
			}, 1200);
			return;
		}
	} else {
		await placeCard(config.roomCode, currentActiveId, card.id, slot, false);
	}
	phase.set('reveal');
	stopPreview();
}

async function onChallenge() {
	if (get(phase) !== 'place' || !config) return;
	const currentActiveId = get(activePlayerId);
	const meId = get(myPlayerId);
	if (currentActiveId === meId) return;

	const currentPlayers = get(players);
	const card = get(activeCard);
	const me = currentPlayers.find((p) => p.id === meId);
	if (!me || me.tokens <= 0 || !card) return;

	await useToken(config.roomCode, meId);
	players.set(currentPlayers.map((p) => (p.id === meId ? { ...p, tokens: p.tokens - 1 } : p)));
	interceptor.set(meId);
	phase.set('challenge');

	setTimeout(() => {
		const correctSlotVal = findCorrectSlot(me.timeline, card);
		placedSlot.set(correctSlotVal);
		placedResult.set(true);

		const newTimeline = [
			...me.timeline.slice(0, correctSlotVal),
			card,
			...me.timeline.slice(correctSlotVal),
		];
		const updatedPlayers = get(players).map((p) =>
			p.id === meId ? { ...p, timeline: newTimeline } : p
		);
		players.set(updatedPlayers);

		if (newTimeline.length >= 10) {
			setTimeout(() => {
				winner.set(updatedPlayers.find((p) => p.id === meId)!);
				screen.set('win');
			}, 1200);
			return;
		}
		phase.set('reveal');
		stopPreview();
	}, 1600);
}

async function onNextTurn() {
	if (!config) return;
	const currentPlayers = get(players);
	const currentActiveId = get(activePlayerId);
	const ids = currentPlayers.map((p) => p.id);
	const idx = ids.indexOf(currentActiveId);
	const nextId = ids[(idx + 1) % ids.length];
	const newRound = get(round) + (nextId === ids[0] ? 1 : 0);

	const pile = get(drawPile);
	const nextCard = pile.length > 0 ? pile[0] : null;
	const restPile = pile.slice(1);

	await updateGameState(config.roomCode, {
		activePlayerId: nextId,
		round: newRound,
		phase: 'draw',
		activeCard: nextCard,
		drawPile: restPile,
	});

	activePlayerId.set(nextId);
	round.set(newRound);
	drawPile.set(restPile);
	activeCard.set(nextCard);
	phase.set('draw');
	hoverSlot.set(null);
	placedSlot.set(null);
	placedResult.set(null);
	interceptor.set(null);
}

function onReplay() {
	stopPreview();
	clearTimers();
	players.set([]);
	drawPile.set([]);
	activeCard.set(null);
	phase.set('draw');
	hoverSlot.set(null);
	placedSlot.set(null);
	placedResult.set(null);
	interceptor.set(null);
	winner.set(null);
	activePlayerId.set('');
	round.set(1);
	screen.set('lobby');
}

function runAiTurn(): (() => void) | undefined {
	if (!config) return undefined;
	if (get(screen) !== 'play') return undefined;
	const meId = get(myPlayerId);
	if (get(activePlayerId) === meId) return undefined;
	if (get(phase) !== 'draw') return undefined;

	clearTimers();

	const t1 = setTimeout(() => phase.set('listen'), 700);
	aiTimers.push(t1);
	const t2 = setTimeout(() => phase.set('place'), 1800);
	aiTimers.push(t2);
	const t3 = setTimeout(async () => {
		const currentPlayers = get(players);
		const card = get(activeCard);
		const activeId = get(activePlayerId);
		const active = currentPlayers.find((p) => p.id === activeId);
		if (!active || !card || !config) return;

		const correct = findCorrectSlot(active.timeline, card);
		const rightful = correct >= 0 ? correct : 0;
		const rand = Math.random();
		const slot = rand > 0.4 ? rightful : Math.floor(Math.random() * (active.timeline.length + 1));
		const ok = validatePlacement(active.timeline, card, slot);

		placedSlot.set(slot);
		placedResult.set(ok);

		if (ok) {
			const newTimeline = [...active.timeline.slice(0, slot), card, ...active.timeline.slice(slot)];
			players.update((prev) =>
				prev.map((p) => {
					if (p.id !== activeId) return p;
					return { ...p, timeline: newTimeline };
				})
			);
			await placeCard(config.roomCode, activeId, card.id, slot, true);

			if (newTimeline.length >= 10) {
				setTimeout(() => {
					winner.set({ ...active, timeline: newTimeline });
					screen.set('win');
				}, 1200);
				return;
			}
		} else {
			await placeCard(config.roomCode, activeId, card.id, slot, false);
		}
		phase.set('reveal');
		stopPreview();
	}, 3200);
	aiTimers.push(t3);

	return () => clearTimers();
}

export const remoteGame = {
	screen,
	round,
	players,
	drawPile,
	activeCard,
	activePlayerId,
	phase,
	hoverSlot,
	placedSlot,
	placedResult,
	interceptor,
	winner,
	dragging,
	connected,
	roomCode,
	myPlayerId,
	isHost,
	connectRemoteGame,
	disconnectRemoteGame,
	startGame,
	onPlay,
	onPlace,
	onChallenge,
	onNextTurn,
	onReplay,
	runAiTurn,
};
