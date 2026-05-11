<script lang="ts">
	import { page } from "$app/stores";
	import Component8 from "../lib/components/Component8.svelte";

	let search = $state("");
	let items = $state<string[]>([]);

	function handleSubmit() {
		items = [...items, search];
		search = "";
	}
</script>

<h1>Page 8</h1>
<input bind:value={search} placeholder="Search..." />
<button onclick={handleSubmit}>Add</button>
<Component8 prop0_8="val0" prop1_8="val1" prop2_8="val2" />
<ul>
	{#each items as item}
		<li>{item}</li>
	{/each}
</ul>
