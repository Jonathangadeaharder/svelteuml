<script lang="ts">
import { createAuthActions } from "$lib/stores/auth.svelte";
import { useCounters } from "$lib/stores/counter.svelte";
import { formatDate } from "$lib/utils/helpers";

const _auth = createAuthActions();
const { count, doubled, increment } = useCounters();
const _today = formatDate(new Date());
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
