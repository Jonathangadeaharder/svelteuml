<script lang="ts">
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';
	import Chrome from '$lib/components/Chrome.svelte';
	import PlayerChip from '$lib/components/PlayerChip.svelte';
	import Skeleton from '$lib/components/Skeleton.svelte';
	import { remoteGame } from '$lib/stores/game-remote';
	import { game } from '$lib/stores/game';
	import { toasts } from '$lib/stores/toast';
	import {
		getRoomByCode,
		getRoomPlayers,
		getCurrentPlayerInRoom,
		subscribeToRoom,
	} from '$lib/room';
	import type { Player } from '$lib/types';

	let code: string = $derived(page.params.code ?? '');
	let isDemo = $derived(code === 'DEMO');
	let starting = $state(false);
	let roomId = $state('');
	let error = $state('');
	let loading = $state(true);

	let { connected, players: remotePlayers, isHost, myPlayerId } = remoteGame;
	let { players: localPlayers } = game;

	onMount(() => {
		if (isDemo) {
			loading = false;
			return;
		}

		let cancelled = false;
		let statusChannel: ReturnType<typeof subscribeToRoom> | null = null;

		(async () => {
			try {
				const room = await getRoomByCode(code);
				if (cancelled) return;
				if (!room) {
					error = 'Room not found';
					loading = false;
					return;
				}
				if (room.status !== 'waiting') {
					goto(`/game/${code}`);
					return;
				}
				roomId = room.id;

				const playerInfo = await getCurrentPlayerInRoom(room.id);
				if (cancelled) return;
				if (!playerInfo) {
					error = 'Not in this room';
					loading = false;
					return;
				}

				await remoteGame.connectRemoteGame({
					roomCode: code,
					roomId: room.id,
					myPlayerId: playerInfo.playerId,
					isHost: room.host_id === playerInfo.userId,
				});

				if (!cancelled) {
					statusChannel = subscribeToRoom(room.id, (payload) => {
						if (payload.table === 'rooms' && payload.new.status === 'playing') {
							goto(`/game/${code}`);
						}
					});
				}
			} catch (e) {
				if (!cancelled) {
					error = e instanceof Error ? e.message : 'Failed to load room';
					toasts.error(error);
				}
			} finally {
				if (!cancelled) loading = false;
			}
		})();

		return () => {
			cancelled = true;
			if (statusChannel) {
				void import('$lib/supabase').then(({ supabase }) => {
					if (statusChannel) supabase.removeChannel(statusChannel);
				});
			}
			remoteGame.disconnectRemoteGame();
		};
	});

	async function handleStart() {
		if (isDemo) {
			game.startGame();
			goto(`/game/${code}`);
			return;
		}

		starting = true;
		try {
			await remoteGame.startGame();
			toasts.success('Game started!');
			goto(`/game/${code}`);
		} catch (e) {
			error = e instanceof Error ? e.message : 'Failed to start';
			toasts.error(error);
			starting = false;
		}
	}
</script>

