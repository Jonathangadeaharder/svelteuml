<script lang="ts">
	let {
		width = '100%',
		height = '16px',
		borderRadius = '4px',
	}: {
		width?: string;
		height?: string;
		borderRadius?: string;
	} = $props();
</script>

<div
	class="skeleton"
	role="presentation"
	aria-hidden="true"
	style="width: {width}; height: {height}; border-radius: {borderRadius}"
></div>

<style>
	.skeleton {
		background: linear-gradient(
			90deg,
			rgba(128, 128, 128, 0.08) 25%,
			rgba(128, 128, 128, 0.16) 50%,
			rgba(128, 128, 128, 0.08) 75%
		);
		background-size: 200% 100%;
		animation: shimmer 1.5s ease-in-out infinite;
	}
	@media (prefers-reduced-motion: reduce) {
		.skeleton {
			animation: none;
		}
	}
	@keyframes shimmer {
		0% {
			background-position: 200% 0;
		}
		100% {
			background-position: -200% 0;
		}
	}
</style>
