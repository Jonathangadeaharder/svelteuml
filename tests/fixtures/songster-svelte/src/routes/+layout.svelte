<script lang="ts">
	import '$lib/tokens.css';
	import type { Snippet } from 'svelte';
	import { tweaks } from '$lib/stores/tweaks';
	import Toast from '$lib/components/Toast.svelte';
	import { initAuth } from '$lib/stores/auth';
	import AuthBar from '$lib/components/AuthBar.svelte';
	import type { LayoutData } from './$types';

	let { children, data }: { children: Snippet; data: LayoutData } = $props();

	$effect(() => {
		initAuth(data.session);
	});

	$effect(() => {
		if (typeof document !== 'undefined') {
			document.documentElement.setAttribute('data-theme', $tweaks.theme);
		}
	});
</script>

<nav class="nav">
	<a href="/" class="nav-link">Home</a>
	<a href="/history" class="nav-link">History</a>
	<a href="/leaderboard" class="nav-link">Leaderboard</a>
</nav>

<div class="auth-bar-wrapper">
	<AuthBar />
</div>

<div class="content-wrapper">
	{@render children()}
</div>
<Toast />

<style>
	.nav {
		position: fixed;
		top: 0;
		left: 0;
		right: 0;
		display: flex;
		gap: 16px;
		padding: 8px 16px;
		font-family: 'IBM Plex Mono', monospace;
		font-size: 10px;
		letter-spacing: 1px;
		z-index: 100;
		background: var(--paper, #f4efe4);
		border-bottom: 0.5px solid var(--primary, #0a0a0a);
	}
	.nav-link {
		text-decoration: none;
		color: var(--primary, #0a0a0a);
		opacity: 0.6;
		transition: opacity 0.15s;
	}
	.nav-link:hover {
		opacity: 1;
	}
	.auth-bar-wrapper {
		position: fixed;
		top: 10px;
		right: 16px;
		z-index: 100;
	}
	.content-wrapper {
		padding-top: 36px;
	}
	:global(.skip-link) {
		position: absolute;
		top: -40px;
		left: 0;
		background: #0a0a0a;
		color: #f4efe4;
		padding: 8px 16px;
		z-index: 10001;
		font-family: 'IBM Plex Mono', monospace;
		font-size: 12px;
		letter-spacing: 1px;
		text-decoration: none;
		transition: top 0.2s;
	}
	:global(.skip-link:focus) {
		top: 0;
	}
	:global(:focus-visible) {
		outline: 2px solid var(--color-accent, #c8a96e);
		outline-offset: 2px;
	}
	:global(button:focus-visible, a:focus-visible, input:focus-visible) {
		outline: 2px solid var(--color-accent, #c8a96e);
		outline-offset: 2px;
	}
	@media (prefers-reduced-motion: reduce) {
		:global(.skip-link) {
			transition: none;
		}
	}
</style>
