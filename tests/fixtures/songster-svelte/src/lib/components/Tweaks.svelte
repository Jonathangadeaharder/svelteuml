<script lang="ts">
	import type { Snippet } from 'svelte';

	let { title = 'Tweaks', children }: { title?: string; children: Snippet } = $props();

	let open = $state(false);
	let panelEl: HTMLDivElement | undefined = $state();
	let offsetX = $state(16);
	let offsetY = $state(16);
	const PAD = 16;

	function clampToViewport() {
		if (!panelEl) return;
		const w = panelEl.offsetWidth, h = panelEl.offsetHeight;
		const maxRight = Math.max(PAD, window.innerWidth - w - PAD);
		const maxBottom = Math.max(PAD, window.innerHeight - h - PAD);
		offsetX = Math.min(maxRight, Math.max(PAD, offsetX));
		offsetY = Math.min(maxBottom, Math.max(PAD, offsetY));
	}

	function onDragStart(e: MouseEvent) {
		if (!panelEl) return;
		const r = panelEl.getBoundingClientRect();
		const sx = e.clientX, sy = e.clientY;
		const startRight = window.innerWidth - r.right;
		const startBottom = window.innerHeight - r.bottom;
		const move = (ev: MouseEvent) => {
			offsetX = startRight - (ev.clientX - sx);
			offsetY = startBottom - (ev.clientY - sy);
			clampToViewport();
		};
		const up = () => {
			window.removeEventListener('mousemove', move);
			window.removeEventListener('mouseup', up);
		};
		window.addEventListener('mousemove', move);
		window.addEventListener('mouseup', up);
	}

	$effect(() => {
		if (!open) return;
		clampToViewport();
		const ro = new ResizeObserver(clampToViewport);
		ro.observe(document.documentElement);
		return () => ro.disconnect();
	});
</script>

{#if !open}
	<button class="twk-toggleopen" onclick={() => open = true}>⚙ Tweaks</button>
{:else}
	<div class="twk-panel" bind:this={panelEl} style="right: {offsetX}px; bottom: {offsetY}px">
		<div class="twk-hd" role="toolbar" tabindex="0" aria-label="Drag to move tweaks panel" onmousedown={onDragStart}>
			<b>{title}</b>
			<button class="twk-x" aria-label="Close tweaks" onmousedown={(e) => e.stopPropagation()} onclick={() => open = false}>✕</button>
		</div>
		<div class="twk-body">
			{@render children()}
		</div>
	</div>
{/if}

<style>
	.twk-panel {
		position: fixed; right: 16px; bottom: 16px; z-index: 9999;
		width: 280px; max-height: calc(100vh - 32px);
		display: flex; flex-direction: column;
		background: rgba(250,249,247,.78); color: #29261b;
		-webkit-backdrop-filter: blur(24px) saturate(160%);
		backdrop-filter: blur(24px) saturate(160%);
		border: 0.5px solid rgba(255,255,255,.6); border-radius: 14px;
		box-shadow: 0 1px 0 rgba(255,255,255,.5) inset, 0 12px 40px rgba(0,0,0,.18);
		font: 11.5px/1.4 ui-sans-serif, system-ui, -apple-system, sans-serif;
		overflow: hidden;
	}
	.twk-toggleopen {
		position: fixed; right: 16px; bottom: 16px; z-index: 9998;
		appearance: none; border: 0; height: 36px; padding: 0 14px;
		border-radius: 10px; background: rgba(10,10,10,.85); color: #f4efe4;
		font-family: 'IBM Plex Mono', monospace; font-size: 11px;
		letter-spacing: 2px; text-transform: uppercase; cursor: pointer;
		box-shadow: 0 4px 12px rgba(0,0,0,.25);
	}
	.twk-hd {
		display: flex; align-items: center; justify-content: space-between;
		padding: 10px 8px 10px 14px; cursor: move; user-select: none;
	}
	.twk-hd b { font-size: 12px; font-weight: 600; letter-spacing: .01em; }
	.twk-x {
		appearance: none; border: 0; background: transparent;
		color: rgba(41,38,27,.55); width: 22px; height: 22px;
		border-radius: 6px; cursor: pointer; font-size: 13px; line-height: 1;
	}
	.twk-x:hover { background: rgba(0,0,0,.06); color: #29261b; }
	.twk-body {
		padding: 2px 14px 14px; display: flex; flex-direction: column;
		gap: 10px; overflow-y: auto; overflow-x: hidden; min-height: 0;
		scrollbar-width: thin; scrollbar-color: rgba(0,0,0,.15) transparent;
	}
	.twk-body::-webkit-scrollbar { width: 8px; }
	.twk-body::-webkit-scrollbar-track { background: transparent; margin: 2px; }
	.twk-body::-webkit-scrollbar-thumb { background: rgba(0,0,0,.15); border-radius: 4px; border: 2px solid transparent; background-clip: content-box; }
</style>
