import * as vscode from "vscode";
import { ObjectPropertyASTNode, tryExpandPropertyRange } from "../astUtils";
import {
	AllowedMinMaxConflictDiagnostic,
	DiagnosticType,
	UnnecessaryImportOverrideDiagnostic,
} from "../diagnostics/diagnostics";
import { My } from "../my";

import { getConfigFileDocumentSelector } from "../shared";

export function register(my: My): vscode.Disposable[] {
	const { workspace } = my;

	const ret: vscode.Disposable[] = [];

	const importDiagnostics = vscode.languages.createDiagnosticCollection();
	ret.push(importDiagnostics);

	ret.push(
		my.onDiagnosticsChanged((diag) => {
			const activeEditor = vscode.window.activeTextEditor;
			if (!activeEditor) return;

			const unnecessaryOverrideDiagnostics = diag.filter(
				(d): d is UnnecessaryImportOverrideDiagnostic =>
					d.type === DiagnosticType.UnnecessaryImportOverride,
			);

			const allowedMinMaxConflictDiagnostics = diag.filter(
				(d): d is AllowedMinMaxConflictDiagnostic =>
					d.type === DiagnosticType.AllowedMinMaxConflict,
			);

			const vscodeDiags: vscode.Diagnostic[] = [];

			for (const diag of unnecessaryOverrideDiagnostics) {
				const d = new vscode.Diagnostic(
					diag.range,
					"Unnecessary override of imported template property",
					vscode.DiagnosticSeverity.Warning,
				);
				d.code = DiagnosticType.UnnecessaryImportOverride;
				vscodeDiags.push(d);
			}

			for (const diag of allowedMinMaxConflictDiagnostics) {
				const message = diag.localHasAllowed
					? `The "allowed" field cannot be used when the imported template defines "minValue" or "maxValue".`
					: `"minValue"/"maxValue" cannot be used when the imported template defines "allowed".`;
				const d = new vscode.Diagnostic(
					diag.range,
					message,
					vscode.DiagnosticSeverity.Error,
				);
				d.code = DiagnosticType.AllowedMinMaxConflict;
				vscodeDiags.push(d);
			}

			importDiagnostics.set(activeEditor.document.uri, vscodeDiags);
		}),
	);

	ret.push(
		vscode.languages.registerCodeActionsProvider(
			[
				getConfigFileDocumentSelector(workspace),
				// ...getTemplateDocumentSelector(workspace),
			],
			{
				provideCodeActions(document, range, context, _token) {
					return context.diagnostics
						.filter(
							(d) =>
								d.code ===
								DiagnosticType.UnnecessaryImportOverride,
						)
						.map((d) => {
							const nodeAtDiag =
								my.configDocument?.json.getNodeFromOffset(
									document.offsetAt(d.range.start),
								)?.parent;
							if (!nodeAtDiag || nodeAtDiag.type !== "property")
								return;
							try {
								const range = tryExpandPropertyRange(
									document,
									nodeAtDiag as ObjectPropertyASTNode,
								);

								const edit = new vscode.WorkspaceEdit();
								edit.delete(document.uri, range);

								const ret = new vscode.CodeAction(
									"Remove unnecessary override",
									vscode.CodeActionKind.QuickFix,
								);
								ret.edit = edit;
								ret.diagnostics = [d];
								ret.isPreferred = true;
								return ret;
							} catch (e) {
								console.error(e);
							}
						})
						.filter((d): d is vscode.CodeAction => d !== undefined);
				},
			},
		),
	);
	return ret;
}
