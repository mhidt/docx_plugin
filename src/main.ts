import {
	MarkdownView,
	MenuItem,
	Notice,
	Plugin,
	setIcon,
	setTooltip,
} from "obsidian";
import {
	DEFAULT_SETTINGS,
	DocxPluginSettings,
	SampleSettingTab,
} from "./settings";
import { exportFile } from "./export";
import { switchCase } from "./utils";
import editorExtension from "./editorExtension";

export default class DocxPlugin extends Plugin {
	settings: DocxPluginSettings;
	mainIcon: string = "file-input";

	async onload() {
		await this.loadSettings();

		this.registerEvent(
			this.app.workspace.on("file-menu", (menu, file) => {
				if (!file.name.endsWith(".md")) return;
				menu.addItem((item: MenuItem) => {
					item.setTitle("Экспортировать в .docx")
						.setIcon(this.mainIcon)
						.onClick(() => this.handleExport());
				});
			})
		);

		this.addRibbonIcon(this.mainIcon, "Экспортировать в .docx", () =>
			this.handleExport()
		);

		this.addRibbonIcon("refresh-ccw", "Перезагрузить", () => {
			const pluginId = this.manifest.id;
			new Notice(`Перезагрузка ${pluginId}...`);
			// @ts-ignore
			if (this.app.plugins.plugins[pluginId]) {
				// @ts-ignore
				this.app.plugins.disablePlugin(pluginId);
				// @ts-ignore
				setTimeout(() => this.app.plugins.enablePlugin(pluginId), 100);
			}
			new Notice(`${pluginId} перезагружен!`);
		});

		const pagesCount = this.addStatusBarItem();
		pagesCount.setText("Страниц: ...");
		const calculatePages = this.addStatusBarItem();
		setIcon(calculatePages, this.mainIcon);
		setTooltip(calculatePages, "Пересчитать количество страниц");
		calculatePages.onclick = () => {
			const view = this.checkView();
			if (view == null) return;
			let pages = Math.round(view.editor.getValue().length / 1000);
			pagesCount.setText(`Страниц: ${pages || 1}`);
		};

		this.addCommand({
			id: "export-docx",
			name: "Экспортировать текущий файл в .docx",
			callback: () => this.handleExport(),
		});

		this.addCommand({
			id: "page-break",
			name: "Разрыв страницы",
			checkCallback: (checking: boolean) => {
				const editor = this.getEditor(checking);
				if (!editor) return false;
				const cursor = editor.getCursor();
				editor.replaceRange("\n\n---\n", cursor);
				const newPos = { line: cursor.line + 3, ch: 0 };
				editor.setCursor(newPos);
				return true;
			},
			hotkeys: [{ modifiers: ["Shift"], key: "enter" }],
		});

		this.addCommand({
			id: "change-register",
			name: "Изменить регистр",
			checkCallback: (checking: boolean) => {
				const editor = this.getEditor(checking);
				if (!editor) return false;
				let text = editor.getSelection();
				if (text.length === 0) return true;
				text = switchCase(text);
				const anchor = editor.getCursor("anchor");
				const head = editor.getCursor("head");
				editor.replaceSelection(text);
				editor.setSelection(anchor, head);
				return true;
			},
			hotkeys: [{ modifiers: ["Shift"], key: "f3" }],
		});

		this.addSettingTab(new SampleSettingTab(this.app, this));
		this.registerEditorExtension(editorExtension);
	}

	onunload() {}

	async loadSettings() {
		this.settings = {
			...DEFAULT_SETTINGS,
			...((await this.loadData()) as Partial<DocxPluginSettings>),
		};
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}

	handleExport() {
		const view = this.checkView();
		if (view == null) return;
		exportFile(this.app, this.settings, view);
	}

	checkView() {
		const view = this.app.workspace.getActiveViewOfType(MarkdownView);
		if (view == null) {
			new Notice("Нет открытого Markdown файла");
			return null;
		}
		return view;
	}

	getEditor(checking: boolean) {
		if (checking) return undefined;
		const view = this.checkView();
		if (view == null) return undefined;
		return view.editor;
	}
}