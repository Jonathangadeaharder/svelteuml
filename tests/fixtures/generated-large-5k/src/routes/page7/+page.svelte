<script lang="ts">
	import { page } from "$app/stores";
	import Component7 from "../lib/components/Component7.svelte";

	let search = $state("");
	let items = $state<string[]>([]);

	function handleSubmit() {
		items = [...items, search];
		search = "";
	}
</script>

<h1>Page 7</h1>
<input bind:value={search} placeholder="Search..." />
<button onclick={handleSubmit}>Add</button>
<Component7 prop0_7="val0" prop1_7="val1" prop2_7="val2" />
<ul>
	{#each items as item}
		<li>{item}</li>
	{/each}
</ul>
