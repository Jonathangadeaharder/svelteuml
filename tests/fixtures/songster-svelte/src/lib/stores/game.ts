import { get, writable } from 'svelte/store';
import { playPreview, preloadPreviews, stopPreview } from '$lib/audio';
import {
	buildDrawPile,
	findCorrectSlot,
	SONG_DECK,
	seededPlayers,
	validatePlacement,
} from '$lib/songs';
import type { Phase, Player, Song } from '$lib/types';

const initialPlayers = seededPlayers();
const screen = writable<'lobby' | 'play' | 'win'>('lobby');
const round = writable(1);
const players = writable<Player[]>(initialPlayers);
const drawPile = writable<Song[]>(buildDrawPile(initialPlayers));
const activeCard = writable<Song | null>(null);
const activePlayerId = writable('p1');
const phase = writable<Phase>('draw');
const hoverSlot = writable<number | null>(null);
const placedSlot = writable<number | null>(null);
const placedResult = writable<boolean | null>(null);
const interceptor = writable<string | null>(null);
const winner = writable<Player | null>(null);
const dragging = writable(false);

preloadPreviews(SONG_DECK);

function drawNext() {
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

function startGame() {
	if (get(screen) !== 'lobby') return;
	screen.set('play');
	drawNext();
}

let playTimer: ReturnType<typeof setTimeout> | undefined;

function onPlay() {
	phase.set('listen');
	const card = get(activeCard);
	if (card) void playPreview(card);
	if (playTimer) clearTimeout(playTimer);
	playTimer = setTimeout(() => {
		if (get(phase) === 'listen') phase.set('place');
	}, 1400);
}

function onPlace(slot: number) {
	if (get(phase) !== 'place') return;
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
		const updatedPlayers = currentPlayers.map((p) =>
			p.id === currentActiveId ? { ...p, timeline: newTimeline } : p
		);
		players.set(updatedPlayers);
		if (newTimeline.length >= 10) {
			setTimeout(() => {
				winner.set(updatedPlayers.find((p) => p.id === currentActiveId)!);
				screen.set('win');
			}, 1200);
		}
	}
	phase.set('reveal');
	stopPreview();
}

function onChallenge() {
	if (get(phase) !== 'place' || get(activePlayerId) === 'p1') return;
	const currentPlayers = get(players);
	const card = get(activeCard);
	const me = currentPlayers.find((p) => p.id === 'p1')!;
	if (me.tokens <= 0 || !card) return;

	players.set(currentPlayers.map((p) => (p.id === 'p1' ? { ...p, tokens: p.tokens - 1 } : p)));
	interceptor.set('p1');
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
			p.id === 'p1' ? { ...p, timeline: newTimeline } : p
		);
		players.set(updatedPlayers);
		if (newTimeline.length >= 10) {
			setTimeout(() => {
				winner.set(updatedPlayers.find((p) => p.id === 'p1')!);
				screen.set('win');
			}, 1200);
		}
		phase.set('reveal');
		stopPreview();
	}, 1600);
}

function onNextTurn() {
	const currentPlayers = get(players);
	const currentActiveId = get(activePlayerId);
	const ids = currentPlayers.map((p) => p.id);
	const idx = ids.indexOf(currentActiveId);
	const nextId = ids[(idx + 1) % ids.length];
	activePlayerId.set(nextId);
	round.update((r) => r + (nextId === 'p1' ? 1 : 0));
	drawNext();
}

function onReplay() {
	stopPreview();
	const fresh = seededPlayers();
	players.set(fresh);
	drawPile.set(buildDrawPile(fresh));
	activePlayerId.set('p1');
	round.set(1);
	winner.set(null);
	activeCard.set(null);
	phase.set('draw');
	screen.set('lobby');
}

function runAiTurn(): (() => void) | undefined {
	if (get(screen) !== 'play' || get(activePlayerId) === 'p1' || get(phase) !== 'draw')
		return undefined;

	const t1 = setTimeout(() => phase.set('listen'), 700);
	const t2 = setTimeout(() => phase.set('place'), 1800);
	const t3 = setTimeout(() => {
		const currentPlayers = get(players);
		const card = get(activeCard);
		const activeId = get(activePlayerId);
		const active = currentPlayers.find((p) => p.id === activeId);
		if (!active || !card) return;

		const correct = findCorrectSlot(active.timeline, card);
		const clampedCorrect = Math.max(0, Math.min(correct, active.timeline.length));
		const rand = Math.random(); // NOSONAR: game AI, not security-sensitive
		const slot = rand > 0.4 ? clampedCorrect : Math.floor(Math.random() * (active.timeline.length + 1)); // NOSONAR
		const ok = validatePlacement(active.timeline, card, slot);

		placedSlot.set(slot);
		placedResult.set(ok);
		if (ok) {
			players.update((prev) =>
				prev.map((p) => {
					if (p.id !== activeId) return p;
					const newTimeline = [...p.timeline.slice(0, slot), card, ...p.timeline.slice(slot)];
					if (newTimeline.length >= 10) {
						setTimeout(() => {
							winner.set({ ...p, timeline: newTimeline });
							screen.set('win');
						}, 1200);
					}
					return { ...p, timeline: newTimeline };
				})
			);
		}
		phase.set('reveal');
		stopPreview();
	}, 3200);

	return () => {
		clearTimeout(t1);
		clearTimeout(t2);
		clearTimeout(t3);
	};
}

export const game = {
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
	startGame,
	onPlay,
	onPlace,
	onChallenge,
	onNextTurn,
	onReplay,
	runAiTurn,
	drawNext,
};
