<script lang="ts">
	import { page } from "$app/stores";
	import Component1 from "../lib/components/Component1.svelte";

	let search = $state("");
	let items = $state<string[]>([]);

	function handleSubmit() {
		items = [...items, search];
		search = "";
	}
</script>

<h1>Page 1</h1>
<input bind:value={search} placeholder="Search..." />
<button onclick={handleSubmit}>Add</button>
<Component1 prop0_1="val0" prop1_1="val1" prop2_1="val2" />
<ul>
	{#each items as item}
		<li>{item}</li>
	{/each}
</ul>
