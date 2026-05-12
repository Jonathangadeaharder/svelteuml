<script lang="ts">
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';
	import { createRematch, getRoomByCode } from '$lib/room';
	import { supabase } from '$lib/supabase';

	interface Props {
		roomCode: string;
		isHost: boolean;
	}

	let { roomCode, isHost }: Props = $props();
	let loading = $state(false);
	let error = $state<string | null>(null);

	onMount(() => {
		if (isHost) return;

		let channel: ReturnType<typeof supabase.channel> | null = null;

		(async () => {
			const room = await getRoomByCode(roomCode);
			if (!room) return;

			channel = supabase
				.channel(`rematch:${room.id}`)
				.on('broadcast', { event: 'rematch_created' }, (payload) => {
					const newCode = payload.payload?.new_room_code;
					if (newCode) goto(`/game/${newCode}`);
				})
				.subscribe();
		})();

		return () => {
			if (channel) supabase.removeChannel(channel);
		};
	});

	async function handleRematch() {
		if (!isHost || loading) return;
		loading = true;
		error = null;

		try {
			const newRoom = await createRematch(roomCode);
			const channel = supabase.channel(`rematch:${roomCode}`);
			await channel.subscribe();
			await channel.send({
				type: 'broadcast',
				event: 'rematch_created',
				payload: { new_room_code: newRoom.code },
			});
			supabase.removeChannel(channel);
			goto(`/game/${newRoom.code}`);
		} catch (e) {
			error = e instanceof Error ? e.message : 'Failed to create rematch';
			loading = false;
		}
	}
</script>

<div class="rematch">
	{#if isHost}
		<button class="rematch-btn" onclick={handleRematch} disabled={loading}>
			{loading ? 'Creating...' : 'Play Again'}
		</button>
	{:else}
		<div class="waiting">Waiting for host to start rematch...</div>
	{/if}

	{#if error}
		<div class="error">{error}</div>
	{/if}
</div>

<style>
	.rematch {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 8px;
	}
	.rematch-btn {
		padding: 12px 24px;
		background: #0a0a0a;
		color: #f4efe4;
		border: none;
		border-radius: 4px;
		cursor: pointer;
		font-family: 'IBM Plex Mono', monospace;
		font-size: 11px;
		letter-spacing: 2px;
		text-transform: uppercase;
	}
	.rematch-btn:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}
	.waiting {
		font-family: 'IBM Plex Mono', monospace;
		font-size: 10px;
		letter-spacing: 1px;
		opacity: 0.6;
	}
	.error {
		font-family: 'IBM Plex Mono', monospace;
		font-size: 10px;
		color: #c00;
	}
</style>
