<script lang="ts">
	import { user, signOut } from '$lib/stores/auth';
	import { goto } from '$app/navigation';

	async function handleSignOut() {
		await signOut();
		goto('/');
	}
</script>

{#if $user}
	<div class="auth-bar">
		<span class="user-label">{$user.email ?? 'Guest'}</span>
		<button onclick={handleSignOut} class="sign-out-btn">Sign Out</button>
	</div>
{/if}

<style>
	.auth-bar {
		display: flex;
		align-items: center;
		gap: 8px;
		font-family: 'IBM Plex Mono', monospace;
		font-size: 10px;
		letter-spacing: 1px;
	}
	.user-label {
		opacity: 0.6;
		text-transform: uppercase;
	}
	.sign-out-btn {
		background: none;
		border: 1px solid currentColor;
		padding: 4px 8px;
		border-radius: 3px;
		cursor: pointer;
		font-family: inherit;
		font-size: inherit;
		letter-spacing: inherit;
		text-transform: uppercase;
	}
</style>
