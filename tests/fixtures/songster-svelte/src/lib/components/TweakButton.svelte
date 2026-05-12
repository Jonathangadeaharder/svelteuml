<script lang="ts">
	let { label, onclick, secondary = false }: {
		label: string; onclick: () => void; secondary?: boolean;
	} = $props();
</script>

<button type="button" class="twk-btn" class:secondary onclick={onclick}>{label}</button>

<style>
	.twk-btn {
		appearance: none; height: 26px; padding: 0 12px;
		border: 0; border-radius: 7px; background: rgba(0,0,0,.78);
		color: #fff; font: inherit; font-weight: 500; cursor: pointer;
	}
	.twk-btn:hover { background: rgba(0,0,0,.88); }
	.secondary { background: rgba(0,0,0,.06); color: inherit; }
	.secondary:hover { background: rgba(0,0,0,.1); }
</style>
