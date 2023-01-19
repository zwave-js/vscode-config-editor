import * as vscode from "vscode";
import {
	LanguageService as JsonLanguageService,
	TextDocument,
} from "vscode-json-languageservice";

import {
	getConfigFileDocumentSelector,
	getImportSpecifierFromLine,
	readTextFile,
	resolveTemplateFile,
} from "./shared";

export function register(
	workspace: vscode.WorkspaceFolder,
	context: vscode.ExtensionContext,
	ls: JsonLanguageService,
) {
	return vscode.languages.registerDefinitionProvider(
		getConfigFileDocumentSelector(workspace),
		{
			async provideDefinition(document, position, token) {
				// Provide definitions for "$import" directives
				const line = document.lineAt(position.line).text;

				const imp = getImportSpecifierFromLine(line);
				if (!imp) {
					return undefined;
				}

				const file = resolveTemplateFile(
					workspace,
					document.uri,
					imp.filename,
				);
				if (!file) {
					return undefined;
				}

				// Find the template in the target file. For now do a simple text search
				// TODO: Figure out if we can use the JSON parser to find the template
				const fileContent = await readTextFile(file);

				const textDoc = TextDocument.create(
					file.toString(),
					"jsonc",
					1,
					fileContent,
				);
				const jsonDoc = ls.parseJSONDocument(textDoc);

				const symbols = ls.findDocumentSymbols(textDoc, jsonDoc);
				const template = symbols.find(
					(s) => s.name === imp.templateKey,
				);

				let originSelectionRange: vscode.Range;
				let targetRange: vscode.Range;

				if (!template) {
					// No matching template found, allow selecting the filename though
					const startIndex =
						line.substring(0, position.character).lastIndexOf('"') +
						1;
					let endIndex = line
						.substring(position.character)
						.indexOf(".json#");
					if (endIndex === -1) {
						return;
					} else {
						endIndex += position.character + 5;
					}

					originSelectionRange = new vscode.Range(
						position.line,
						startIndex,
						position.line,
						endIndex,
					);
					// And go to the start of the file
					targetRange = new vscode.Range(0, 0, 0, 0);
				} else {
					// Underline the whole import specifier
					const startIndex =
						line.substring(0, position.character).lastIndexOf('"') +
						1;
					let endIndex =
						line.substring(position.character).indexOf('"') +
						position.character;
					if (endIndex < position.character) {
						// No closing " found, select until the end of the line
						endIndex = line.length;
					}
					originSelectionRange = new vscode.Range(
						position.line,
						startIndex,
						position.line,
						endIndex,
					);

					// Go to the specific template
					targetRange = template.location.range as any;
				}

				const link: vscode.LocationLink = {
					originSelectionRange,
					targetUri: file,
					targetRange,
				};

				return [link];
			},
		},
	);
}
