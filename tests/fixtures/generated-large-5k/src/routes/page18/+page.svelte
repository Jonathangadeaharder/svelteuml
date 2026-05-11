<script lang="ts">
	import { page } from "$app/stores";
	import Component18 from "../lib/components/Component18.svelte";

	let search = $state("");
	let items = $state<string[]>([]);

	function handleSubmit() {
		items = [...items, search];
		search = "";
	}
</script>

<h1>Page 18</h1>
<input bind:value={search} placeholder="Search..." />
<button onclick={handleSubmit}>Add</button>
<Component18 prop0_18="val0" prop1_18="val1" prop2_18="val2" />
<ul>
	{#each items as item}
		<li>{item}</li>
	{/each}
</ul>
