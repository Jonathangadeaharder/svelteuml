<script lang="ts">
let { label, onClick, disabled = false } = $props<{
	label: string;
	onClick: () => void;
	disabled?: boolean;
}>();
</script>

<button {disabled} onclick={onClick}>{label}</button>

<style>
	button {
		padding: 0.5rem 1rem;
		border-radius: 4px;
	}
</style>
