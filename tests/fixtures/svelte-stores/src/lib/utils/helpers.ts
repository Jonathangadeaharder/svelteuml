export function formatDate(date: Date): string {
	return date.toISOString().split('T')[0];
}

export function debounce<T extends (...args: unknown[]) => void>(fn: T, ms: number): T {
	let timer: ReturnType<typeof setTimeout>;
	return ((...args: unknown[]) => {
		clearTimeout(timer);
		timer = setTimeout(() => fn(...args), ms);
	}) as unknown as T;
}
