<script lang="ts">
import { userStore } from "$lib/stores/user.svelte";
import { count } from "$lib/stores/counter.svelte";

let currentUser = $derived($userStore?.name ?? "Guest");
</script>

<h1>Welcome, {currentUser}</h1>
<p>Store count: {$count}</p>
{#if $userStore}
	<button onclick={() => ($userStore = null)}>Logout</button>
{/if}
