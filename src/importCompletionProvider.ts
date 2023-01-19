// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from "vscode";
import { LanguageService as JsonLanguageService } from "vscode-json-languageservice";
import {
	formatTemplateDefinition,
	nodeIsPropertyName,
	nodeIsPropertyValue,
	parseImportSpecifier,
	readJSON,
	resolveTemplateFile,
} from "./shared";

const masterTemplateImportPath = `~/templates/master_template.json`;
const masterTemplateImportSpecifier = `${masterTemplateImportPath}#\${0}`;
const masterTemplateImport = `\\$import": "${masterTemplateImportSpecifier}",`;

export function register(
	workspace: vscode.WorkspaceFolder,
	context: vscode.ExtensionContext,
	ls: JsonLanguageService,
) {
	return vscode.languages.registerCompletionItemProvider(
		{
			language: "jsonc",
			pattern: new vscode.RelativePattern(
				workspace.uri,
				"packages/config/config/devices/*/*.json",
			),
		},
		{
			async provideCompletionItems(document, position, token, context) {
				const currentLinePrefix = document
					.lineAt(position.line)
					.text.substring(0, position.character)
					.trimStart();
				const currentLineSuffix = document
					.lineAt(position.line)
					.text.substring(position.character)
					.trimEnd();

				const ret: vscode.CompletionItem[] = [];

				// const importMasterTemplate = new vscode.CompletionItem(
				//   "Import from master template",
				//   vscode.CompletionItemKind.Folder
				// );
				// importMasterTemplate.insertText = masterTemplateImport.substring(
				//   currentLinePrefix.length
				// );
				// console.log("insertText: ", importMasterTemplate.insertText);
				// // Avoid partial overwrites in the current line
				// importMasterTemplate.range = new vscode.Range(position, position);
				// console.log(
				//   `completion range: ${importMasterTemplate.range.start.line}@${importMasterTemplate.range.start.character} to ${importMasterTemplate.range.end.line}@${importMasterTemplate.range.end.character}`
				// );
				// // Try putting the snippet at the front
				// importMasterTemplate.sortText = "$import$0master";

				// // Put a comma after the import
				// if (!currentLineSuffix.includes(",")) {
				//   importMasterTemplate.additionalTextEdits = [
				//     vscode.TextEdit.insert(
				//       position.translate(0, importMasterTemplate.sortText.length),
				//       ","
				//     ),
				//   ];
				// }

				// // Trigger completions again, so an import can be chosen from the selected file
				// importMasterTemplate.command = {
				//   command: "editor.action.triggerSuggest",
				//   title: "Re-trigger completions...",
				// };
				// ret.push(importMasterTemplate);

				const jsonDoc = ls.parseJSONDocument(document as any);
				const node = jsonDoc.getNodeFromOffset(
					document.offsetAt(position),
				);

				if (nodeIsPropertyName(node)) {
					// We're in a property name, suggest importing from the master template
					const importMasterTemplate = new vscode.CompletionItem(
						"Import from master template",
						vscode.CompletionItemKind.Folder,
					);
					// Using a snippet string allows us to place the cursor inside the completion
					importMasterTemplate.insertText = new vscode.SnippetString(
						masterTemplateImport,
					);

					importMasterTemplate.range = new vscode.Range(
						document.positionAt(node.offset + 1), // start inside the quotes
						document.positionAt(node.offset + node.length), // include the final quotes in the completion
					);

					// Trigger completions again, so an import can be chosen from the selected file
					importMasterTemplate.command = {
						command: "editor.action.triggerSuggest",
						title: "Re-trigger completions...",
					};

					// Try putting the snippet at the front
					importMasterTemplate.sortText = '"$import": $0master';
					importMasterTemplate.filterText = "$import";

					ret.push(importMasterTemplate);
				} else if (
					nodeIsPropertyValue(node) &&
					node.parent.keyNode.value === "$import"
				) {
					// We're in the import specifier, return valid imports
					const currentValue = node.value as string;
					const spec = parseImportSpecifier(currentValue);
					if (!spec) {
						// Suggest the master template
						const masterTemplate = new vscode.CompletionItem(
							"Master template",
							vscode.CompletionItemKind.Folder,
						);
						// Using a snippet string allows us to place the cursor inside the completion
						masterTemplate.insertText = new vscode.SnippetString(
							masterTemplateImportSpecifier,
						);
						masterTemplate.sortText = masterTemplateImportPath;
						masterTemplate.filterText = masterTemplateImportPath;
						masterTemplate.detail = masterTemplateImportPath;

						masterTemplate.range = new vscode.Range(
							document.positionAt(node.offset + 1), // start inside the quotes
							document.positionAt(node.offset + node.length - 1),
						);

						// Trigger completions again, so an import can be chosen from the selected file
						masterTemplate.command = {
							command: "editor.action.triggerSuggest",
							title: "Re-trigger completions...",
						};

						ret.push(masterTemplate);
					} else {
						// Suggest valid templates from the selected file
						const uri = resolveTemplateFile(
							workspace,
							spec.filename,
						);
						const fileContent = await readJSON(uri);

						const importSuggestions = Object.entries<
							Record<string, any>
						>(fileContent).map(
							([
								key,
								{
									$label: label = key,
									$description,
									...$import
								},
							]) => {
								let documentation = formatTemplateDefinition(
									$import,
									undefined,
									$description,
								);

								const completionItem: vscode.CompletionItem =
									new vscode.CompletionItem(
										key,
										vscode.CompletionItemKind.Snippet,
									);
								completionItem.detail = label;
								// completionItem.sortText = key;
								// completionItem.insertText = key;
								// completionItem.filterText = key;
								completionItem.documentation =
									new vscode.MarkdownString(documentation);
								completionItem.range = new vscode.Range(
									position.translate(
										0,
										-spec.templateKey.length,
									),
									position,
								);
								return completionItem;
							},
						);

						ret.push(...importSuggestions);
					}
				}

				return new vscode.CompletionList(ret, false);
			},
		},
		...["\t", "$", "#", '"', "~"],
	);
}
