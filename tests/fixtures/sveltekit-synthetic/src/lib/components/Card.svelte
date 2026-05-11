<script lang="ts">
let { label, onClick }: { label: string; onClick?: () => void } = $props();
</script>

<div class="card">
	<h2>{label}</h2>
	{#if onClick}
		<button onclick={onClick}>Action</button>
	{/if}
</div>
