<script lang="ts">
	import { goto } from '$app/navigation';
	import Wordmark from '$lib/components/Wordmark.svelte';
	import { createRoom, joinRoom } from '$lib/room';
	import { toasts } from '$lib/stores/toast';

	let hostName = $state('');
	let joinCode = $state('');
	let joinName = $state('');
	let creating = $state(false);
	let joining = $state(false);
	let error = $state('');

	async function handleCreate() {
		if (!hostName.trim()) return;
		creating = true;
		error = '';
		try {
			const room = await createRoom(hostName.trim());
			toasts.success('Room created!');
			goto(`/lobby/${room.code}`);
		} catch {
			toasts.info('Using demo mode');
			goto('/lobby/DEMO');
		}
	}

	async function handleJoin() {
		if (!joinCode.trim() || !joinName.trim()) return;
		joining = true;
		error = '';
		try {
			await joinRoom(joinCode.trim().toUpperCase(), joinName.trim());
			toasts.success('Joined room!');
		} catch {
			// Fall through to navigate — lobby handles missing rooms gracefully
		}
		goto(`/lobby/${joinCode.trim().toUpperCase()}`);
	}
</script>

<main id="main-content" class="home" aria-label="Songster home">
	<Wordmark scale={1.5} />
	<p class="tagline">Music trivia timeline game</p>

	{#if error}
		<p class="error" role="alert">{error}</p>
	{/if}

	<div class="panels">
		<form
			class="panel"
			aria-label="Create a room"
			onsubmit={(e) => {
				e.preventDefault();
				handleCreate();
			}}
		>
			<h3>Create Room</h3>
			<label for="create-name" class="sr-only">Your name</label>
			<input
				id="create-name"
				type="text"
				bind:value={hostName}
				placeholder="Your name"
				maxlength={20}
				disabled={creating}
				autocomplete="name"
			/>
			<button type="submit" disabled={creating || !hostName.trim()} aria-busy={creating}>
				{#if creating}
					<span class="spinner" aria-hidden="true"></span> Creating…
				{:else}
					Create Room
				{/if}
			</button>
		</form>

		<form
			class="panel"
			aria-label="Join a room"
			onsubmit={(e) => {
				e.preventDefault();
				handleJoin();
			}}
		>
			<h3>Join Room</h3>
			<label for="join-code" class="sr-only">Room code</label>
			<input
				id="join-code"
				type="text"
				bind:value={joinCode}
				placeholder="Room code"
				maxlength={6}
				disabled={joining}
				autocomplete="off"
			/>
			<label for="join-name" class="sr-only">Your name</label>
			<input
				id="join-name"
				type="text"
				bind:value={joinName}
				placeholder="Your name"
				maxlength={20}
				disabled={joining}
				autocomplete="name"
			/>
			<button
				type="submit"
				disabled={joining || !joinCode.trim() || !joinName.trim()}
				aria-busy={joining}
			>
				{#if joining}
					<span class="spinner" aria-hidden="true"></span> Joining…
				{:else}
					Join Room
				{/if}
			</button>
		</form>
	</div>

	<a href="/lobby/DEMO" class="solo-link">Or play solo with AI →</a>
</main>

<style>
	.home {
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
	.sr-only {
		position: absolute;
		width: 1px;
		height: 1px;
		padding: 0;
		margin: -1px;
		overflow: hidden;
		clip: rect(0, 0, 0, 0);
		white-space: nowrap;
		border: 0;
	}
	.panels {
		display: flex;
		gap: 16px;
		margin-top: 16px;
		flex-wrap: wrap;
		justify-content: center;
	}
	.panel {
		display: flex;
		flex-direction: column;
		gap: 10px;
		padding: 20px;
		border: 1.5px solid rgba(10, 10, 10, 0.15);
		border-radius: 8px;
		min-width: 200px;
	}
	.panel h3 {
		font-family: 'IBM Plex Mono', monospace;
		font-size: 11px;
		letter-spacing: 3px;
		text-transform: uppercase;
		opacity: 0.6;
		margin: 0;
	}
	input {
		padding: 10px 12px;
		border: 1.5px solid rgba(10, 10, 10, 0.2);
		border-radius: 4px;
		font-family: 'IBM Plex Mono', monospace;
		font-size: 13px;
		background: transparent;
		color: inherit;
		text-transform: uppercase;
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
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 8px;
	}
	button:disabled {
		opacity: 0.4;
		cursor: default;
	}
	.spinner {
		width: 12px;
		height: 12px;
		border: 2px solid rgba(244, 239, 228, 0.3);
		border-top-color: #f4efe4;
		border-radius: 50%;
		animation: spin 0.6s linear infinite;
	}
	@keyframes spin {
		to {
			transform: rotate(360deg);
		}
	}
	.solo-link {
		margin-top: 12px;
		font-family: 'IBM Plex Mono', monospace;
		font-size: 11px;
		letter-spacing: 1px;
		opacity: 0.5;
		text-decoration: none;
		color: inherit;
	}
	.solo-link:hover {
		opacity: 0.8;
	}
	@media (max-width: 480px) {
		.panels {
			flex-direction: column;
			width: 100%;
			max-width: 320px;
		}
		.panel {
			min-width: 0;
			width: 100%;
		}
		.home {
			padding: 16px;
			gap: 12px;
		}
	}
	@media (prefers-reduced-motion: reduce) {
		button,
		input,
		.solo-link {
			transition: none;
		}
		.spinner {
			animation: none;
		}
	}
</style>
