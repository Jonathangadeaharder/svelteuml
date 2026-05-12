<script lang="ts">
	let {
		size = 190,
		spinning = false,
		label = 'SONGSTER',
		subLabel = '33⅓ RPM',
		intensity = 1,
	}: {
		size?: number;
		spinning?: boolean;
		label?: string;
		subLabel?: string;
		intensity?: number;
	} = $props();
	let safeIntensity = $derived(Math.max(0.1, intensity));
</script>

<div
	class="vinyl-wrap"
	style="width: {size}px; height: {size}px"
	role="img"
	aria-label="Record: {label}"
>
	<svg viewBox="0 0 200 200" class:spinning style="animation-duration: {2 / safeIntensity}s">
		<circle cx="100" cy="100" r="98" fill="currentColor" opacity="0.05" />
		<circle
			cx="100"
			cy="100"
			r="80"
			fill="none"
			stroke="currentColor"
			stroke-width="0.3"
			opacity="0.15"
		/>
		<circle
			cx="100"
			cy="100"
			r="65"
			fill="none"
			stroke="currentColor"
			stroke-width="0.3"
			opacity="0.1"
		/>
		<circle
			cx="100"
			cy="100"
			r="50"
			fill="none"
			stroke="currentColor"
			stroke-width="0.3"
			opacity="0.15"
		/>
		<circle cx="100" cy="100" r="30" fill="currentColor" opacity="0.08" />
		<circle cx="100" cy="100" r="4" fill="currentColor" opacity="0.3" />
		<text
			x="100"
			y="90"
			text-anchor="middle"
			font-family="'IBM Plex Mono', monospace"
			font-size="8"
			letter-spacing="3"
			fill="currentColor"
			opacity="0.7">{label}</text
		>
		<text
			x="100"
			y="104"
			text-anchor="middle"
			font-family="'IBM Plex Mono', monospace"
			font-size="6"
			letter-spacing="2"
			fill="currentColor"
			opacity="0.4">{subLabel}</text
		>
	</svg>
</div>

<style>
	.vinyl-wrap {
		position: relative;
		display: flex;
		align-items: center;
		justify-content: center;
	}
	svg {
		width: 100%;
		height: 100%;
	}
	.spinning {
		animation: spin linear infinite;
	}
	@keyframes spin {
		to {
			transform: rotate(360deg);
		}
	}
	@media (prefers-reduced-motion: reduce) {
		.spinning {
			animation: none;
		}
	}
</style>
