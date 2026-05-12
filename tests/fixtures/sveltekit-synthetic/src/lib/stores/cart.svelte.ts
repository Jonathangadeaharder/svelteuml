export interface CartItem {
	id: string;
	name: string;
	quantity: number;
}

let items = $state<CartItem[]>([]);

export function addItem(item: CartItem) {
	items.push(item);
}

export function removeItem(id: string) {
	const existing = items.findIndex((i) => i.id === id);
	if (existing >= 0) items.splice(existing, 1);
}

export function clearCart() {
	items.length = 0;
}

export const cart = $state<{ length: number }>({
	get length() {
		return items.length;
	},
});
