<script lang="ts">
	let { scale = 1 }: { scale?: number } = $props();
</script>

<svg viewBox="0 0 200 24" style="width: {scale * 200}px; height: {scale * 24}px" fill="none" xmlns="http://www.w3.org/2000/svg">
	<text x="0" y="18" font-family="'Playfair Display', serif" font-size="20" font-weight="700" font-style="italic" fill="currentColor">Songster</text>
</svg>
