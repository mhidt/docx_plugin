import {
	Document,
	Paragraph,
	TextRun,
	TableOfContents,
} from "docx";
import { DataAdapter } from "obsidian";
import { DocxPluginSettings } from "./settings";
import getFormatting from "./formatting";
import { renderImage } from "./images";
import { formatSource } from "./sources";
import { isImage } from "./utils";

const EXCLUSIONS = [
	"введение",
	"заключение",
	"список использованных источников",
	"содержание",
];

export async function buildDocument(
	markdown: string,
	settings: DocxPluginSettings,
	adapter: DataAdapter
): Promise<Document> {
	let pageBreakBefore = false,
		alignCenter = false,
		codeStyle = false,
		chapterNumber = 0,
		paragraphNumber = 0,
		pictureNumber = 0,
		sources: Promise<string>[] = [],
		numberedLists: string[][] = [[]];

	let promises = markdown.split("\n").map(async (line) => {
		if (line.startsWith("```")) {
			codeStyle = !codeStyle;
			return;
		}
		if (codeStyle) return buildCode(line);

		if (line.match(/\t*\d+?\. .+/)) {
			let item = line.split(". ", 2)[1] || "";
			const nestingLevel = (line.match(/\t/g) || []).length;
			numberedLists.last()?.push(item);
			return buildNumbering(item, numberedLists.length, nestingLevel);
		}

		if (line.startsWith("- ")) {
			return buildNumbering(line.slice(2), -1);
		}

		line = line.trim().replace("{img}", `(рис. ${pictureNumber + 1})`);

		if (line === "") return;
		if (line === "---") {
			pageBreakBefore = true;
			return;
		}

		if (numberedLists.last()?.length != 0) {
			numberedLists.push([]);
		}

		if (line.startsWith("#")) {
			let isChapter = line.startsWith("# ");
			line = line.replace(/#/g, "").trim();
			let counter;
			if (EXCLUSIONS.includes(line.toLowerCase())) {
				return buildHeader(line, true);
			}

			if (isChapter) {
				paragraphNumber = 0;
				counter = ++chapterNumber;
				pageBreakBefore = false;
			} else {
				counter = `${chapterNumber}.${++paragraphNumber}`;
			}
			return buildHeader(`${counter}. ${line}`, isChapter);
		}

		line = line.replace(/\[(.+)\]\((.+)\)/, (_, p1, p2) => {
			sources.push(formatSource(p2));
			return `${p1} [${sources.length}]`;
		});

		if (alignCenter) line = `Рисунок ${++pictureNumber}. ${line}`;
		let paragraph = buildText(line, alignCenter, pageBreakBefore, adapter);
		alignCenter = isImage(line);
		pageBreakBefore = false;
		return paragraph;
	});

	const children = [
		await buildText("Оглавление", true, true, adapter),
		new TableOfContents("Оглавление", {
			hyperlink: true,
			headingStyleRange: "1-2",
		}),
		...(await Promise.all(promises)),
		...(await buildSources(sources)),
	];

	let { properties, footers, styles, features, numbering } =
		getFormatting(settings);
	return new Document({
		numbering,
		features,
		styles: styles as any,
		sections: [
			{
				footers,
				properties: properties as any,
				children: children as any,
			},
		],
	});
}

async function buildText(
	text: string,
	alignCenter: boolean,
	pageBreakBefore: boolean,
	adapter: DataAdapter
): Promise<Paragraph> {
	let data: any = { pageBreakBefore };
	let image = await renderImage(text, adapter);
	data.children = [image || new TextRun({ text })];
	data.style = alignCenter || image ? "center" : "standard";
	return new Paragraph(data);
}

function buildCode(text: string): Paragraph {
	return new Paragraph({ text, style: "code" });
}

function buildHeader(text: string, isChapter: boolean): Paragraph {
	return new Paragraph({
		text,
		style: isChapter ? "chapter" : "paragraph",
		pageBreakBefore: isChapter,
	});
}

async function buildSources(
	sources: Promise<string>[]
): Promise<Paragraph[]> {
	let items = await Promise.all(sources);
	let paragraphs = items.map((item) => buildNumbering(item, 0));
	let header = buildHeader("Список литературы", true);
	return [header, ...paragraphs];
}

function buildNumbering(
	text: string,
	instance: number,
	level: number = 0
): Paragraph {
	let isBullets = instance < 0;
	let numbering = {
		level,
		reference: isBullets ? "bullet-points" : "base-numbering",
		instance,
	};
	return new Paragraph({
		text,
		numbering,
		style: instance === 0 ? "normal" : "standard",
	});
}