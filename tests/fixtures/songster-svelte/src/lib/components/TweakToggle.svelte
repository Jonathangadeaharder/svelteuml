<script lang="ts">
	let { label, value = false, onchange }: {
		label: string; value?: boolean; onchange: (v: boolean) => void;
	} = $props();
</script>

<div class="twk-row twk-row-h">
	<div class="twk-lbl"><span>{label}</span></div>
	<button type="button" class="twk-toggle" data-on={value ? '1' : '0'} role="switch" aria-checked={!!value} aria-label={label} onclick={() => onchange(!value)}><i></i></button>
</div>

<style>
	.twk-row { display: flex; flex-direction: column; gap: 5px; }
	.twk-row-h { flex-direction: row; align-items: center; justify-content: space-between; gap: 10px; }
	.twk-lbl { color: rgba(41,38,27,.72); }
	.twk-lbl > :global(span) { font-weight: 500; }
	.twk-toggle {
		position: relative; width: 32px; height: 18px; border: 0;
		border-radius: 999px; background: rgba(0,0,0,.15);
		transition: background .15s; cursor: pointer; padding: 0;
	}
	.twk-toggle[data-on="1"] { background: #34c759; }
	.twk-toggle i {
		position: absolute; top: 2px; left: 2px;
		width: 14px; height: 14px; border-radius: 50%;
		background: #fff; box-shadow: 0 1px 2px rgba(0,0,0,.25);
		transition: transform .15s;
	}
	.twk-toggle[data-on="1"] i { transform: translateX(14px); }
</style>
