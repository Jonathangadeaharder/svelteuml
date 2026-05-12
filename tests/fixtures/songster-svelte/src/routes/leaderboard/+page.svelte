<script lang="ts">
	import Chrome from '$lib/components/Chrome.svelte';
	import { getLeaderboard, type LeaderboardEntry } from '$lib/room';
	import { onMount } from 'svelte';

	let leaderboard = $state<LeaderboardEntry[]>([]);
	let loading = $state(true);
	let error = $state<string | null>(null);
	let sortBy = $state<'games_won' | 'win_rate' | 'games_played'>('games_won');

	onMount(async () => {
		try {
			leaderboard = await getLeaderboard(50);
		} catch (e) {
			error = e instanceof Error ? e.message : 'Failed to load leaderboard';
		} finally {
			loading = false;
		}
	});

	let sorted = $derived(
		[...leaderboard].sort((a, b) => {
			if (sortBy === 'win_rate') return b.win_rate - a.win_rate;
			if (sortBy === 'games_played') return b.games_played - a.games_played;
			return b.games_won - a.games_won;
		})
	);

	function formatRate(rate: number): string {
		return `${Math.round(rate * 100)}%`;
	}
</script>

<Chrome title="Leaderboard · Songster">
	{#snippet children()}
		<div class="leaderboard-page">
			<h1>Leaderboard</h1>

			<div class="sort-controls">
				<button class:active={sortBy === 'games_won'} onclick={() => (sortBy = 'games_won')}>
					Wins
				</button>
				<button class:active={sortBy === 'win_rate'} onclick={() => (sortBy = 'win_rate')}>
					Win Rate
				</button>
				<button class:active={sortBy === 'games_played'} onclick={() => (sortBy = 'games_played')}>
					Games
				</button>
			</div>

			{#if loading}
				<div class="loading">Loading...</div>
			{:else if error}
				<div class="error">{error}</div>
			{:else if sorted.length === 0}
				<div class="empty">No games played yet. Be the first on the leaderboard!</div>
			{:else}
				<div class="table-wrapper">
					<table>
						<thead>
							<tr>
								<th class="rank">#</th>
								<th>Player</th>
								<th class="num">Wins</th>
								<th class="num">Win Rate</th>
								<th class="num">Games</th>
								<th class="num">Avg Timeline</th>
							</tr>
						</thead>
						<tbody>
							{#each sorted as entry, i}
								<tr>
									<td class="rank">{i + 1}</td>
									<td class="name">{entry.name}</td>
									<td class="num">{entry.games_won}</td>
									<td class="num">{formatRate(entry.win_rate)}</td>
									<td class="num">{entry.games_played}</td>
									<td class="num">{entry.avg_timeline_length.toFixed(1)}</td>
								</tr>
							{/each}
						</tbody>
					</table>
				</div>
			{/if}
		</div>
	{/snippet}
</Chrome>

<style>
	.leaderboard-page {
		max-width: 700px;
		margin: 0 auto;
		padding: 24px 16px;
	}
	h1 {
		font-family: 'Playfair Display', serif;
		font-size: 24px;
		font-weight: 700;
		font-style: italic;
		margin-bottom: 16px;
	}
	.sort-controls {
		display: flex;
		gap: 8px;
		margin-bottom: 20px;
	}
	.sort-controls button {
		padding: 6px 12px;
		border: 1px solid var(--primary, #0a0a0a);
		border-radius: 4px;
		background: none;
		font-family: 'IBM Plex Mono', monospace;
		font-size: 10px;
		letter-spacing: 1px;
		cursor: pointer;
		opacity: 0.5;
	}
	.sort-controls button.active {
		opacity: 1;
		background: var(--primary, #0a0a0a);
		color: var(--paper, #f4efe4);
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
	.table-wrapper {
		overflow-x: auto;
	}
	table {
		width: 100%;
		border-collapse: collapse;
		font-family: 'IBM Plex Mono', monospace;
		font-size: 11px;
	}
	th {
		text-align: left;
		padding: 8px 12px;
		border-bottom: 1px solid var(--primary, #0a0a0a);
		font-size: 9px;
		letter-spacing: 2px;
		text-transform: uppercase;
		opacity: 0.5;
	}
	td {
		padding: 10px 12px;
		border-bottom: 0.5px solid rgba(128, 128, 128, 0.2);
	}
	.rank {
		width: 40px;
		text-align: center;
	}
	.num {
		text-align: right;
	}
	.name {
		font-weight: 600;
	}
</style>
