<script lang="ts">
	import { page } from '$app/stores';
	let { children } = $props();
</script>

<div class="app-layout">
	<nav>
		<a href="/dashboard">Dashboard</a>
		<a href="/users/1">User 1</a>
	</nav>
	{@render children()}
</div>
