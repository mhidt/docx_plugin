import { Editor, Notice } from "obsidian";
import { DocxPluginSettings } from "../settings";
import { streamCompletion } from "./client";
import { buildFullPrompt, buildPartialPrompt } from "./prompts";

export type GenerateMode = "full" | "partial";

export async function generate(
	editor: Editor,
	settings: DocxPluginSettings,
	mode: GenerateMode
): Promise<void> {
	const selected = editor.getSelection();
	if (!selected.trim()) {
		new Notice("Выделите текст: тему работы или задание для генерации");
		return;
	}

	const systemPrompt =
		mode === "full"
			? settings.aiSystemPromptFull
			: settings.aiSystemPromptPartial;

	const userMessage =
		mode === "full"
			? buildFullPrompt(selected)
			: buildPartialPrompt(editor.getValue(), selected);

	// Запоминаем позицию для вставки
	const anchor = editor.getCursor("anchor");
	const head = editor.getCursor("head");
	const from =
		anchor.line < head.line ||
		(anchor.line === head.line && anchor.ch <= head.ch)
			? anchor
			: head;

	// Удаляем выделенный текст (промт)
	editor.replaceSelection("");
	let insertPos = editor.posToOffset(from);

	const notice = new Notice("🤖 Генерация...", 0);
	let buffer = "";
	let flushTimer: ReturnType<typeof setTimeout> | null = null;

	const flush = () => {
		if (!buffer) return;
		const text = buffer;
		buffer = "";

		editor.replaceRange(
			text,
			editor.offsetToPos(insertPos)
		);
		insertPos += text.length;
	};

	const scheduleFlush = () => {
		if (flushTimer) return;
		flushTimer = setTimeout(() => {
			flushTimer = null;
			flush();
		}, 100);
	};

	try {
		await streamCompletion({
			apiKey: settings.aiApiKey,
			model: settings.aiModel,
			systemPrompt,
			userMessage,
			onChunk: (chunk: string) => {
				buffer += chunk;
				scheduleFlush();
			},
		});

		// Финальный flush
		if (flushTimer) {
			clearTimeout(flushTimer);
			flushTimer = null;
		}
		flush();

		notice.hide();
		new Notice("✅ Генерация завершена!");
	} catch (e: any) {
		if (flushTimer) clearTimeout(flushTimer);
		flush();
		notice.hide();

		if (e.name === "AbortError") {
			new Notice("Генерация остановлена");
		} else {
			new Notice(`Ошибка генерации: ${e.message}`);
			console.error("AI generation error:", e);
		}
	}
}