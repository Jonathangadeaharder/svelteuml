<script lang="ts">
let { label, onClick } = $props<{ label: string; onClick: () => void }>();
</script>

<button onclick={onClick}>{label}</button>

<style>
	button {
		padding: 0.5rem 1rem;
		border-radius: 4px;
	}
</style>
