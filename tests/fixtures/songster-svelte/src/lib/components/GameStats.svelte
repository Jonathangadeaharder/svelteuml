<script lang="ts">
	import type { Player } from '$lib/types';

	interface Props {
		drawPileCount: number;
		round: number;
		players: Player[];
		activePlayerId: string;
		startTime?: string | null;
	}

	let { drawPileCount, round, players, activePlayerId, startTime = null }: Props = $props();

	let elapsed = $state(0);
	let timer: ReturnType<typeof setInterval> | undefined;

	$effect(() => {
		if (startTime) {
			const start = new Date(startTime).getTime();
			timer = setInterval(() => {
				elapsed = Math.floor((Date.now() - start) / 1000);
			}, 1000);
		}
		return () => {
			if (timer) clearInterval(timer);
		};
	});

	function formatTime(seconds: number): string {
		const m = Math.floor(seconds / 60);
		const s = seconds % 60;
		return `${m}:${s.toString().padStart(2, '0')}`;
	}
</script>

<div class="game-stats">
	<div class="stat">
		<span class="stat-label">DRAW PILE</span>
		<span class="stat-value">{drawPileCount}</span>
	</div>
	<div class="stat">
		<span class="stat-label">ROUND</span>
		<span class="stat-value">{round}</span>
	</div>
	<div class="stat">
		<span class="stat-label">TIME</span>
		<span class="stat-value">{formatTime(elapsed)}</span>
	</div>
	{#each players as player}
		<div class="stat" class:active={player.id === activePlayerId}>
			<span class="stat-label">{player.name}</span>
			<span class="stat-value">{player.timeline.length}/10</span>
		</div>
	{/each}
</div>

<style>
	.game-stats {
		display: flex;
		gap: 16px;
		padding: 8px 16px;
		font-family: 'IBM Plex Mono', monospace;
		font-size: 10px;
		letter-spacing: 1px;
		border-bottom: 0.5px solid var(--primary, #0a0a0a);
		overflow-x: auto;
	}
	.stat {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 2px;
		opacity: 0.6;
	}
	.stat.active {
		opacity: 1;
	}
	.stat-label {
		text-transform: uppercase;
		opacity: 0.5;
		font-size: 8px;
	}
	.stat-value {
		font-weight: 600;
	}
</style>
