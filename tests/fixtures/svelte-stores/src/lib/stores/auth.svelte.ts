import { derived } from "svelte/store";
import { userStore } from "./user.svelte.js";

export const isLoggedIn = derived(userStore, ($user) => $user !== null);

export const userName = derived(userStore, ($user) => $user?.name ?? "Guest");

export function createAuthActions() {
	return {
		async login(email: string, _password: string) {
			userStore.login({ id: "1", name: email.split("@")[0], email });
		},
		logout() {
			userStore.logout();
		},
	};
}
