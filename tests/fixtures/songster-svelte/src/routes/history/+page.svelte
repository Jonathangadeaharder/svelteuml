<script lang="ts">
	import Chrome from '$lib/components/Chrome.svelte';
	import { getGameHistory, type GameHistoryEntry } from '$lib/room';
	import { supabase } from '$lib/supabase';
	import { onMount } from 'svelte';

	let history = $state<GameHistoryEntry[]>([]);
	let loading = $state(true);
	let error = $state<string | null>(null);

	onMount(async () => {
		try {
			const {
				data: { user },
			} = await supabase.auth.getUser();
			if (!user) {
				error = 'Please sign in to view history';
				loading = false;
				return;
			}
			history = await getGameHistory(user.id);
		} catch (e) {
			error = e instanceof Error ? e.message : 'Failed to load history';
		} finally {
			loading = false;
		}
	});

	function formatDate(dateStr: string): string {
		return new Date(dateStr).toLocaleDateString('en-US', {
			month: 'short',
			day: 'numeric',
			year: 'numeric',
		});
	}

	function formatDuration(duration: string | null): string {
		if (!duration) return '--';
		// Parse PostgreSQL interval format
		const match = duration.match(/(\d+):(\d+):(\d+)/);
		if (match) {
			const [, h, m, s] = match;
			if (parseInt(h) > 0) return `${h}h ${m}m`;
			return `${m}m ${s}s`;
		}
		return duration;
	}
</script>

<Chrome title="Game History · Songster">
	{#snippet children()}
		<div class="history-page">
			<h1>Game History</h1>

			{#if loading}
				<div class="loading">Loading...</div>
			{:else if error}
				<div class="error">{error}</div>
			{:else if history.length === 0}
				<div class="empty">No games played yet. Start a game to see your history!</div>
			{:else}
				<div class="game-list">
					{#each history as game}
						<a href="/game/{game.room_code}" class="game-card">
							<div class="game-header">
								<span class="game-date">{formatDate(game.created_at)}</span>
								<span class="game-code">{game.room_code}</span>
							</div>
							<div class="game-details">
								<div class="detail">
									<span class="detail-label">Winner</span>
									<span class="detail-value">{game.winner_name ?? 'N/A'}</span>
								</div>
								<div class="detail">
									<span class="detail-label">Players</span>
									<span class="detail-value">{game.players.join(', ')}</span>
								</div>
								<div class="detail">
									<span class="detail-label">Duration</span>
									<span class="detail-value">{formatDuration(game.game_duration)}</span>
								</div>
							</div>
						</a>
					{/each}
				</div>
			{/if}
		</div>
	{/snippet}
</Chrome>

<style>
	.history-page {
		max-width: 600px;
		margin: 0 auto;
		padding: 24px 16px;
	}
	h1 {
		font-family: 'Playfair Display', serif;
		font-size: 24px;
		font-weight: 700;
		font-style: italic;
		margin-bottom: 24px;
	}
	.loading,
	.error,
	.empty {
		font-family: 'IBM Plex Mono', monospace;
		font-size: 12px;
		text-align: center;
		padding: 40px 0;
		opacity: 0.6;
	}
	.error {
		color: #c00;
	}
	.game-list {
		display: flex;
		flex-direction: column;
		gap: 12px;
	}
	.game-card {
		display: block;
		padding: 16px;
		border: 0.5px solid var(--primary, #0a0a0a);
		border-radius: 6px;
		text-decoration: none;
		color: inherit;
		transition: opacity 0.15s;
	}
	.game-card:hover {
		opacity: 0.8;
	}
	.game-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 8px;
	}
	.game-date {
		font-family: 'IBM Plex Mono', monospace;
		font-size: 10px;
		letter-spacing: 1px;
		opacity: 0.5;
	}
	.game-code {
		font-family: 'IBM Plex Mono', monospace;
		font-size: 11px;
		font-weight: 600;
		letter-spacing: 2px;
	}
	.game-details {
		display: flex;
		flex-direction: column;
		gap: 4px;
	}
	.detail {
		display: flex;
		gap: 8px;
		font-family: 'IBM Plex Mono', monospace;
		font-size: 10px;
	}
	.detail-label {
		opacity: 0.4;
		min-width: 60px;
	}
	.detail-value {
		font-weight: 500;
	}
</style>
