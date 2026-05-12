<script lang="ts">
	import { onMount } from 'svelte';
	import type { Snippet } from 'svelte';

	let { children, fallback }: { children: Snippet; fallback?: Snippet } = $props();
	let error = $state<Error | null>(null);

	function reset() {
		error = null;
	}

	onMount(() => {
		function onError(event: ErrorEvent) {
			event.preventDefault();
			error = event.error ?? new Error(event.message);
		}
		function onUnhandledRejection(event: PromiseRejectionEvent) {
			event.preventDefault();
			error = event.reason instanceof Error ? event.reason : new Error(String(event.reason));
		}
		window.addEventListener('error', onError);
		window.addEventListener('unhandledrejection', onUnhandledRejection);
		return () => {
			window.removeEventListener('error', onError);
			window.removeEventListener('unhandledrejection', onUnhandledRejection);
		};
	});
</script>

{#if error}
	<div class="error-boundary" role="alert">
		{#if fallback}
			{@render fallback()}
		{:else}
			<div class="error-content">
				<span class="error-icon">⚠</span>
				<p class="error-title">Something went wrong</p>
				<p class="error-msg">{error.message}</p>
				<button type="button" class="error-retry" onclick={reset}>Try again</button>
			</div>
		{/if}
	</div>
{:else}
	<div class="error-boundary">
		{@render children()}
	</div>
{/if}

<style>
	.error-boundary {
		display: contents;
	}
	.error-content {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 8px;
		padding: 24px;
		text-align: center;
	}
	.error-icon {
		font-size: 24px;
	}
	.error-title {
		font-family: 'Playfair Display', serif;
		font-size: 16px;
		font-weight: 700;
	}
	.error-msg {
		font-family: 'IBM Plex Mono', monospace;
		font-size: 11px;
		opacity: 0.6;
		max-width: 280px;
	}
	.error-retry {
		margin-top: 8px;
		padding: 8px 16px;
		background: #0a0a0a;
		color: #f4efe4;
		border: none;
		border-radius: 4px;
		font-family: 'IBM Plex Mono', monospace;
		font-size: 11px;
		letter-spacing: 1px;
		cursor: pointer;
	}
</style>
