export function switchCase(text: string): string {
	switch (text) {
		case text.toUpperCase():
			return text.toLowerCase();
		case capitalize(text):
			return text.toUpperCase();
		default:
			return capitalize(text);
	}
}

export function capitalize(text: string): string {
	return text[0]?.toUpperCase() + text.slice(1).toLowerCase();
}

export function isImage(line: string): boolean {
	return line.startsWith("![[") && line.endsWith("]]");
}