import type { Song, Track } from '$lib/types';

class AudioManager {
	private audio: HTMLAudioElement | null = null;
	private abortController: AbortController | null = null;
	private mobileUnlocked = false;

	private unlockMobile(): void {
		if (this.mobileUnlocked) return;
		this.mobileUnlocked = true;
	}

	async play(track: Track): Promise<void> {
		this.stop();

		if (!track.preview_url) return;

		this.unlockMobile();

		this.abortController = new AbortController();
		const { signal } = this.abortController;

		/* c8 ignore next */
		if (signal.aborted) return;

		this.audio = new Audio(track.preview_url);
		this.audio.crossOrigin = 'anonymous';
		this.audio.volume = 0;

		try {
			await this.audio.play();
			await this.fadeVolume(this.audio, 0.8, 200);
		} catch {
			/* autoplay block or abort */
		}
	}

	stop(): void {
		if (this.abortController) {
			this.abortController.abort();
			this.abortController = null;
		}
		if (this.audio) {
			this.audio.pause();
			this.audio.src = '';
			this.audio = null;
		}
	}

	preload(tracks: Track[]): void {
		const toPreload = tracks.slice(0, 3);
		for (const track of toPreload) {
			if (!track.preview_url) continue;
			const a = new Audio(track.preview_url);
			a.preload = 'auto';
		}
	}

	private fadeVolume(audio: HTMLAudioElement, target: number, duration: number): Promise<void> {
		return new Promise((resolve) => {
			const start = audio.volume;
			const startTime = performance.now();

			const step = (now: number) => {
				const elapsed = now - startTime;
				const t = Math.min(elapsed / duration, 1);
				audio.volume = start + (target - start) * t;
				if (t < 1) {
					requestAnimationFrame(step);
				} else {
					resolve();
				}
			};
			requestAnimationFrame(step);
		});
	}
}

export const audioManager = new AudioManager();

// Compatibility wrappers for legacy Song-based API
export function playPreview(song: Song): Promise<void> {
	const track: Track = {
		...song,
		deezer_id: 0,
		preview_url: '',
		cover_small: null,
		cover_medium: null,
		duration: 30,
	};
	return audioManager.play(track);
}

export function stopPreview(): void {
	audioManager.stop();
}

export function preloadPreviews(_songs: Song[]): void {
	// No-op: static songs don't have preview URLs
}
