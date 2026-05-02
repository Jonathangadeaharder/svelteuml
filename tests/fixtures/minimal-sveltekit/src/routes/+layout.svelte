<script lang="ts">
	import { userStore } from '$lib/stores/user';

	let { children } = $props();
</script>

<nav>
	<a href="/">Home</a>
	<a href="/auth">Auth</a>
</nav>

{@render children()}
