<script lang="ts">
	type Opt = { value: string; label: string };

	let { label, value, options, onchange }: {
		label: string; value: string; options: (string | Opt)[]; onchange: (v: string) => void;
	} = $props();

	let opts: Opt[] = $derived(options.map(o => typeof o === 'object' ? o : { value: o, label: o }));
	let idx = $derived(Math.max(0, opts.findIndex(o => o.value === value)));
	let n = $derived(opts.length);
	let dragging = $state(false);

	let trackEl: HTMLDivElement | undefined = $state();

	function segAt(clientX: number): string {
		if (!trackEl) return value;
		const r = trackEl.getBoundingClientRect();
		const inner = r.width - 4;
		const i = Math.floor(((clientX - r.left - 2) / inner) * n);
		return opts[Math.max(0, Math.min(n - 1, i))].value;
	}

	function onPointerDown(e: PointerEvent) {
		dragging = true;
		const v0 = segAt(e.clientX);
		if (v0 !== value) onchange(v0);
		const move = (ev: PointerEvent) => {
			const v = segAt(ev.clientX);
			if (v !== value) onchange(v);
		};
		const up = () => {
			dragging = false;
			window.removeEventListener('pointermove', move);
			window.removeEventListener('pointerup', up);
		};
		window.addEventListener('pointermove', move);
		window.addEventListener('pointerup', up);
	}
</script>

<div class="twk-row">
	<div class="twk-lbl">
		<span>{label}</span>
	</div>
	<div bind:this={trackEl} role="radiogroup" tabindex="0" onpointerdown={onPointerDown} class="twk-seg" class:dragging>
		<div class="twk-seg-thumb" style="left: calc(2px + {idx} * (100% - 4px) / {n}); width: calc((100% - 4px) / {n})"></div>
		{#each opts as o}
			<button type="button" role="radio" aria-checked={o.value === value} onclick={() => onchange(o.value)}>
				{o.label}
			</button>
		{/each}
	</div>
</div>

<style>
	.twk-row { display: flex; flex-direction: column; gap: 5px; }
	.twk-lbl {
		display: flex; justify-content: space-between; align-items: baseline;
		color: rgba(41,38,27,.72);
	}
	.twk-lbl > :global(span:first-child) { font-weight: 500; }
	.twk-seg {
		position: relative; display: flex; padding: 2px; border-radius: 8px;
		background: rgba(0,0,0,.06); user-select: none;
	}
	.twk-seg-thumb {
		position: absolute; top: 2px; bottom: 2px; border-radius: 6px;
		background: rgba(255,255,255,.9); box-shadow: 0 1px 2px rgba(0,0,0,.12);
		transition: left .15s cubic-bezier(.3,.7,.4,1), width .15s;
	}
	.twk-seg.dragging .twk-seg-thumb { transition: none; }
	.twk-seg button {
		appearance: none; position: relative; z-index: 1; flex: 1;
		border: 0; background: transparent; color: inherit;
		font: inherit; font-weight: 500; height: 22px; border-radius: 6px;
		cursor: pointer; padding: 0;
	}
</style>
