import * as vscode from "vscode";
import {
	LanguageService as JsonLanguageService,
	TextDocument,
} from "vscode-json-languageservice";

import {
	nodeIsPropertyNameOrValue,
	parseImportSpecifier,
	rangeFromNode,
	resolveTemplate,
} from "./shared";

export function register(
	workspace: vscode.WorkspaceFolder,
	context: vscode.ExtensionContext,
	ls: JsonLanguageService,
) {
	vscode.commands.registerTextEditorCommand(
		"zwave-js.inlineTemplate",
		(
			textEditor,
			edit,
			range: vscode.Range,
			template: Record<string, any>,
		) => {
			edit.replace(
				range,
				JSON.stringify(template, undefined, "\t")
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
					.join("\n"),
			);
		},
	);

	return vscode.languages.registerCodeLensProvider(
		{
			language: "jsonc",
			pattern: new vscode.RelativePattern(
				workspace.uri,
				"packages/config/config/devices/*/*.json",
			),
		},
		{
			async provideCodeLenses(document, token) {
				const textDoc = TextDocument.create(
					document.uri.toString(),
					"jsonc",
					1,
					document.getText(),
				);
				const jsonDoc = ls.parseJSONDocument(textDoc);
				const symbols = ls.findDocumentSymbols(textDoc, jsonDoc);

				const ret: vscode.CodeLens[] = [];

				const importStatements = symbols.filter(
					(s) => s.name === "$import",
				);
				for (const imp of importStatements) {
					const node = jsonDoc.getNodeFromOffset(
						document.offsetAt(
							new vscode.Position(
								imp.location.range.start.line,
								imp.location.range.start.character,
							),
						),
					);

					if (!nodeIsPropertyNameOrValue(node)) {
						continue;
					}
					const value = node.parent.valueNode?.value;
					if (typeof value !== "string" || !value) {
						continue;
					}

					const spec = parseImportSpecifier(value);
					if (!spec) {
						continue;
					}

					try {
						const template = await resolveTemplate(
							workspace,
							spec.filename,
							spec.templateKey,
						);
						if (!template) {
							continue;
						}

						delete template.$label;
						delete template.$description;

						const range = rangeFromNode(document, node.parent);
						ret.push(
							new vscode.CodeLens(range, {
								command: "zwave-js.inlineTemplate",
								title: "Inline Template",
								arguments: [range, template],
							}),
						);
					} catch {
						continue;
					}
				}

				return ret;
			},
		},
	);
}
