<script lang="ts">
	import type { Song, ArtStyle, Theme, Density } from '$lib/types';
	import { colors } from '$lib/utils';
	import HitCard from './HitCard.svelte';

	let {
		cards, density = 'regular' as Density, artStyle = 'grooves' as ArtStyle,
		theme = 'light' as Theme, frozen = false, draggingActive = false,
		hoverSlot = null as number | null, highlightSlot = null as number | null,
		wrongSlot = null as number | null, onSlotClick,
		onSlotDragOver, onSlotDragLeave, onSlotDrop,
	}: {
		cards: Song[]; density?: Density; artStyle?: ArtStyle; theme?: Theme;
		frozen?: boolean; draggingActive?: boolean;
		hoverSlot?: number | null; highlightSlot?: number | null; wrongSlot?: number | null;
		onSlotClick?: (index: number) => void;
		onSlotDragOver?: (e: DragEvent, index: number) => void;
		onSlotDragLeave?: (e: DragEvent, index: number) => void;
		onSlotDrop?: (e: DragEvent, index: number) => void;
	} = $props();

	let { primary } = $derived(colors(theme));

	function slotAriaLabel(i: number): string {
		if (highlightSlot === i) return `Slot ${i}, correct placement`;
		if (wrongSlot === i) return `Slot ${i}, wrong placement`;
		if (hoverSlot === i) return `Slot ${i}, drop target`;
		return `Slot ${i}`;
	}

	let cardSize = $derived(
		density === 'compact' ? { w: 52, h: 72 } :
		density === 'comfy' ? { w: 90, h: 120 } :
		{ w: 70, h: 96 }
	);
	let slotW = $derived(density === 'compact' ? 20 : density === 'comfy' ? 32 : 26);
	let slots = $derived(cards.length + 1);
</script>

<div class="timeline-scroll">
	<div class="tl-scroll-inner" style="height: {cardSize.h + 20}px">
		{#each Array(slots) as _, i}
			<button
				class="slot"
				aria-label={slotAriaLabel(i)}
				disabled={frozen || (!onSlotClick && !onSlotDrop)}
				onclick={onSlotClick ? () => onSlotClick(i) : undefined}
				ondragover={onSlotDragOver ? (e) => onSlotDragOver(e, i) : undefined}
				ondragleave={onSlotDragLeave ? (e) => onSlotDragLeave(e, i) : undefined}
				ondrop={onSlotDrop ? (e) => onSlotDrop(e, i) : undefined}
				style="width: {highlightSlot === i || wrongSlot === i || hoverSlot === i ? cardSize.w + 6 : (draggingActive ? slotW + 8 : slotW)}px; height: {cardSize.h}px"
			>
				<div class="slot-inner" style="width: {highlightSlot === i || wrongSlot === i || hoverSlot === i ? cardSize.w : Math.max(slotW - 8, 10)}px; height: {cardSize.h - 8}px; border: 1.5px {hoverSlot === i || highlightSlot === i ? 'solid' : 'dashed'} {wrongSlot === i ? '#0a0a0a' : primary}; background: {highlightSlot === i ? primary : hoverSlot === i ? 'rgba(10,10,10,0.06)' : 'transparent'}; opacity: {highlightSlot === i || wrongSlot === i || hoverSlot === i ? 1 : frozen ? 0.15 : draggingActive ? 0.7 : 0.4}">
					{#if hoverSlot === i}
						<span style="opacity: 0.6">DROP</span>
					{:else if wrongSlot === i}
						<span style="opacity: 0.9">✕</span>
					{/if}
				</div>
			</button>
			{#if i < cards.length}
				<div style="flex-shrink: 0">
					<HitCard song={cards[i]} faceDown={false} size="sm" {artStyle} flipStyle="instant" {theme} styleExtra="width: {cardSize.w}px; height: {cardSize.h}px" />
				</div>
			{/if}
		{/each}
	</div>
</div>

<style>
	.timeline-scroll {
		width: 100%;
		overflow-x: auto;
		overflow-y: visible;
		-webkit-overflow-scrolling: touch;
		padding: 12px 16px 16px;
		scrollbar-width: none;
	}
	.tl-scroll-inner {
		display: flex;
		align-items: center;
		gap: 0;
		min-width: max-content;
	}
	.slot {
		flex-shrink: 0;
		transition: width 220ms cubic-bezier(.7,.1,.3,1);
		display: flex;
		align-items: center;
		justify-content: center;
		position: relative;
		background: none;
		border: none;
		padding: 0;
		cursor: pointer;
	}
	.slot:disabled {
		cursor: default;
	}
	.slot-inner {
		border-radius: 4px;
		transition: all 200ms ease;
		display: flex;
		align-items: center;
		justify-content: center;
		font-family: 'IBM Plex Mono', monospace;
		font-size: 9px;
		letter-spacing: 2px;
		text-transform: uppercase;
	}
</style>
