<script lang="ts">
	import type { Player, Theme } from '$lib/types';
	import { colors } from '$lib/utils';
	let { player, active = false, theme = 'light' as Theme }: { player: Player; active?: boolean; theme?: Theme } = $props();
	const c = $derived(colors(theme));
</script>

<div class="chip" class:active style="opacity: {active ? 1 : 0.5}">
	<div class="avatar" style="background: {active ? c.primary : 'transparent'}; color: {active ? c.paper : 'inherit'}">{player.avatar}</div>
	<div class="info">
		<div class="name">{player.name}</div>
		<div class="stats">{player.timeline.length}/10 · ◈{player.tokens}</div>
	</div>
</div>

<style>
	.chip { display: flex; align-items: center; gap: 6px; padding: 4px 0; }
	.avatar {
		width: 28px; height: 28px; border-radius: 50%;
		display: flex; align-items: center; justify-content: center;
		font-family: 'IBM Plex Mono', monospace; font-size: 12px; font-weight: 600;
		border: 1.5px solid currentColor; transition: all 200ms;
	}
	.info { display: flex; flex-direction: column; }
	.name { font-family: 'IBM Plex Mono', monospace; font-size: 10px; letter-spacing: 2px; text-transform: uppercase; font-weight: 600; }
	.stats { font-family: 'IBM Plex Mono', monospace; font-size: 9px; opacity: 0.5; }
</style>
