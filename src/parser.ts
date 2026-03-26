import { TextRun } from "docx";

interface RunStyle {
	bold?: boolean;
	italics?: boolean;
	strike?: boolean;
	highlight?: boolean;
	font?: string;
	size?: number;
}

interface Token {
	text: string;
	style: RunStyle;
}

const PATTERNS: { regex: RegExp; style: RunStyle }[] = [
	{ regex: /\*\*\*(.+?)\*\*\*/, style: { bold: true, italics: true } },
	{ regex: /\*\*(.+?)\*\*/, style: { bold: true } },
	{ regex: /\*(.+?)\*/, style: { italics: true } },
	{ regex: /~~(.+?)~~/, style: { strike: true } },
	{ regex: /`(.+?)`/, style: { font: "Courier New" } },
	{ regex: /==(.+?)==/, style: { highlight: true } },
];

export function parseInlineFormatting(text: string): TextRun[] {
	const tokens = tokenize(text, {});
	return tokens.map(
		(t) =>
			new TextRun({
				text: t.text,
				bold: t.style.bold,
				italics: t.style.italics,
				strike: t.style.strike,
				font: t.style.font ? { name: t.style.font } : undefined,
				highlight: t.style.highlight ? "yellow" : undefined,
			})
	);
}

function tokenize(text: string, inherited: RunStyle): Token[] {
	for (const pattern of PATTERNS) {
		const match = text.match(pattern.regex);
		if (!match || match.index === undefined) continue;

		const before = text.slice(0, match.index);
		const inner = match[1];
		const after = text.slice(match.index + match[0].length);

		const merged: RunStyle = { ...inherited, ...pattern.style };

		return [
			...tokenize(before, inherited),
			...tokenize(inner, merged),
			...tokenize(after, inherited),
		];
	}

	if (!text) return [];
	return [{ text, style: inherited }];
}