import { requestUrl, Notice } from "obsidian";

const API_URL = "https://openrouter.ai/api/v1/chat/completions";

interface Message {
	role: "system" | "user" | "assistant";
	content: string;
}

interface ClientOptions {
	apiKey: string;
	model: string;
	systemPrompt: string;
	userMessage: string;
	onChunk: (text: string) => void;
	signal?: AbortSignal;
}

export async function streamCompletion(options: ClientOptions): Promise<void> {
	const { apiKey, model, systemPrompt, userMessage, onChunk, signal } =
		options;

	if (!apiKey) {
		new Notice("Укажите API ключ OpenRouter в настройках плагина");
		throw new Error("API key missing");
	}

	const messages: Message[] = [
		{ role: "system", content: systemPrompt },
		{ role: "user", content: userMessage },
	];

	// requestUrl в Obsidian не поддерживает стриминг,
	// используем fetch напрямую
	const response = await fetch(API_URL, {
		method: "POST",
		headers: {
			Authorization: `Bearer ${apiKey}`,
			"Content-Type": "application/json",
			"HTTP-Referer": "https://obsidian.md",
		},
		body: JSON.stringify({
			model,
			messages,
			stream: true,
		}),
		signal,
	});

	if (!response.ok) {
		const errorText = await response.text();
		new Notice(`Ошибка API: ${response.status}`);
		throw new Error(`OpenRouter API error: ${response.status} ${errorText}`);
	}

	const reader = response.body?.getReader();
	if (!reader) throw new Error("No response body");

	const decoder = new TextDecoder();
	let buffer = "";

	while (true) {
		const { done, value } = await reader.read();
		if (done) break;

		buffer += decoder.decode(value, { stream: true });
		const lines = buffer.split("\n");
		buffer = lines.pop() || "";

		for (const line of lines) {
			const trimmed = line.trim();
			if (!trimmed || !trimmed.startsWith("data: ")) continue;
			const data = trimmed.slice(6);
			if (data === "[DONE]") return;

			try {
				const parsed = JSON.parse(data);
				const delta = parsed.choices?.[0]?.delta?.content;
				if (delta) onChunk(delta);
			} catch {
				// пропускаем невалидные строки
			}
		}
	}
}