<Chrome title="LOBBY · {code}">
	{#snippet children()}
		<main id="main-content" class="lobby" aria-label="Game lobby">
			{#if loading}
				<div class="loading-state" aria-label="Loading lobby">
					<Skeleton width="120px" height="24px" />
					<Skeleton width="160px" height="12px" />
					<div class="skeleton-players">
						<Skeleton width="100%" height="36px" />
						<Skeleton width="100%" height="36px" />
						<Skeleton width="100%" height="36px" />
					</div>
				</div>
			{:else if error}
				<div class="error-state" role="alert">
					<p class="error">{error}</p>
					<button class="retry-btn" onclick={() => goto('/')}>Back to Home</button>
				</div>
			{:else if isDemo}
				<h2>Solo Game</h2>
				<p class="sub">AI opponents ready</p>
				<div class="player-list" role="list" aria-label="Players">
					{#each $localPlayers as player}
						<div role="listitem">
							<PlayerChip {player} active={player.id === 'p1'} />
						</div>
					{/each}
				</div>
			{:else}
				<h2>Room {code}</h2>
				<p class="sub">Waiting for players…</p>
				{#if error}
					<p class="error" role="alert">{error}</p>
				{/if}
				<div class="player-list" role="list" aria-label="Players">
					{#if $remotePlayers.length === 0}
						<div class="empty-state">
							<p class="empty-text">No players yet</p>
							<p class="empty-hint">Share code <strong>{code}</strong> with friends</p>
						</div>
					{:else}
						{#each $remotePlayers as player}
							<div role="listitem">
								<PlayerChip {player} active={player.id === $myPlayerId} />
							</div>
						{/each}
					{/if}
				</div>
			{/if}
			<button
				class="start-btn"
				onclick={handleStart}
				disabled={(!isDemo && (!$isHost || $remotePlayers.length < 1)) || starting}
				aria-busy={starting}
			>
				{#if starting}
					<span class="spinner" aria-hidden="true"></span> Starting…
				{:else}
					Start Game
				{/if}
			</button>
		</main>
	{/snippet}
</Chrome>

<style>
	.lobby {
		flex: 1;
		display: flex;
		flex-direction: column;
		align-items: center;
		padding: 24px 16px;
		gap: 16px;
	}
	h2 {
		font-family: 'Playfair Display', serif;
		font-size: 24px;
	}
	.sub {
		font-family: 'IBM Plex Mono', monospace;
		font-size: 10px;
		letter-spacing: 2px;
		text-transform: uppercase;
		opacity: 0.5;
	}
	.error {
		color: #c0392b;
		font-family: 'IBM Plex Mono', monospace;
		font-size: 11px;
		letter-spacing: 1px;
	}
	.player-list {
		display: flex;
		flex-direction: column;
		gap: 8px;
		width: 100%;
	}
	.loading-state {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 12px;
		width: 100%;
		padding-top: 24px;
	}
	.skeleton-players {
		display: flex;
		flex-direction: column;
		gap: 8px;
		width: 100%;
	}
	.error-state {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 16px;
		padding: 24px;
	}
	.retry-btn {
		padding: 10px 16px;
		background: #0a0a0a;
		color: #f4efe4;
		border: none;
		border-radius: 4px;
		font-family: 'IBM Plex Mono', monospace;
		font-size: 11px;
		letter-spacing: 1px;
		cursor: pointer;
	}
	.empty-state {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 4px;
		padding: 24px;
	}
	.empty-text {
		font-family: 'IBM Plex Mono', monospace;
		font-size: 12px;
		opacity: 0.5;
	}
	.empty-hint {
		font-family: 'IBM Plex Mono', monospace;
		font-size: 10px;
		opacity: 0.4;
	}
	.start-btn {
		margin-top: auto;
		width: 100%;
		padding: 14px;
		background: #0a0a0a;
		color: #f4efe4;
		border: none;
		border-radius: 4px;
		font-family: 'IBM Plex Mono', monospace;
		font-size: 11px;
		letter-spacing: 4px;
		text-transform: uppercase;
		font-weight: 600;
		cursor: pointer;
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 8px;
	}
	.start-btn:disabled {
		opacity: 0.4;
		cursor: default;
	}
	.spinner {
		width: 12px;
		height: 12px;
		border: 2px solid rgba(244, 239, 228, 0.3);
		border-top-color: #f4efe4;
		border-radius: 50%;
		animation: spin 0.6s linear infinite;
	}
	@keyframes spin {
		to {
			transform: rotate(360deg);
		}
	}
	@media (max-width: 480px) {
		.lobby {
			padding: 16px 12px;
		}
		h2 {
			font-size: 20px;
		}
		.start-btn {
			padding: 12px;
			font-size: 10px;
			letter-spacing: 3px;
		}
	}
	@media (prefers-reduced-motion: reduce) {
		.spinner {
			animation: none;
		}
	}
</style>
