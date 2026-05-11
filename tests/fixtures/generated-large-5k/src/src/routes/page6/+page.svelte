<script lang="ts">
	import { page } from "$app/stores";
	import Component6 from "../lib/components/Component6.svelte";

	let search = $state("");
	let items = $state<string[]>([]);

	function handleSubmit() {
		items = [...items, search];
		search = "";
	}
</script>

<h1>Page 6</h1>
<input bind:value={search} placeholder="Search..." />
<button onclick={handleSubmit}>Add</button>
<Component6 prop0_6="val0" prop1_6="val1" prop2_6="val2" />
<ul>
	{#each items as item}
		<li>{item}</li>
	{/each}
</ul>
