<script lang="ts">
	import type { Track } from '$lib/types';

	let { onSelect }: { onSelect: (track: Track) => void } = $props();

	let query = $state('');
	let results = $state<Track[]>([]);
	let debounceTimer: ReturnType<typeof setTimeout> | null = $state(null);
	let loading = $state(false);

	async function search() {
		if (!query.trim()) {
			results = [];
			return;
		}
		loading = true;
		try {
			const res = await fetch(`/api/track/search?q=${encodeURIComponent(query)}&limit=10`);
			if (res.ok) {
				results = await res.json();
			}
		} finally {
			loading = false;
		}
	}

	function onInput() {
		if (debounceTimer) clearTimeout(debounceTimer);
		debounceTimer = setTimeout(() => search(), 300);
	}
</script>

<div class="deck-builder">
	<input
		type="text"
		placeholder="Search songs..."
		bind:value={query}
		oninput={onInput}
		aria-label="Search songs"
	/>
	{#if loading}
		<p>Loading...</p>
	{:else}
		<ul class="results">
			{#each results as track}
				<li class="result-item">
					<span>{track.title}</span>
					<span>{track.artist}</span>
					<span>{track.year}</span>
					<button onclick={() => onSelect(track)}>Add</button>
				</li>
			{/each}
		</ul>
	{/if}
</div>

<style>
	.deck-builder {
		display: flex;
		flex-direction: column;
		gap: 8px;
	}
	input {
		padding: 8px;
		border-radius: 4px;
		border: 1px solid #ccc;
	}
	.results {
		list-style: none;
		padding: 0;
		margin: 0;
	}
	.result-item {
		display: flex;
		align-items: center;
		gap: 8px;
		padding: 4px;
	}
	button {
		padding: 4px 8px;
		cursor: pointer;
	}
</style>
