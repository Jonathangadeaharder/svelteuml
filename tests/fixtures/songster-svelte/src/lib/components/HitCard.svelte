<script lang="ts">
	import type { Song, ArtStyle, FlipStyle, Theme } from '$lib/types';

	let {
		song,
		faceDown = false,
		size = 'md',
		artStyle = 'grooves',
		flipStyle = 'instant',
		theme = 'light',
		correct,
		styleExtra = '',
	}: {
		song: Song;
		faceDown?: boolean;
		size?: 'sm' | 'md';
		artStyle?: ArtStyle;
		flipStyle?: FlipStyle;
		theme?: Theme;
		correct?: boolean;
		styleExtra?: string;
	} = $props();

	let sizeMap = { sm: { w: 70, h: 96 }, md: { w: 100, h: 140 } };
	let { w, h } = $derived(sizeMap[size]);
</script>

<div
	class="card-outer"
	class:face-down={faceDown}
	class:correct={correct === true}
	class:wrong={correct === false}
	style="width: {w}px; height: {h}px; {styleExtra}"
>
	{#if !faceDown}
		<div class="card-front card-face">
			<div class="card-label">Songster</div>
			<div
				class="card-art"
				class:grooves={artStyle === 'grooves'}
				class:halftone={artStyle === 'halftone'}
				class:solid={artStyle === 'solid'}
				class:inverse={artStyle === 'inverse'}
			>
				{#if artStyle === 'grooves'}
					<svg viewBox="0 0 40 40" style="width: 100%; height: 100%">
						<circle
							cx="20"
							cy="20"
							r="18"
							fill="none"
							stroke="currentColor"
							stroke-width="0.5"
							opacity="0.2"
						/>
						<circle
							cx="20"
							cy="20"
							r="14"
							fill="none"
							stroke="currentColor"
							stroke-width="0.5"
							opacity="0.15"
						/>
						<circle
							cx="20"
							cy="20"
							r="10"
							fill="none"
							stroke="currentColor"
							stroke-width="0.5"
							opacity="0.2"
						/>
						<circle
							cx="20"
							cy="20"
							r="6"
							fill="none"
							stroke="currentColor"
							stroke-width="0.5"
							opacity="0.15"
						/>
						<circle cx="20" cy="20" r="2" fill="currentColor" opacity="0.2" />
					</svg>
				{:else if artStyle === 'halftone'}
					<div class="halftone-dots"></div>
				{:else if artStyle === 'solid'}
					<div class="solid-fill"></div>
				{:else}
					<div class="inverse-fill"></div>
				{/if}
			</div>
			<div class="card-info">
				<div class="card-num">No. {String(song.num).padStart(2, '0')}</div>
				<div class="card-year">{song.year}</div>
			</div>
			<div class="card-title">{song.title}</div>
			<div class="card-artist">{song.artist}</div>
		</div>
	{:else}
		<div class="card-back card-face">
			<div class="card-label">Songster</div>
			<div class="card-num">No. {String(song.num).padStart(2, '0')}</div>
		</div>
	{/if}
</div>

<style>
	.card-outer {
		border: 1.5px solid currentColor;
		border-radius: 6px;
		overflow: hidden;
		position: relative;
		background: var(--bg, transparent);
		transition:
			transform 0.3s,
			box-shadow 0.3s;
		perspective: 800px;
	}
	.card-outer.face-down {
		transform-style: preserve-3d;
	}
	.card-outer:not(.face-down) {
		animation: card-flip-in 400ms cubic-bezier(0.22, 1, 0.36, 1);
	}
	@keyframes card-flip-in {
		from {
			opacity: 0;
			transform: rotateY(90deg);
		}
		to {
			opacity: 1;
			transform: rotateY(0deg);
		}
	}
	.card-outer.correct {
		box-shadow:
			0 0 0 2px #34c759,
			0 4px 12px rgba(52, 199, 89, 0.3);
	}
	.card-outer.wrong {
		box-shadow:
			0 0 0 2px #ff3b30,
			0 4px 12px rgba(255, 59, 48, 0.3);
	}
	.card-face {
		display: flex;
		flex-direction: column;
		align-items: center;
		padding: 6px;
		gap: 2px;
		height: 100%;
	}
	.card-label {
		font-family: 'IBM Plex Mono', monospace;
		font-size: 8px;
		letter-spacing: 3px;
		text-transform: uppercase;
		opacity: 0.5;
	}
	.card-art {
		flex: 1;
		width: 100%;
		display: flex;
		align-items: center;
		justify-content: center;
		opacity: 0.6;
	}
	.halftone-dots {
		width: 100%;
		height: 100%;
		background-image: radial-gradient(circle, currentColor 1px, transparent 1px);
		background-size: 4px 4px;
		opacity: 0.3;
	}
	.solid-fill {
		width: 80%;
		height: 80%;
		background: currentColor;
		opacity: 0.08;
		border-radius: 4px;
	}
	.inverse-fill {
		width: 80%;
		height: 80%;
		border: 2px solid currentColor;
		opacity: 0.2;
		border-radius: 4px;
	}
	.card-info {
		display: flex;
		justify-content: space-between;
		width: 100%;
	}
	.card-num {
		font-family: 'IBM Plex Mono', monospace;
		font-size: 8px;
		letter-spacing: 1px;
		opacity: 0.5;
	}
	.card-year {
		font-family: 'IBM Plex Mono', monospace;
		font-size: 9px;
		font-weight: 600;
		opacity: 0.8;
	}
	.card-title {
		font-family: 'Playfair Display', serif;
		font-size: 11px;
		font-weight: 700;
		text-align: center;
		line-height: 1.2;
	}
	.card-artist {
		font-family: 'IBM Plex Mono', monospace;
		font-size: 8px;
		letter-spacing: 1px;
		text-transform: uppercase;
		opacity: 0.5;
		text-align: center;
	}
	.card-back.card-face {
		justify-content: center;
	}
	@media (prefers-reduced-motion: reduce) {
		.card-outer {
			transition: none;
		}
		.card-outer:not(.face-down) {
			animation: none;
		}
	}
</style>
