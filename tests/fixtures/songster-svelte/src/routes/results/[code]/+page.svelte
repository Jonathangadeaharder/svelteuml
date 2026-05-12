<script lang="ts">
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';
	import Chrome from '$lib/components/Chrome.svelte';
	import Wordmark from '$lib/components/Wordmark.svelte';
	import Rematch from '$lib/components/Rematch.svelte';
	import { game } from '$lib/stores/game';
	import { getRoomByCode } from '$lib/room';
	import { supabase } from '$lib/supabase';
	import type { Player } from '$lib/types';

	let code: string = $derived(page.params.code ?? '');
	let { winner, players } = game;
	let isHost = $state(false);

	let sortedPlayers = $derived([...$players].sort((a, b) => b.timeline.length - a.timeline.length));

	onMount(async () => {
		const room = await getRoomByCode(code);
		if (!room) return;
		const {
			data: { user },
		} = await supabase.auth.getUser();
		if (user) isHost = room.host_id === user.id;
	});
</script>

<Chrome title="RESULTS · {code}">
	{#snippet children()}
		<main id="main-content" class="results" aria-label="Game results">
			<Wordmark scale={2} />
			<div class="winner" aria-label="Winner">
				<div class="winner-label">Winner</div>
				<div class="winner-name">{$winner?.name ?? 'Nobody'}</div>
			</div>
			<Rematch roomCode={code} {isHost} />

			{#if sortedPlayers.length > 0}
				<div class="stats" aria-label="Final scores">
					<div class="stats-header">
						<span class="stats-col">Player</span>
						<span class="stats-col">Cards</span>
						<span class="stats-col">Tokens</span>
					</div>
					{#each sortedPlayers as player, i}
						<div class="stats-row" class:winner-row={i === 0 && $winner?.id === player.id}>
							<span class="stats-col stats-name">{player.avatar} {player.name}</span>
							<span class="stats-col stats-value">{player.timeline.length}/10</span>
							<span class="stats-col stats-value">◈{player.tokens}</span>
						</div>
					{/each}
				</div>
			{:else}
				<div class="no-players" aria-label="No players">
					<p class="no-text">No players in this game</p>
				</div>
			{/if}

			<button
				class="replay-btn"
				onclick={() => {
					game.onReplay();
					goto('/');
				}}
			>
				Play Again
			</button>
		</main>
	{/snippet}
</Chrome>

<style>
	.results {
		flex: 1;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 24px;
		padding: 24px 16px;
	}
	.winner {
		text-align: center;
	}
	.winner-label {
		font-family: 'IBM Plex Mono', monospace;
		font-size: 10px;
		letter-spacing: 3px;
		text-transform: uppercase;
		opacity: 0.5;
	}
	.winner-name {
		font-family: 'Playfair Display', serif;
		font-size: 36px;
		font-weight: 700;
		font-style: italic;
	}
	.stats {
		width: 100%;
		max-width: 300px;
		border: 1px solid rgba(10, 10, 10, 0.12);
		border-radius: 6px;
		overflow: hidden;
	}
	.stats-header {
		display: flex;
		padding: 8px 12px;
		border-bottom: 1px solid rgba(10, 10, 10, 0.12);
		font-family: 'IBM Plex Mono', monospace;
		font-size: 9px;
		letter-spacing: 2px;
		text-transform: uppercase;
		opacity: 0.5;
	}
	.stats-row {
		display: flex;
		padding: 8px 12px;
		border-bottom: 1px solid rgba(10, 10, 10, 0.06);
	}
	.stats-row:last-child {
		border-bottom: none;
	}
	.winner-row {
		background: rgba(200, 169, 110, 0.1);
	}
	.stats-col {
		flex: 1;
		font-family: 'IBM Plex Mono', monospace;
		font-size: 11px;
	}
	.stats-name {
		font-weight: 600;
	}
	.stats-value {
		text-align: center;
	}
	.no-players {
		padding: 16px;
	}
	.no-text {
		font-family: 'IBM Plex Mono', monospace;
		font-size: 11px;
		opacity: 0.5;
	}
	.replay-btn {
		padding: 12px 24px;
		background: #0a0a0a;
		color: #f4efe4;
		border: none;
		border-radius: 4px;
		cursor: pointer;
		font-family: 'IBM Plex Mono', monospace;
		font-size: 11px;
		letter-spacing: 2px;
		text-transform: uppercase;
		transition: opacity 0.2s;
	}
	.replay-btn:hover {
		opacity: 0.85;
	}
	@media (max-width: 480px) {
		.results {
			padding: 16px 12px;
			gap: 16px;
		}
		.winner-name {
			font-size: 28px;
		}
		.stats {
			max-width: 100%;
		}
		.replay-btn {
			width: 100%;
			padding: 14px;
		}
	}
	@media (prefers-reduced-motion: reduce) {
		.replay-btn {
			transition: none;
		}
	}
</style>
