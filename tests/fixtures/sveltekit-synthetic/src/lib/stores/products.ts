import { writable, derived } from "svelte/store";

export interface Product {
	id: string;
	name: string;
	price: number;
}

export const products = writable<Product[]>([]);

export const productCount = derived(products, ($products) => $products.length);

export function addProduct(product: Product) {
	products.update((p) => [...p, product]);
}
