import { DataAdapter, Notice } from "obsidian";
import { ImageRun, Paragraph } from "docx";
import { isImage } from "../editor/utils";

export async function renderImage(
	text: string,
	adapter: DataAdapter
): Promise<ImageRun | Paragraph | null> {
	if (!isImage(text)) return null;
	const fileName = text.slice(3, -2);
	const buffer = await adapter.readBinary(fileName);

	try {
		let type = fileName.split(".").pop()?.toLowerCase();
		return new ImageRun({
			data: buffer,
			type: type as any,
			transformation: await getImageDimensions(fileName, adapter),
		});
	} catch (e) {
		new Notice("Не удалось загрузить изображение " + fileName);
		return new Paragraph("");
	}
}

function getImageDimensions(
	path: string,
	adapter: DataAdapter
): Promise<{ width: number; height: number }> {
	return new Promise((resolve, reject) => {
		const img = new Image();
		img.src = adapter.getResourcePath(path);
		img.onload = () => {
			let width = 400;
			let scale = width / img.width;
			let height = img.height * scale;
			resolve({ width, height });
		};
		img.onerror = () => reject();
	});
}