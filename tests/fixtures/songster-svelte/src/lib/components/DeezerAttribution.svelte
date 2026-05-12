<script lang="ts">
	let { trackUrl = '' }: { trackUrl?: string } = $props();
</script>

<div class="attribution">
	{#if trackUrl}
		<a href={trackUrl} target="_blank" rel="noopener noreferrer">Powered by Deezer</a>
	{:else}
		<span>Powered by Deezer</span>
	{/if}
</div>

<style>
	.attribution {
		font-size: 0.75rem;
		opacity: 0.6;
	}
	a {
		color: inherit;
		text-decoration: underline;
	}
</style>
