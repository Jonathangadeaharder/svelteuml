<script lang="ts">
	let {
		bars = 42,
		height = 32,
		playing = false,
		intensity = 1,
		audioElement = null as HTMLAudioElement | null,
	}: {
		bars?: number;
		height?: number;
		playing?: boolean;
		intensity?: number;
		audioElement?: HTMLAudioElement | null;
	} = $props();

	let canvas: HTMLCanvasElement | null = $state(null);
	let ctx: CanvasRenderingContext2D | null = $state(null);
	let analyser: AnalyserNode | null = $state(null);
	let animationId: number | null = $state(null);
	let reducedMotion = $state(false);

	$effect(() => {
		reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
	});

	$effect(() => {
		if (playing && audioElement && !reducedMotion) {
			setupAnalyser();
		} else {
			stopAnimation();
		}
	});

	function setupAnalyser() {
		if (!audioElement || !canvas) return;
		const audioCtx = new AudioContext();
		const source = audioCtx.createMediaElementSource(audioElement);
		analyser = audioCtx.createAnalyser();
		analyser.fftSize = 64;
		source.connect(analyser);
		analyser.connect(audioCtx.destination);
		ctx = canvas.getContext('2d');
		draw();
	}

	function draw() {
		if (!analyser || !ctx || !canvas) return;
		const bufferLength = analyser.frequencyBinCount;
		const dataArray = new Uint8Array(bufferLength);
		analyser.getByteFrequencyData(dataArray);

		ctx.clearRect(0, 0, canvas.width, canvas.height);
		const barWidth = canvas.width / bars;

		for (let i = 0; i < bars; i++) {
			const value = dataArray[i % bufferLength];
			const barHeight = (value / 255) * canvas.height;
			ctx.fillStyle = `rgba(100, 100, 100, ${0.2 + (value / 255) * 0.6})`;
			ctx.fillRect(i * barWidth, canvas.height - barHeight, barWidth - 1, barHeight);
		}

		animationId = requestAnimationFrame(draw);
	}

	function stopAnimation() {
		if (animationId) {
			cancelAnimationFrame(animationId);
			animationId = null;
		}
	}
</script>

<canvas bind:this={canvas} width={bars * 4} {height} class:reduced={reducedMotion}></canvas>

<style>
	canvas {
		display: block;
		width: 100%;
	}
	.reduced {
		opacity: 0.4;
	}
</style>
