import { parse as parseJsonC } from "jsonc-parser";
import * as vscode from "vscode";
import { findSurroundingParamDefinition, rangeFromNode } from "../astUtils";
import { resolveJsonImports } from "../JsonTemplate";
import { My } from "../my";
import { PreviewPanel } from "../panels/Preview";

async function showInteractivePreview(my: My, position: vscode.Position) {
	if (!my.configDocument) return hideInteractivePreview();
	const node = my.configDocument.getNodeAtPosition(position);
	if (!node) return hideInteractivePreview();
	const param = findSurroundingParamDefinition(node);
	if (!param) return hideInteractivePreview();

	// We are inside a config parameter. Render it
	// FIXME: We should rewrite the JsonTemplate utility to operate on ASTs
	const text = my.configDocument.original.getText(
		rangeFromNode(my.configDocument.original, param),
	);
	const record = parseJsonC(text);
	let resolved: Record<string, unknown>;
	try {
		resolved = await resolveJsonImports(
			my.workspace,
			record,
			my.configDocument.original.fileName,
			[],
			new Map(),
		);
	} catch {
		// Probably an incorrect definition
		resolved = record;
	}

	const overwrittenProperties = param.properties
		.map((p) => p.keyNode.value)
		.filter((key) => key in resolved);

	await PreviewPanel.currentPanel?.ensureReady();
	PreviewPanel.currentPanel?.renderParam(resolved, overwrittenProperties);
}

function hideInteractivePreview(): void {
	PreviewPanel.currentPanel?.renderParam(undefined, undefined);
}

export function registerPreviewProvider(my: My): vscode.Disposable[] {
	const ret: vscode.Disposable[] = [];

	ret.push(
		my.onConfigDocumentChanged(async (change) => {
			if (change.type === "opened") {
				const pos = vscode.window.activeTextEditor?.selection?.active;
				if (pos) {
					await showInteractivePreview(my, pos);
				}
			}
		}),
	);

	ret.push(
		vscode.window.onDidChangeTextEditorSelection(async (e) => {
			// Ignore selections in editors that are not config files
			if (
				!my.configDocument?.original ||
				my.configDocument.original.fileName !==
					e.textEditor.document.fileName
			) {
				return hideInteractivePreview();
			}

			if (e.selections.length === 1) {
				const sel = e.selections[0];
				const position = sel.active;
				await showInteractivePreview(my, position);
			}
		}),
	);

	return ret;
}
