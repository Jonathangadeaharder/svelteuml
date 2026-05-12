declare module "$env/static/public" {
	export const PUBLIC_SUPABASE_URL: string;
	export const PUBLIC_SUPABASE_ANON_KEY: string;
	export const PUBLIC_POSTHOG_HOST: string;
	export const PUBLIC_POSTHOG_PROJECT_TOKEN: string;
}

declare module "$env/static/private" {
	export const SUPABASE_SERVICE_ROLE_KEY: string;
	export const AI_PROVIDER: string;
	export const LOCAL_AI_BASE_URL: string;
	export const PROD_AI_BASE_URL: string;
	export const OPENROUTER_API_KEY: string;
	export const GROQ_API_KEY: string;
}

export {};
