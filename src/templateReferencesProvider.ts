import * as vscode from "vscode";
import {
	LanguageService as JsonLanguageService,
	TextDocument,
} from "vscode-json-languageservice";

import {
	findConfigFiles,
	getPropertyNameFromNode,
	getTemplateDocumentSelector,
	nodeIsPropertyNameOrValue,
	parseImportSpecifier,
	readTextFile,
	resolveTemplateFile,
} from "./shared";

export function register(
	workspace: vscode.WorkspaceFolder,
	context: vscode.ExtensionContext,
	ls: JsonLanguageService,
) {
	return vscode.languages.registerReferenceProvider(
		getTemplateDocumentSelector(workspace),
		{
			async provideReferences(document, position, context, token) {
				const templateFilename = document.uri.toString();

				const jsonDoc = ls.parseJSONDocument(document as any);
				const node = jsonDoc.getNodeFromOffset(
					document.offsetAt(position),
				);

				const ret: vscode.Location[] = [];

				// We're only looking for top-level properties in the template files
				if (
					nodeIsPropertyNameOrValue(node) &&
					node.parent.valueNode?.type === "object" &&
					node.parent.parent &&
					!node.parent.parent.parent
				) {
					const templateName = getPropertyNameFromNode(node);
					console.log("Looking for references to", templateName);

					const configFiles = await findConfigFiles(
						workspace,
						true,
						true,
					);

					for (const file of configFiles) {
						const fileContent = await readTextFile(file);
						const textDoc = TextDocument.create(
							file.toString(),
							"jsonc",
							1,
							fileContent,
						);
						const jsonDoc = ls.parseJSONDocument(textDoc);

						const symbols = ls.findDocumentSymbols(
							textDoc,
							jsonDoc,
						);
						const references = symbols
							.filter((s) => s.name === "$import")
							.filter((s) => {
								// Analyze all $imports, only look at valid ones
								const node = jsonDoc.getNodeFromOffset(
									textDoc.offsetAt(s.location.range.start),
								);
								if (!nodeIsPropertyNameOrValue(node))
									return false;
								const value = node.parent.valueNode?.value;
								if (typeof value !== "string") return false;

								// which have an import specifier
								const spec = parseImportSpecifier(value);
								if (!spec) return false;
								// that matches the key we're searching references for
								if (spec.templateKey !== templateName)
									return false;
								// and which target the correct file
								const uri = resolveTemplateFile(
									workspace,
									file,
									spec.filename,
								);
								return uri.toString() === templateFilename;
							});

						ret.push(
							...references.map(
								(r) =>
									new vscode.Location(
										file,
										r.location.range as any,
									),
							),
						);
					}
				}

				return ret;
			},
		},
	);
}
