import * as vscode from "vscode";
import {
	LanguageService as JsonLanguageService,
	TextDocument,
} from "vscode-json-languageservice";

import {
	getConfigFileDocumentSelector,
	getTemplateDocumentSelector,
	nodeIsPropertyNameOrValue,
	parseImportSpecifier,
	rangeFromNode,
	resolveTemplate,
} from "./shared";

export function register(
	workspace: vscode.WorkspaceFolder,
	context: vscode.ExtensionContext,
	ls: JsonLanguageService,
): vscode.Disposable {
	return vscode.languages.registerCodeActionsProvider(
		[
			getConfigFileDocumentSelector(workspace),
			...getTemplateDocumentSelector(workspace),
		],
		{
			async provideCodeActions(document, range, _context, _token) {
				const textDoc = TextDocument.create(
					document.uri.toString(),
					"jsonc",
					1,
					document.getText(),
				);
				const jsonDoc = ls.parseJSONDocument(textDoc);
				const node = jsonDoc.getNodeFromOffset(
					document.offsetAt(range.start),
				);
				if (!nodeIsPropertyNameOrValue(node)) return;
				if (node.parent.keyNode.value !== "$import") return;

				const value = node.parent.valueNode?.value;
				if (typeof value !== "string" || !value) return;

				const spec = parseImportSpecifier(value);
				if (!spec) return;

				try {
					const template = await resolveTemplate(
						workspace,
						document.uri,
						spec.filename,
						spec.templateKey,
					);
					if (!template) return;

					delete template.$label;
					delete template.$description;

					const range = rangeFromNode(document, node.parent);
					const formatted = JSON.stringify(template, undefined, "\t")
						.slice(1, -1)
						.trim()
						.split("\n")
						.map((line, i) => {
							// All lines after the first need to be indented correctly
							if (i === 0) {
								return line;
							}
							return (
								"\t".repeat(range.start.character) +
								line.replace(/^\t/, "")
							);
						})
						.join("\n");
					const edit = new vscode.WorkspaceEdit();
					edit.replace(document.uri, range, formatted);

					return [
						{
							title: "Inline Template",
							kind: vscode.CodeActionKind.RefactorInline,
							edit,
						},
					];
				} catch {
					return;
				}
			},
		},
	);
}
