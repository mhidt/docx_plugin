import {App, DropdownComponent, PluginSettingTab, Setting, TextComponent, ToggleComponent} from "obsidian";
import DocxPlugin from "./main";

type SettingKey = keyof DocxPluginSettings;

export interface DocxPluginSettings {
	fontSize: number;
	lineSpacing: number;
	firstLineIndent: number;
	marginTop: number;
	marginBottom: number;
	marginLeft: number;
	marginRight: number;
	chapterFontSize: number;
	chapterBold: boolean;
	chapterAlignment: string;
	chapterIndent: boolean;
	paragraphFontSize: number;
	paragraphBold: boolean;
	paragraphAlignment: string;
	paragraphIndent: boolean;
	aiApiKey: string;
	aiModel: string;
	aiSystemPromptFull: string;
	aiSystemPromptPartial: string;
}

export const DEFAULT_SETTINGS: DocxPluginSettings = {
	fontSize: 14,
	lineSpacing: 1.5,
	firstLineIndent: 1.25,
	marginTop: 20,
	marginBottom: 20,
	marginLeft: 30,
	marginRight: 20,
	chapterFontSize: 16,
	chapterBold: true,
	chapterAlignment: "center",
	chapterIndent: false,
	paragraphFontSize: 14,
	paragraphBold: true,
	paragraphAlignment: "justified",
	paragraphIndent: true,
	aiApiKey: "",
	aiModel: "deepseek/deepseek-chat-v3-0324:free",
	aiSystemPromptFull: "Ты — автор курсовых и дипломных работ. Пиши академическим языком на русском. Используй markdown-разметку: # для глав, ## для параграфов, --- для разрывов страниц. Структура: введение, главы с параграфами, заключение. Не используй жирный шрифт в заголовках.",
	aiSystemPromptPartial: "Ты дописываешь часть академической работы на русском языке. Сохраняй стиль и логику предыдущего текста. Пиши только запрошенный фрагмент, без лишних пояснений. Используй markdown-разметку.",
}

export class SampleSettingTab extends PluginSettingTab {
	plugin: DocxPlugin;

	constructor(app: App, plugin: DocxPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	private addNumber(containerEl: HTMLElement, name: string, key: SettingKey, desc?: string) {
		new Setting(containerEl).setName(name).setDesc(desc ?? "").addText((t: TextComponent) => t
			.setValue(String(this.plugin.settings[key]))
			.onChange(async (v) => {
				(this.plugin.settings[key] as number) = Number(v) || (DEFAULT_SETTINGS[key] as number);
				await this.plugin.saveSettings();
			}));
	}

	private addStringDropdown(containerEl: HTMLElement, name: string, key: SettingKey, options: Record<string, string>, desc?: string) {
		new Setting(containerEl).setName(name).setDesc(desc ?? "").addDropdown((d: DropdownComponent) => d
			.addOptions(options)
			.setValue(String(this.plugin.settings[key]))
			.onChange(async (v) => {
				(this.plugin.settings[key] as string) = v;
				await this.plugin.saveSettings();
			}));
	}

	private addDropdownSetting(containerEl: HTMLElement, name: string, key: SettingKey, options: Record<string, string>, desc?: string) {
		new Setting(containerEl).setName(name).setDesc(desc ?? "").addDropdown((d: DropdownComponent) => d
			.addOptions(options)
			.setValue(String(this.plugin.settings[key]))
			.onChange(async (v) => {
				(this.plugin.settings[key] as number) = Number(v);
				await this.plugin.saveSettings();
			}));
	}

	private addToggleSetting(containerEl: HTMLElement, name: string, key: SettingKey, desc?: string) {
		new Setting(containerEl).setName(name).setDesc(desc ?? "").addToggle((t: ToggleComponent) => t
			.setValue(this.plugin.settings[key] as boolean)
			.onChange(async (v) => {
				(this.plugin.settings[key] as boolean) = v;
				await this.plugin.saveSettings();
			}));
	}

	display(): void {
		const {containerEl} = this;

		containerEl.empty();

		// ── Шрифт ──
		containerEl.createEl("h3", {text: "Шрифт"});

		this.addDropdownSetting(containerEl, "Размер шрифта (пт)", "fontSize",
			{"12": "12", "13": "13", "14": "14", "16": "16"}, "Основной размер текста");
		this.addDropdownSetting(containerEl, "Межстрочный интервал", "lineSpacing",
			{"1": "Одинарный", "1.15": "1.15", "1.5": "Полуторный", "2": "Двойной"});
		this.addNumber(containerEl, "Абзацный отступ (мм)", "firstLineIndent", "Красная строка");

		// ── Заголовки глав ──
		containerEl.createEl("h3", {text: "Заголовки глав (#)"});

		this.addDropdownSetting(containerEl, "Размер шрифта (пт)", "chapterFontSize",
			{"14": "14", "16": "16", "18": "18"});
		this.addToggleSetting(containerEl, "Жирное начертание", "chapterBold");
		this.addStringDropdown(containerEl, "Выравнивание", "chapterAlignment",
			{"center": "По центру", "left": "По левому краю", "justified": "По ширине"});
		this.addToggleSetting(containerEl, "Абзацный отступ", "chapterIndent",
			"Красная строка у заголовков глав");

		// ── Заголовки параграфов ──
		containerEl.createEl("h3", {text: "Заголовки параграфов (##)"});

		this.addDropdownSetting(containerEl, "Размер шрифта (пт)", "paragraphFontSize",
			{"14": "14", "16": "16", "18": "18"});
		this.addToggleSetting(containerEl, "Жирное начертание", "paragraphBold");
		this.addStringDropdown(containerEl, "Выравнивание", "paragraphAlignment",
			{"center": "По центру", "left": "По левому краю", "justified": "По ширине"});
		this.addToggleSetting(containerEl, "Абзацный отступ", "paragraphIndent",
			"Красная строка у заголовков параграфов");

		// ── ИИ-генерация ──
		containerEl.createEl("h3", {text: "ИИ генерация"});

		new Setting(containerEl)
			.setName("API ключ")
			.setDesc("Можно получить на openrouter.ai/keys")
			.addText(t => {
				t.inputEl.type = "password";
				t.setValue(this.plugin.settings.aiApiKey)
				 .setPlaceholder("sk-or-...")
				 .onChange(async (v) => {
					this.plugin.settings.aiApiKey = v;
					await this.plugin.saveSettings();
				 });
			});

		new Setting(containerEl)
			.setName("Модель")
			.setDesc("ID модели OpenRouter")
			.addText(t => t
				.setValue(this.plugin.settings.aiModel)
				.setPlaceholder("deepseek/deepseek-chat-v3-0324:free")
				.onChange(async (v) => {
					this.plugin.settings.aiModel = v;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName("Системный промт (полная генерация)")
			.addTextArea(t => {
				t.inputEl.rows = 5;
				t.inputEl.style.width = "100%";
				t.setValue(this.plugin.settings.aiSystemPromptFull)
				 .onChange(async (v) => {
					this.plugin.settings.aiSystemPromptFull = v;
					await this.plugin.saveSettings();
				 });
			});

		new Setting(containerEl)
			.setName("Системный промт (генерация фрагмента)")
			.addTextArea(t => {
				t.inputEl.rows = 5;
				t.inputEl.style.width = "100%";
				t.setValue(this.plugin.settings.aiSystemPromptPartial)
				 .onChange(async (v) => {
					this.plugin.settings.aiSystemPromptPartial = v;
					await this.plugin.saveSettings();
				 });
			});
	}
}
