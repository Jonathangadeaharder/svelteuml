<script lang="ts">
	import { userStore } from '$lib/stores/user.svelte';
	import { isLoggedIn, userName, createAuthActions } from '$lib/stores/auth.svelte';
	import { useCounters } from '$lib/stores/counter.svelte';
	import { formatDate } from '$lib/utils/helpers';

	const auth = createAuthActions();
	const { count, doubled, increment } = useCounters();
	const today = formatDate(new Date());
</script>

<h1>Welcome, {$userName}</h1>
<p>Date: {today}</p>
<p>Count: {$count}, Doubled: {$doubled}</p>
<button onclick={increment}>Increment</button>

{#if $isLoggedIn}
	<button onclick={() => auth.logout()}>Logout</button>
{:else}
	<button onclick={() => auth.login('test@example.com', 'pass')}>Login</button>
{/if}
