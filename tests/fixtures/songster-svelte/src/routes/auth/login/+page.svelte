<script lang="ts">
	import { page } from '$app/state';
	import { supabase } from '$lib/supabase';

	let email = $state('');
	let password = $state('');
	let loading = $state(false);
	let error = $state('');
	let message = $state('');

	/** Destination to return to after auth (from route guard redirect). */
	const redirectTo: string = $derived(
		typeof page.url?.searchParams?.get === 'function'
			? (() => {
					const raw = page.url.searchParams.get('redirectTo') ?? '/';
					const isInternal = raw.startsWith('/') && !raw.startsWith('//');
					return isInternal ? raw : '/';
				})()
			: '/'
	);

	async function handleLogin() {
		loading = true;
		error = '';
		message = '';
		const { error: err } = await supabase.auth.signInWithPassword({ email, password });
		if (err) {
			error = err.message;
			loading = false;
			return;
		}
		window.location.replace(redirectTo);
	}

	async function handleSignup() {
		loading = true;
		error = '';
		message = '';
		const { data, error: err } = await supabase.auth.signUp({ email, password });
		if (err) {
			error = err.message;
			loading = false;
			return;
		}
		if (data.session) {
			window.location.replace(redirectTo);
		} else {
			message = 'Check your email to confirm your account before signing in.';
			loading = false;
		}
	}

	async function handleGuest() {
		loading = true;
		error = '';
		message = '';
		const { error: err } = await supabase.auth.signInAnonymously();
		if (err) {
			error = err.message;
			loading = false;
			return;
		}
		window.location.replace(redirectTo);
	}
</script>

<div class="login-page">
	<h1>Songster</h1>
	<form
		onsubmit={(e) => {
			e.preventDefault();
			handleLogin();
		}}
	>
		<input type="email" bind:value={email} placeholder="Email" required />
		<input type="password" bind:value={password} placeholder="Password" required />
		{#if error}<p class="error" role="alert">{error}</p>{/if}
		{#if message}<p class="message" role="status">{message}</p>{/if}
		<div class="btns">
			<button type="submit" disabled={loading}>Sign In</button>
			<button type="button" onclick={handleSignup} disabled={loading}>Sign Up</button>
		</div>
	</form>
	<button class="guest-btn" type="button" onclick={handleGuest} disabled={loading}>
		Play as Guest
	</button>
</div>

<style>
	.login-page {
		min-height: 100vh;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: var(--space-6, 24px);
		background: var(--bg, #f4efe4);
		color: var(--fg, #0a0a0a);
	}
	h1 {
		font-family: var(--font-serif, 'Playfair Display', serif);
		font-size: var(--text-2xl, 32px);
	}
	form {
		display: flex;
		flex-direction: column;
		gap: var(--space-3, 12px);
		width: 280px;
	}
	input {
		padding: 10px 12px;
		border: 1.5px solid var(--border, rgba(0, 0, 0, 0.2));
		border-radius: var(--radius, 4px);
		font-size: var(--text-base, 14px);
		background: transparent;
		color: inherit;
	}
	.btns {
		display: flex;
		gap: var(--space-2, 8px);
	}
	button {
		flex: 1;
		padding: 10px;
		border: none;
		border-radius: var(--radius, 4px);
		background: var(--fg, #0a0a0a);
		color: var(--bg, #f4efe4);
		cursor: pointer;
		font-family: var(--font-mono, 'IBM Plex Mono', monospace);
		font-size: 11px;
		letter-spacing: 1px;
		text-transform: uppercase;
	}
	button:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}
	.guest-btn {
		width: 280px;
		background: transparent;
		border: 1.5px solid var(--fg, #0a0a0a);
		color: var(--fg, #0a0a0a);
	}
	.error {
		color: var(--color-danger, #ff3b30);
		font-size: 13px;
	}
	.message {
		color: var(--color-success, #34c759);
		font-size: 13px;
	}
</style>
