<script lang="ts">
	let { label, value = 0, min = 0, max = 100, step = 1, unit = '', onchange }: {
		label: string; value?: number; min?: number; max?: number; step?: number;
		unit?: string; onchange: (v: number) => void;
	} = $props();

	function handleInput(e: Event) {
		onchange(Number((e.target as HTMLInputElement).value));
	}
</script>

<div class="twk-row">
	<div class="twk-lbl">
		<span>{label}</span>
		{#if value != null}
			<span class="twk-val">{value}{unit}</span>
		{/if}
	</div>
	<input type="range" class="twk-slider" {min} {max} {step} {value} oninput={handleInput} />
</div>

<style>
	.twk-row { display: flex; flex-direction: column; gap: 5px; }
	.twk-lbl {
		display: flex; justify-content: space-between; align-items: baseline;
		color: rgba(41,38,27,.72);
	}
	.twk-lbl > :global(span:first-child) { font-weight: 500; }
	.twk-val { color: rgba(41,38,27,.5); font-variant-numeric: tabular-nums; }
	.twk-slider {
		appearance: none; -webkit-appearance: none;
		width: 100%; height: 4px; margin: 6px 0;
		border-radius: 999px; background: rgba(0,0,0,.12); outline: none;
	}
	.twk-slider::-webkit-slider-thumb {
		-webkit-appearance: none; appearance: none;
		width: 14px; height: 14px; border-radius: 50%;
		background: #fff; border: 0.5px solid rgba(0,0,0,.12);
		box-shadow: 0 1px 3px rgba(0,0,0,.2); cursor: pointer;
	}
	.twk-slider::-moz-range-thumb {
		width: 14px; height: 14px; border-radius: 50%;
		background: #fff; border: 0.5px solid rgba(0,0,0,.12);
		box-shadow: 0 1px 3px rgba(0,0,0,.2); cursor: pointer;
	}
</style>
