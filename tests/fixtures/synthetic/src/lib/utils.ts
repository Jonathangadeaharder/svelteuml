export function greet(name: string): string {
	return `Hello, ${name}!`;
}

export function formatPrice(amount: number): string {
	return `$${amount.toFixed(2)}`;
}

export function isPositive(n: number): boolean {
	return n > 0;
}

export const DEFAULT_PAGE_SIZE = 20;
