export function buildFullPrompt(topic: string): string {
	return `Тема работы: ${topic}`;
}

export function buildPartialPrompt(
	fullDocument: string,
	task: string
): string {
	return `Контекст всей работы:\n\n${fullDocument}\n\n---\n\nЗадание: ${task}`;
}