<script lang="ts">
	import { page } from "$app/stores";
	import Component20 from "../lib/components/Component20.svelte";

	let search = $state("");
	let items = $state<string[]>([]);

	function handleSubmit() {
		items = [...items, search];
		search = "";
	}
</script>

<h1>Page 20</h1>
<input bind:value={search} placeholder="Search..." />
<button onclick={handleSubmit}>Add</button>
<Component20 prop0_20="val0" prop1_20="val1" prop2_20="val2" />
<ul>
	{#each items as item}
		<li>{item}</li>
	{/each}
</ul>
