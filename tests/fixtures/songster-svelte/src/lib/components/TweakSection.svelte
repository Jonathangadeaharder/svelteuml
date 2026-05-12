<script lang="ts">
	let { label }: { label: string } = $props();
</script>

<div class="twk-sect">{label}</div>

<style>
	.twk-sect {
		font-size: 10px; font-weight: 600; letter-spacing: .06em;
		text-transform: uppercase; color: rgba(41,38,27,.45); padding: 10px 0 0;
	}
	.twk-sect:first-child { padding-top: 0; }
</style>
