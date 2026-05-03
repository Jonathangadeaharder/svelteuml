import { writable } from "svelte/store";

interface User {
	name: string;
	email: string;
}

export const userStore = writable<User | null>(null);

export function setUser(user: User) {
	userStore.set(user);
}

export function clearUser() {
	userStore.set(null);
}
