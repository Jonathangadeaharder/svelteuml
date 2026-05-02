<script lang="ts">
	let { userId } = $props<{ userId: string }>();
	let user = $state<{ name: string; email: string } | null>(null);
</script>

{#if user}
	<div class="profile">
		<h2>{user.name}</h2>
		<p>{user.email}</p>
	</div>
{:else}
	<p>Loading user {userId}...</p>
{/if}
