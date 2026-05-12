<script lang="ts">
	import { toasts } from '$lib/stores/toast';
</script>

<div class="toast-container" role="status" aria-live="polite" aria-label="Notifications">
	{#each $toasts as toast (toast.id)}
		<div class="toast toast-{toast.type}">
			<span class="toast-icon">
				{#if toast.type === 'success'}✓{:else if toast.type === 'error'}✕{:else}ℹ{/if}
			</span>
			<span class="toast-msg">{toast.message}</span>
			<button
				class="toast-dismiss"
				onclick={() => toasts.dismiss(toast.id)}
				aria-label="Dismiss notification">✕</button
			>
		</div>
	{/each}
</div>

<style>
	.toast-container {
		position: fixed;
		bottom: 16px;
		left: 50%;
		transform: translateX(-50%);
		z-index: 10000;
		display: flex;
		flex-direction: column-reverse;
		gap: 8px;
		pointer-events: none;
		width: max-content;
		max-width: calc(100vw - 32px);
	}
	.toast {
		display: flex;
		align-items: center;
		gap: 8px;
		padding: 10px 14px;
		border-radius: 6px;
		font-family: 'IBM Plex Mono', monospace;
		font-size: 11px;
		letter-spacing: 1px;
		pointer-events: auto;
		animation: toast-in 220ms cubic-bezier(0.22, 1, 0.36, 1);
		box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
	}
	.toast-success {
		background: #1a7a33;
		color: #fff;
	}
	.toast-error {
		background: #b91c1c;
		color: #fff;
	}
	.toast-info {
		background: #1e293b;
		color: #fff;
	}
	.toast-icon {
		font-size: 13px;
		flex-shrink: 0;
	}
	.toast-msg {
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}
	.toast-dismiss {
		appearance: none;
		border: 0;
		background: transparent;
		color: inherit;
		opacity: 0.6;
		cursor: pointer;
		padding: 2px;
		font-size: 12px;
		line-height: 1;
		flex-shrink: 0;
	}
	.toast-dismiss:hover {
		opacity: 1;
	}
	@keyframes toast-in {
		from {
			opacity: 0;
			transform: translateY(8px) scale(0.96);
		}
		to {
			opacity: 1;
			transform: translateY(0) scale(1);
		}
	}
	@media (prefers-reduced-motion: reduce) {
		.toast {
			animation: none;
		}
	}
</style>
