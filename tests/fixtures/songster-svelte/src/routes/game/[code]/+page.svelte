<script lang="ts">
	import { page } from '$app/state';
	import Chrome from '$lib/components/Chrome.svelte';
	import PlayerChip from '$lib/components/PlayerChip.svelte';
	import HitCard from '$lib/components/HitCard.svelte';
	import Vinyl from '$lib/components/Vinyl.svelte';
	import Waveform from '$lib/components/Waveform.svelte';
	import Timeline from '$lib/components/Timeline.svelte';
	import Skeleton from '$lib/components/Skeleton.svelte';
	import { game } from '$lib/stores/game';
	import { remoteGame } from '$lib/stores/game-remote';
	import { tweaks } from '$lib/stores/tweaks';
	import { toasts } from '$lib/stores/toast';
	import { colors } from '$lib/utils';
	import type { Player, Theme, ArtStyle, FlipStyle, Density } from '$lib/types';
	import { onMount, untrack } from 'svelte';
	import TweaksPanel from '$lib/components/Tweaks.svelte';
	import TweakSection from '$lib/components/TweakSection.svelte';
	import TweakRadio from '$lib/components/TweakRadio.svelte';
	import TweakSlider from '$lib/components/TweakSlider.svelte';
	import TweakToggle from '$lib/components/TweakToggle.svelte';
	import { getRoomByCode, getCurrentPlayerInRoom, addSpectator } from '$lib/room';
	import GameStats from '$lib/components/GameStats.svelte';
	import { supabase } from '$lib/supabase';

	let code: string = $derived(page.params.code ?? '');
	let t = $derived($tweaks);
	let { primary, paper } = $derived(colors(t.theme));
	let isSpectator = $derived(page.url.searchParams.get('spectate') === 'true');

	import { derived, writable } from 'svelte/store';
	import type { Writable, Readable } from 'svelte/store';

	let isDemo = $derived(code === 'DEMO');
	let startedAt = $state<string | null>(null);
	let loading = $state(true);
	// svelte-ignore state_referenced_locally
	const mode = writable<'demo' | 'remote'>(code === 'DEMO' ? 'demo' : 'remote');
	$effect(() => {
		mode.set(isDemo ? 'demo' : 'remote');
	});

	function proxy<T>(demo: Writable<T>, remote: Writable<T>): Readable<T> {
		return derived([demo, remote, mode], ([d, r, m]) => (m === 'demo' ? d : r));
	}

	function proxyConst<T>(demo: T, remote: Writable<T>): Readable<T> {
		return derived([remote, mode], ([r, m]) => (m === 'demo' ? demo : r));
	}

	const round = proxy(game.round, remoteGame.round);
	const drawPile = proxy(game.drawPile, remoteGame.drawPile);
	const players = proxy(game.players, remoteGame.players);
	const activeCard = proxy(game.activeCard, remoteGame.activeCard);
	const activePlayerId = proxy(game.activePlayerId, remoteGame.activePlayerId);
	const phase = proxy(game.phase, remoteGame.phase);
	const placedSlot = proxy(game.placedSlot, remoteGame.placedSlot);
	const placedResult = proxy(game.placedResult, remoteGame.placedResult);
	const interceptor = proxy(game.interceptor, remoteGame.interceptor);
	const screenStore = proxy(game.screen, remoteGame.screen);
	const dragging = proxy(game.dragging, remoteGame.dragging);

	const myPlayerId = proxyConst('p1', remoteGame.myPlayerId);
	const isHost = proxyConst(false, remoteGame.isHost);
	const connected = proxyConst(false, remoteGame.connected);

	function setTheme(v: string) {
		tweaks.set('theme', v as Theme);
	}
	function setArtStyle(v: string) {
		tweaks.set('artStyle', v as ArtStyle);
	}
	function setFlipStyle(v: string) {
		tweaks.set('flipStyle', v as FlipStyle);
	}
	function setDensity(v: string) {
		tweaks.set('density', v as Density);
	}

	let activePlayer: Player | undefined = $derived(
		$players.find((p: Player) => p.id === $activePlayerId)
	);
	let viewedPlayer: Player | undefined = $derived(
		isSpectator
			? $players.find((p: Player) => p.id === $activePlayerId)
			: $players.find((p: Player) => p.id === $myPlayerId)
	);
	let me: Player | undefined = $derived(
		!isSpectator ? $players.find((p: Player) => p.id === $myPlayerId) : undefined
	);
	let myTimeline = $derived(viewedPlayer?.timeline ?? []);
	let myTokens = $derived(viewedPlayer?.tokens ?? 0);
	let myLength = $derived(viewedPlayer?.timeline.length ?? 0);
	let myTurnAndPlacing = $derived($phase === 'place' && $activePlayerId === $myPlayerId);

	onMount(() => {
		if (isDemo) {
			if ($screenStore === 'lobby') game.startGame();
			loading = false;
			return;
		}

		let cancelled = false;

		(async () => {
			try {
				const room = await getRoomByCode(code);
				if (cancelled || !room) return;

				startedAt = room.started_at;

				if (isSpectator) {
					await remoteGame.connectRemoteGame({
						roomCode: code,
						roomId: room.id,
						myPlayerId: '',
						isHost: false,
					});
					const {
						data: { user },
					} = await supabase.auth.getUser();
					if (user) {
						await addSpectator(room.id, user.id);
					}
				} else {
					const playerInfo = await getCurrentPlayerInRoom(room.id);
					if (cancelled || !playerInfo) return;

					await remoteGame.connectRemoteGame({
						roomCode: code,
						roomId: room.id,
						myPlayerId: playerInfo.playerId,
						isHost: room.host_id === playerInfo.userId,
					});
				}
			} catch {
				toasts.error('Failed to connect to game');
			} finally {
				if (!cancelled) loading = false;
			}
		})();

		return () => {
			cancelled = true;
			remoteGame.disconnectRemoteGame();
		};
	});

	$effect(() => {
		$activePlayerId;
		untrack(() => {
			if ($phase === 'draw' && $activePlayerId !== $myPlayerId && $isHost) {
				if (isDemo) game.runAiTurn();
				else remoteGame.runAiTurn();
			}
		});
	});

	let dragSlot = $state<number | null>(null);

	function getStore() {
		return isDemo ? game : remoteGame;
	}

	function onCardDragStart(e: DragEvent) {
		if (isSpectator || !myTurnAndPlacing) {
			e.preventDefault();
			return;
		}
		e.dataTransfer!.setData('text/plain', 'active-card');
		e.dataTransfer!.effectAllowed = 'move';
		getStore().dragging.set(true);
	}

	function onCardDragEnd() {
		getStore().dragging.set(false);
		dragSlot = null;
	}

	function onSlotDragOver(e: DragEvent, i: number) {
		e.preventDefault();
		e.dataTransfer!.dropEffect = 'move';
		dragSlot = i;
	}

	function onSlotDragLeave(_e: DragEvent, i: number) {
		if (dragSlot === i) dragSlot = null;
	}

	function onSlotDrop(e: DragEvent, i: number) {
		if (isSpectator) return;
		e.preventDefault();
		dragSlot = null;
		getStore().dragging.set(false);
		getStore().onPlace(i);
	}

	function onPlay() {
		if (isSpectator) return;
		getStore().onPlay();
	}

	function onNextTurn() {
		if (isSpectator) return;
		getStore().onNextTurn();
	}

	function onChallenge() {
		if (isSpectator) return;
		getStore().onChallenge();
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape') {
			dragSlot = null;
			getStore().dragging.set(false);
		}
	}
