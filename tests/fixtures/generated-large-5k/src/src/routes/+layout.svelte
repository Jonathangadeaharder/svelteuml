<script lang="ts">
	import Component1 from "$lib/components/Component1.svelte";

	let { children } = $props();
</script>

<nav>
	<a href="/">Home</a>
	<a href="/page1">Page 1</a>
	<a href="/page2">Page 2</a>
</nav>
<main>
	{@render children()}
</main>
