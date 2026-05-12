import { OpenAI } from "openai";
import type { ChatCompletionMessageParam } from "openai/resources/chat/completions";
import {
	AI_PROVIDER,
	GROQ_API_KEY,
	LOCAL_AI_BASE_URL,
	OPENROUTER_API_KEY,
} from "$env/static/private";

type AIProvider = "ollama" | "openrouter" | "groq" | "mini";

const PROVIDER_DEFAULTS: Record<AIProvider, { baseURL: string; model: string }> = {
	ollama: {
		baseURL: LOCAL_AI_BASE_URL || "http://localhost:11434/v1",
		model: "llama3.2",
	},
	openrouter: {
		baseURL: "https://openrouter.ai/api/v1",
		model: "openai/gpt-4.1-nano",
	},
	groq: {
		baseURL: "https://api.groq.com/openai/v1",
		model: "llama-3.3-70b-versatile",
	},
	mini: {
		baseURL: LOCAL_AI_BASE_URL || "http://localhost:11434/v1",
		model: "phi",
	},
};

const PROVIDER_API_KEYS: Record<string, string> = {
	openrouter: OPENROUTER_API_KEY,
	groq: GROQ_API_KEY,
};

function resolveProvider(): AIProvider {
	const raw = (AI_PROVIDER || "ollama").toLowerCase().trim();
	if (["ollama", "openrouter", "groq", "mini"].includes(raw)) {
		return raw as AIProvider;
	}
	return "ollama";
}

function createClient(): OpenAI {
	const provider = resolveProvider();
	const config = PROVIDER_DEFAULTS[provider];

	const apiKey =
		provider === "ollama" || provider === "mini" ? "ollama" : PROVIDER_API_KEYS[provider];

	if (!apiKey) {
		throw new Error(
			`No API key configured for AI provider "${provider}". Set ${provider.toUpperCase()}_API_KEY in environment.`,
		);
	}

	return new OpenAI({ baseURL: config.baseURL, apiKey });
}

let _client: OpenAI | null = null;

function getClient(): OpenAI {
	if (!_client) {
		_client = createClient();
	}
	return _client;
}

export function resetClient(): void {
	_client = null;
}

export async function generate(
	prompt: string,
	options?: { model?: string; temperature?: number; max_tokens?: number },
): Promise<string> {
	const client = getClient();
	const provider = resolveProvider();
	const defaultConfig = PROVIDER_DEFAULTS[provider];

	const response = await client.chat.completions.create({
		model: options?.model ?? defaultConfig.model,
		messages: [{ role: "user", content: prompt }],
		temperature: options?.temperature ?? 0.7,
		max_tokens: options?.max_tokens ?? 256,
	});

	return response.choices[0]?.message?.content ?? "";
}

export async function embed(text: string, options?: { model?: string }): Promise<number[]> {
	const client = getClient();
	const provider = resolveProvider();

	if (provider === "groq") {
		throw new Error("Groq does not support embeddings. Use ollama, mini, or openrouter instead.");
	}

	const embeddingModel =
		provider === "mini" ? "nomic-embed-text" : (options?.model ?? "text-embedding-ada-002");

	const response = await client.embeddings.create({
		model: embeddingModel,
		input: text,
	});

	return response.data[0]?.embedding ?? [];
}

export async function chat(
	messages: ChatCompletionMessageParam[],
	options?: { model?: string; temperature?: number; max_tokens?: number },
): Promise<string> {
	const client = getClient();
	const provider = resolveProvider();
	const defaultConfig = PROVIDER_DEFAULTS[provider];

	const response = await client.chat.completions.create({
		model: options?.model ?? defaultConfig.model,
		messages,
		temperature: options?.temperature ?? 0.7,
		max_tokens: options?.max_tokens ?? 1024,
	});

	return response.choices[0]?.message?.content ?? "";
}

export function getProvider(): AIProvider {
	return resolveProvider();
}
