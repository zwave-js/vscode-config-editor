import { parse as parseJsonC } from "jsonc-parser";
import * as vscode from "vscode";
import { findSurroundingParamDefinition, rangeFromNode } from "../astUtils";
import { resolveJsonImports } from "../JsonTemplate";
import { My } from "../my";
import { PreviewPanel } from "../panels/Preview";

export function registerPreviewProvider(my: My): vscode.Disposable[] {
	const ret: vscode.Disposable[] = [];
	ret.push(
		vscode.window.onDidChangeTextEditorSelection(async (e) => {
			const param = await (async () => {
				// Ignore selections in editors that are not config files
				if (!my.configDocument) return;
				if (
					my.configDocument.original.fileName !==
					e.textEditor.document.fileName
				) {
					return;
				}

				if (e.selections.length === 1) {
					const sel = e.selections[0];
					const position = sel.active;
					const node = my.configDocument.getNodeAtPosition(position);
					if (!node) return;
					const param = findSurroundingParamDefinition(node);
					if (!param) return;

					// We are inside a config parameter. Render it
					// FIXME: We should rewrite the JsonTemplate utility to operate on ASTs
					const text = my.configDocument.original.getText(
						rangeFromNode(my.configDocument.original, param),
					);
					const record = parseJsonC(text);
					const resolved = await resolveJsonImports(
						my.workspace,
						record,
						my.configDocument.original.fileName,
						[],
						new Map(),
					);

					const overwrittenProperties = param.properties
						.map((p) => p.keyNode.value)
						.filter((key) => key in resolved);

					return { resolved, overwrittenProperties };
				}
			})();

			PreviewPanel.currentPanel?.renderParam(
				param?.resolved,
				param?.overwrittenProperties,
			);
		}),
	);

	return ret;
}
