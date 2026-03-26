import { EditorView, ViewUpdate } from "@codemirror/view";
import { EditorSelection, Text, Transaction } from "@codemirror/state";

const OPEN = "«";
const CLOSE = "»";

interface QuoteChange {
	fromB: number;
	toB: number;
	selectedText: string;
}

export default EditorView.updateListener.of((update) => {
	for (const tr of update.transactions) {
		const event = tr.annotation(Transaction.userEvent);
		if (event === "input.type") onType(update, tr);
		else if (event === "delete.backward") onDelete(update, tr);
	}
});

function findQuoteChange(tr: Transaction): QuoteChange | null {
	const oldDoc = tr.startState.doc;
	let result: QuoteChange | null = null;

	tr.changes.iterChanges((fromA, toA, fromB, toB, inserted) => {
		if (!inserted.toString().includes('"')) return;
		result = {
			fromB,
			toB,
			selectedText: toA > fromA ? oldDoc.sliceString(fromA, toA) : "",
		};
	});

	return result;
}

function hasUnclosedQuote(doc: Text, pos: number): boolean {
	const line = doc.lineAt(pos);
	const before = doc.sliceString(line.from, pos);
	let depth = 0;
	for (const ch of before) {
		if (ch === OPEN) depth++;
		else if (ch === CLOSE) depth--;
	}
	return depth > 0;
}

function onType(update: ViewUpdate, tr: Transaction) {
	const change = findQuoteChange(tr);
	if (!change) return;

	const { state } = update.view;
	const { fromB, toB, selectedText } = change;

	let insert: string;
	let cursorPos: number;

	if (selectedText) {
		insert = `${OPEN}${selectedText}${CLOSE}`;
		cursorPos = fromB + selectedText.length + 2;
	} else {
		const charAfter = state.doc.sliceString(toB, toB + 1);

		if (charAfter === CLOSE) {
			// Перепрыгнуть через существующую »
			insert = "";
			cursorPos = fromB + 1;
		} else if (hasUnclosedQuote(state.doc, fromB)) {
			// Закрыть незакрытую кавычку
			insert = CLOSE;
			cursorPos = fromB + 1;
		} else {
			// Открывающая: пара только если после — пусто/пробел
			const pair = !charAfter || /\s/.test(charAfter);
			insert = pair ? OPEN + CLOSE : OPEN;
			cursorPos = fromB + 1;
		}
	}

	update.view.dispatch(state.update({
		changes: { from: fromB, to: toB, insert },
		selection: EditorSelection.cursor(cursorPos),
	}));
}

function onDelete(update: ViewUpdate, tr: Transaction) {
	const oldDoc = tr.startState.doc;
	let deletePos: number | null = null;

	tr.changes.iterChanges((fromA, toA, fromB) => {
		if (oldDoc.sliceString(fromA, toA) === OPEN &&
			oldDoc.sliceString(toA, toA + 1) === CLOSE) {
			deletePos = fromB;
		}
	});

	if (deletePos == null) return;

	update.view.dispatch(update.view.state.update({
		changes: { from: deletePos, to: deletePos + 1, insert: "" },
	}));
}
