import {
	Table,
	TableRow,
	TableCell,
	Paragraph,
	WidthType,
	BorderStyle,
	AlignmentType,
} from "docx";
import { parseInlineFormatting } from "./parser";

const BORDER = {
	style: BorderStyle.SINGLE,
	size: 1,
	color: "000000",
};

const CELL_BORDERS = {
	top: BORDER,
	bottom: BORDER,
	left: BORDER,
	right: BORDER,
};

export function buildTable(lines: string[]): Table {
	const parsed = lines
		.filter((line) => !isSeparatorRow(line))
		.map(parseCells);

	if (parsed.length === 0) {
		return new Table({ rows: [] });
	}

	const colCount = Math.max(...parsed.map((r) => r.length));

	const rows = parsed.map((cells, rowIndex) => {
		const tableCells = Array.from({ length: colCount }, (_, i) => {
			const text = cells[i] || "";
			return new TableCell({
				borders: CELL_BORDERS,
				children: [
					new Paragraph({
						children: parseInlineFormatting(text),
						alignment: AlignmentType.CENTER,
					}),
				],
			});
		});

		return new TableRow({ children: tableCells });
	});

	return new Table({
		rows,
		width: {
			size: 100,
			type: WidthType.PERCENTAGE,
		},
	});
}

function isSeparatorRow(line: string): boolean {
	const trimmed = line.replace(/\|/g, "").trim();
	return /^[\s\-:]+$/.test(trimmed);
}

function parseCells(line: string): string[] {
	return line
		.split("|")
		.slice(1, -1) // убираем пустые элементы по краям
		.map((cell) => cell.trim());
}