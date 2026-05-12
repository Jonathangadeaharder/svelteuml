<script lang="ts">
let { children } = $props();
</script>

<nav>
	<a href="/">Home</a>
	<a href="/about">About</a>
	<a href="/auth/login">Login</a>
	<a href="/auth/register">Register</a>
</nav>
<main>{@render children()}</main>
