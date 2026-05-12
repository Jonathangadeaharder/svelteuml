<script lang="ts">
	import { goto } from '$app/navigation';
	import { user, signIn, signUp, signInAsGuest } from '$lib/stores/auth';
	import Wordmark from '$lib/components/Wordmark.svelte';

	let mode = $state<'login' | 'signup'>('login');
	let email = $state('');
	let password = $state('');
	let error = $state('');
	let submitting = $state(false);

	$effect(() => {
		if ($user) goto('/');
	});

	async function handleSubmit() {
		if (!email.trim() || !password.trim()) return;
		submitting = true;
		error = '';
		try {
			if (mode === 'login') {
				await signIn(email.trim(), password);
			} else {
				await signUp(email.trim(), password);
			}
			goto('/');
		} catch (e: unknown) {
			error = e instanceof Error ? e.message : 'Authentication failed';
		} finally {
			submitting = false;
		}
	}

	async function handleGuest() {
		submitting = true;
		error = '';
		try {
			await signInAsGuest();
			goto('/');
		} catch (e: unknown) {
			error = e instanceof Error ? e.message : 'Guest login failed';
		} finally {
			submitting = false;
		}
	}
</script>

<div class="login-page">
	<Wordmark scale={1.2} />
	<p class="tagline">{mode === 'login' ? 'Sign in' : 'Create account'}</p>

	{#if error}
		<p class="error">{error}</p>
	{/if}

	<form
		class="panel"
		onsubmit={(e) => {
			e.preventDefault();
			handleSubmit();
		}}
	>
		<input type="email" bind:value={email} placeholder="Email" disabled={submitting} required />
		<input
			type="password"
			bind:value={password}
			placeholder="Password"
			minlength={6}
			disabled={submitting}
			required
		/>
		<button type="submit" disabled={submitting || !email.trim() || !password.trim()}>
			{submitting ? 'Loading...' : mode === 'login' ? 'Sign In' : 'Sign Up'}
		</button>
	</form>

	<button class="toggle-btn" onclick={() => (mode = mode === 'login' ? 'signup' : 'login')}>
		{mode === 'login' ? 'Need an account? Sign up' : 'Have an account? Sign in'}
	</button>

	<button class="guest-btn" onclick={handleGuest} disabled={submitting}> Play as Guest </button>

	<a href="/" class="back-link">Back to home</a>
</div>

<style>
	.login-page {
		min-height: 100vh;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 16px;
		background: #f4efe4;
		color: #0a0a0a;
		padding: 20px;
	}
	.tagline {
		font-family: 'IBM Plex Mono', monospace;
		font-size: 12px;
		letter-spacing: 2px;
		text-transform: uppercase;
		opacity: 0.5;
	}
	.error {
		color: #c0392b;
		font-family: 'IBM Plex Mono', monospace;
		font-size: 11px;
		letter-spacing: 1px;
	}
	.panel {
		display: flex;
		flex-direction: column;
		gap: 10px;
		padding: 20px;
		border: 1.5px solid rgba(10, 10, 10, 0.15);
		border-radius: 8px;
		min-width: 260px;
	}
	input {
		padding: 10px 12px;
		border: 1.5px solid rgba(10, 10, 10, 0.2);
		border-radius: 4px;
		font-family: 'IBM Plex Mono', monospace;
		font-size: 13px;
		background: transparent;
		color: inherit;
		letter-spacing: 1px;
	}
	input:focus {
		outline: none;
		border-color: #0a0a0a;
	}
	button {
		padding: 10px 16px;
		border-radius: 4px;
		font-family: 'IBM Plex Mono', monospace;
		font-size: 11px;
		letter-spacing: 2px;
		text-transform: uppercase;
		font-weight: 600;
		cursor: pointer;
		background: #0a0a0a;
		color: #f4efe4;
		border: none;
		transition: opacity 0.2s;
	}
	button:disabled {
		opacity: 0.4;
		cursor: default;
	}
	.toggle-btn {
		background: none;
		color: #0a0a0a;
		border: none;
		font-size: 10px;
		letter-spacing: 1px;
		opacity: 0.6;
		padding: 4px;
	}
	.toggle-btn:hover {
		opacity: 1;
	}
	.guest-btn {
		background: none;
		color: #0a0a0a;
		border: 1.5px solid rgba(10, 10, 10, 0.2);
		margin-top: 8px;
	}
	.guest-btn:hover {
		border-color: #0a0a0a;
	}
	.back-link {
		margin-top: 12px;
		font-family: 'IBM Plex Mono', monospace;
		font-size: 11px;
		letter-spacing: 1px;
		opacity: 0.5;
		text-decoration: none;
		color: inherit;
	}
	.back-link:hover {
		opacity: 0.8;
	}
</style>
