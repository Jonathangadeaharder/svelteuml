<script>
	export let title;
	export let count = 0;
	export let onSelect;

	let internal = "private";
</script>

<h1>{title}</h1>
<p>Count: {count}</p>
<button on:click={onSelect}>Select</button>
<p>Internal: {internal}</p>
