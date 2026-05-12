import { writable } from 'svelte/store';

export type ToastType = 'success' | 'error' | 'info';

export interface Toast {
	id: string;
	message: string;
	type: ToastType;
	duration: number;
}

const timers = new Map<string, ReturnType<typeof setTimeout>>();

function createToastStore() {
	const { subscribe, update } = writable<Toast[]>([]);

	return {
		subscribe,
		show(message: string, type: ToastType = 'info', duration = 3000) {
			const id = crypto.randomUUID();
			update((toasts) => [...toasts, { id, message, type, duration }]);
			if (duration > 0) {
				timers.set(
					id,
					setTimeout(() => this.dismiss(id), duration)
				);
			}
			return id;
		},
		success(message: string, duration?: number) {
			return this.show(message, 'success', duration);
		},
		error(message: string, duration?: number) {
			return this.show(message, 'error', duration ?? 5000);
		},
		info(message: string, duration?: number) {
			return this.show(message, 'info', duration);
		},
		dismiss(id: string) {
			const timer = timers.get(id);
			if (timer !== undefined) {
				clearTimeout(timer);
				timers.delete(id);
			}
			update((toasts) => toasts.filter((t) => t.id !== id));
		},
	};
}

export const toasts = createToastStore();