</script>

<svelte:window onkeydown={handleKeydown} />

<div class="page">
	<Chrome theme={t.theme} title="Game · {code} · Songster">
		{#snippet right()}
			<div class="turn-label" aria-live="polite" aria-label="Current turn">
				{#if isSpectator}
					<span style="opacity: 0.6">SPECTATING</span>
				{:else}
					<span style="opacity: 0.6">TURN</span>
				{/if}
				<span>{activePlayer?.name}</span>
			</div>
		{/snippet}

		{#snippet children()}
			{#if loading}
				<main id="main-content" class="loading-game" aria-label="Loading game">
					<Skeleton width="100%" height="44px" />
					<div class="loading-vinyl">
						<Skeleton width="190px" height="190px" borderRadius="50%" />
					</div>
					<Skeleton width="100%" height="100px" />
				</main>
			{:else}
				<main id="main-content" class="game-content" aria-label="Game board">
					<div class="player-rail" role="list" aria-label="Players">
						{#each $players as player}
							<div role="listitem">
								<PlayerChip {player} active={player.id === $activePlayerId} theme={t.theme} />
							</div>
						{/each}
					</div>

					<GameStats
						drawPileCount={$drawPile.length}
						round={$round}
						players={$players}
						activePlayerId={$activePlayerId}
						startTime={startedAt}
					/>

					<div class="vinyl-section">
						<Vinyl
							size={190}
							spinning={$phase === 'listen' || $phase === 'place'}
							label={$phase === 'listen' || $phase === 'place'
								? 'NOW SPINNING'
								: $phase === 'reveal'
									? $placedResult
										? 'CORRECT'
										: 'DISCARD'
									: 'STANDBY'}
							subLabel={$phase === 'reveal' && $activeCard
								? `${$activeCard.year} · ${$activeCard.artist}`
								: '33⅓ RPM'}
							intensity={t.animIntensity}
						/>

						<Waveform
							bars={42}
							height={32}
							playing={$phase === 'listen' || $phase === 'place'}
							intensity={t.animIntensity}
						/>

						<div class="phase-label" aria-live="polite" aria-label="Game phase">
							{#if $phase === 'draw'}
								{activePlayer?.name}'s draw — tap the record
							{:else if $phase === 'listen'}
								Listening · 0:30 preview
							{:else if $phase === 'place'}
								{#if isSpectator}
									{`${activePlayer?.name} is placing…`}
								{:else}
									{$activePlayerId === $myPlayerId
										? 'Drag the card onto your timeline'
										: `${activePlayer?.name} is placing…`}
								{/if}
							{:else if $phase === 'reveal'}
								{$placedResult ? 'Correct placement' : 'Wrong — card discarded'}
							{:else if $phase === 'challenge'}
								{$players.find((p) => p.id === $interceptor)?.name} challenged!
							{/if}
						</div>
					</div>

					<div class="card-area">
						{#if $activeCard && ($phase === 'draw' || $phase === 'listen' || $phase === 'place' || $phase === 'challenge')}
							<div
								class="card-wrapper"
								role="group"
								aria-label="Active card: {$activeCard.title} by {$activeCard.artist}"
								draggable={isSpectator ? undefined : myTurnAndPlacing ? 'true' : undefined}
								ondragstart={onCardDragStart}
								ondragend={onCardDragEnd}
								style="cursor: {isSpectator
									? 'default'
									: myTurnAndPlacing
										? 'grab'
										: $phase === 'draw' && $activePlayerId === $myPlayerId
											? 'pointer'
											: 'default'}; opacity: {$dragging ? 0.3 : 1}"
							>
								<button
									disabled={$phase !== 'draw' || $activePlayerId !== $myPlayerId}
									onclick={$phase === 'draw' && $activePlayerId === $myPlayerId
										? onPlay
										: undefined}
									aria-label={$phase === 'draw' && $activePlayerId === $myPlayerId
										? 'Draw card'
										: undefined}
									style="background: none; border: none; padding: 0; pointer-events: {myTurnAndPlacing
										? 'none'
										: 'auto'}"
								>
									<HitCard
										song={$activeCard}
										faceDown={true}
										size="md"
										artStyle={t.artStyle}
										flipStyle={t.flipStyle}
										theme={t.theme}
									/>
								</button>
							</div>
						{:else if $phase === 'reveal' && $activeCard}
							<div class="card-reveal" class:correct={$placedResult} class:wrong={!$placedResult}>
								<HitCard
									song={$activeCard}
									faceDown={false}
									size="md"
									artStyle={t.artStyle}
									flipStyle={t.flipStyle}
									theme={t.theme}
									correct={$placedResult ?? undefined}
								/>
							</div>
						{/if}
					</div>

					{#if !isSpectator && t.interceptionEnabled && ($phase === 'place' || $phase === 'challenge') && $activePlayerId !== $myPlayerId}
						<div class="challenge-bar" role="region" aria-label="Challenge option">
							<div>
								<div class="challenge-label">Challenge</div>
								<div class="challenge-text">Think they're wrong? Spend a token.</div>
							</div>
							<button
								class="intercept-btn"
								onclick={onChallenge}
								disabled={myTokens <= 0}
								style="opacity: {myTokens > 0 ? 1 : 0.35}; cursor: {myTokens > 0
									? 'pointer'
									: 'default'}"
							>
								◈ {myTokens} · Intercept
							</button>
						</div>
					{/if}

					<div class="timeline-section">
						<div class="timeline-header">
							<div class="timeline-label">Your Timeline</div>
							<div class="timeline-count" aria-label="{myLength} of 10 cards">
								{myLength}<span style="opacity: 0.4">/10</span>
							</div>
						</div>

						{#if myLength === 0 && $phase !== 'reveal'}
							<div class="empty-timeline" aria-label="Empty timeline">
								<p class="empty-text">Your timeline is empty</p>
								<p class="empty-hint">Place cards here to build your sequence</p>
							</div>
						{:else}
							<Timeline
								cards={myTimeline}
								density={t.density}
								artStyle={t.artStyle}
								theme={t.theme}
								frozen={!myTurnAndPlacing}
								draggingActive={myTurnAndPlacing}
								hoverSlot={dragSlot}
								highlightSlot={$phase === 'reveal' &&
								$placedResult &&
								$activePlayerId === $myPlayerId
									? $placedSlot
									: null}
								wrongSlot={$phase === 'reveal' && !$placedResult && $activePlayerId === $myPlayerId
									? $placedSlot
									: null}
								onSlotClick={myTurnAndPlacing ? (i) => getStore().onPlace(i) : undefined}
								onSlotDragOver={myTurnAndPlacing ? (_e, i) => onSlotDragOver(_e, i) : undefined}
								onSlotDragLeave={myTurnAndPlacing ? (_e, i) => onSlotDragLeave(_e, i) : undefined}
								onSlotDrop={myTurnAndPlacing ? (_e, i) => onSlotDrop(_e, i) : undefined}
							/>
						{/if}

						{#if $phase === 'reveal'}
							{#if !isSpectator}
								<div class="next-btn-wrap">
									<button
										class="next-btn"
										style="background: {primary}; color: {paper}"
										onclick={onNextTurn}
									>
										Side B · Next Turn →
									</button>
								</div>
							{/if}
						{:else}
							<div style="height: 16px"></div>
						{/if}
					</div>
				</main>
			{/if}
		{/snippet}
	</Chrome>

	<TweaksPanel title="Tweaks · Songster">
		<TweakSection label="Theme" />
		<TweakRadio
			label="Mode"
			value={t.theme}
			options={[
				{ value: 'light', label: 'Paper' },
				{ value: 'dark', label: 'After-hours' },
			]}
			onchange={setTheme}
		/>
		<TweakRadio
			label="Card Art"
			value={t.artStyle}
			options={[
				{ value: 'grooves', label: 'Grooves' },
				{ value: 'halftone', label: 'Halftone' },
				{ value: 'solid', label: 'Solid' },
				{ value: 'inverse', label: 'Inverse' },
			]}
			onchange={setArtStyle}
		/>

		<TweakSection label="Motion" />
		<TweakRadio
			label="Flip"
			value={t.flipStyle}
			options={[
				{ value: 'flip', label: '3D' },
				{ value: 'slide', label: 'Slide' },
				{ value: 'fade', label: 'Fade' },
				{ value: 'instant', label: 'Cut' },
			]}
			onchange={setFlipStyle}
		/>
		<TweakSlider
			label="Anim intensity"
			value={t.animIntensity}
			min={0.3}
			max={2.5}
			step={0.1}
			onchange={(v) => tweaks.set('animIntensity', v)}
		/>

		<TweakSection label="Timeline" />
		<TweakRadio
			label="Density"
			value={t.density}
			options={[
				{ value: 'compact', label: 'Tight' },
				{ value: 'regular', label: 'Reg' },
				{ value: 'comfy', label: 'Airy' },
			]}
			onchange={setDensity}
		/>

		<TweakSection label="Rules" />
		<TweakToggle
			label="Interception tokens"
			value={t.interceptionEnabled}
			onchange={(v) => tweaks.set('interceptionEnabled', v)}
		/>
	</TweaksPanel>
</div>

<style>
	.page {
		min-height: 100vh;
		width: 100%;
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 20px;
	}
	.turn-label {
		font-family: 'IBM Plex Mono', monospace;
		font-size: 10px;
		letter-spacing: 2px;
		display: flex;
		gap: 8px;
	}
	.player-rail {
		display: flex;
		gap: 10px;
		padding: 10px 16px 12px;
		border-bottom: 0.5px solid var(--primary, #0a0a0a);
		overflow-x: auto;
		scrollbar-width: none;
	}
	.player-rail::-webkit-scrollbar {
		display: none;
	}
	.vinyl-section {
		padding: 20px 16px 8px;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 12px;
	}
	.phase-label {
		font-family: 'IBM Plex Mono', monospace;
		font-size: 10px;
		letter-spacing: 3px;
		opacity: 0.7;
		text-transform: uppercase;
		text-align: center;
	}
	.card-area {
		display: flex;
		justify-content: center;
		padding: 0 0 6px;
		min-height: 148px;
	}
	.card-wrapper {
		display: inline-block;
	}
	.card-reveal {
		animation: card-pop 300ms cubic-bezier(0.34, 1.56, 0.64, 1);
	}
	@keyframes card-pop {
		from {
			opacity: 0;
			transform: scale(0.9);
		}
		to {
			opacity: 1;
			transform: scale(1);
		}
	}
	.challenge-bar {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 8px 16px;
		background: rgba(128, 128, 128, 0.06);
		margin: 0 16px;
		border-radius: 6px;
	}
	.challenge-label {
		font-family: 'IBM Plex Mono', monospace;
		font-size: 11px;
		font-weight: 600;
		letter-spacing: 1px;
	}
	.challenge-text {
		font-size: 10px;
		opacity: 0.5;
	}
	.intercept-btn {
		background: none;
		border: 1.5px solid currentColor;
		padding: 6px 12px;
		border-radius: 4px;
		font-family: 'IBM Plex Mono', monospace;
		font-size: 10px;
		letter-spacing: 1px;
		cursor: pointer;
	}
	.timeline-section {
		flex: 1;
		display: flex;
		flex-direction: column;
		justify-content: flex-end;
	}
	.timeline-header {
		padding: 0 18px 2px;
		display: flex;
		justify-content: space-between;
		align-items: baseline;
	}
	.timeline-label {
		font-family: 'IBM Plex Mono', monospace;
		font-size: 9px;
		letter-spacing: 3px;
		opacity: 0.65;
		text-transform: uppercase;
	}
	.timeline-count {
		font-family: 'Playfair Display', serif;
		font-style: italic;
		font-size: 18px;
		font-weight: 700;
	}
	.empty-timeline {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 4px;
		padding: 24px 16px;
	}
	.empty-text {
		font-family: 'IBM Plex Mono', monospace;
		font-size: 11px;
		opacity: 0.5;
	}
	.empty-hint {
		font-family: 'IBM Plex Mono', monospace;
		font-size: 9px;
		opacity: 0.35;
	}
	.next-btn-wrap {
		padding: 4px 16px 16px;
	}
	.next-btn {
		width: 100%;
		padding: 14px;
		border: none;
		border-radius: 4px;
		font-family: 'IBM Plex Mono', monospace;
		font-size: 11px;
		letter-spacing: 4px;
		text-transform: uppercase;
		font-weight: 600;
		cursor: pointer;
	}
	.loading-game {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 16px;
		padding: 24px 16px;
	}
	.loading-vinyl {
		padding: 16px 0;
	}
	@media (max-width: 480px) {
		.page {
			padding: 8px;
		}
		.player-rail {
			gap: 6px;
			padding: 8px 12px;
		}
		.vinyl-section {
			padding: 12px 12px 4px;
		}
		.card-area {
			min-height: 120px;
		}
		.challenge-bar {
			flex-direction: column;
			gap: 8px;
			text-align: center;
			margin: 0 8px;
			padding: 10px 12px;
		}
		.timeline-header {
			padding: 0 12px 2px;
		}
		.next-btn-wrap {
			padding: 4px 12px 12px;
		}
		.next-btn {
			padding: 12px;
			font-size: 10px;
			letter-spacing: 3px;
		}
	}
	@media (max-width: 360px) {
		.turn-label {
			font-size: 9px;
		}
		.phase-label {
			font-size: 9px;
			letter-spacing: 2px;
		}
	}
	@media (prefers-reduced-motion: reduce) {
		.card-reveal {
			animation: none;
		}
		.next-btn,
		.intercept-btn {
			transition: none;
		}
	}
</style>
