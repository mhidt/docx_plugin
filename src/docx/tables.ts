import {
	Table,
	TableRow,
	TableCell,
	Paragraph,
	WidthType,
	BorderStyle,
	AlignmentType,
	convertMillimetersToTwip,
} from "docx";
import { parseInlineFormatting } from "./parser";

const CELL_MARGIN = {
	top: convertMillimetersToTwip(1),
	bottom: convertMillimetersToTwip(1),
	left: convertMillimetersToTwip(2.5),
	right: convertMillimetersToTwip(2.5),
};

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
		const isHeader = rowIndex === 0;
		const tableCells = Array.from({ length: colCount }, (_, i) => {
			const text = cells[i] || "";
			const runs = parseInlineFormatting(text, isHeader ? { bold: true } : {});

			return new TableCell({
				borders: CELL_BORDERS,
				margins: CELL_MARGIN,
				children: [
					new Paragraph({
						children: runs,
						alignment: AlignmentType.LEFT,
						spacing: { line: 240 },
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