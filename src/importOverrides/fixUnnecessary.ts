import * as vscode from "vscode";
import { tryExpandPropertyRange } from "../astUtils";
import {
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

			const vscodeDiags = unnecessaryOverrideDiagnostics.map((diag) => {
				const ret = new vscode.Diagnostic(
					diag.range,
					"Unnecessary override of imported template property",
					vscode.DiagnosticSeverity.Warning,
				);
				ret.code = DiagnosticType.UnnecessaryImportOverride;
				return ret;
			});
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
							if (!nodeAtDiag) return;
							try {
								const range = tryExpandPropertyRange(
									document,
									nodeAtDiag as any,
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
