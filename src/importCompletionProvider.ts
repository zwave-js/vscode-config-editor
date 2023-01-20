// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import { posix as path } from "path";
import * as vscode from "vscode";
import { LanguageService as JsonLanguageService } from "vscode-json-languageservice";
import { readJsonWithTemplate } from "./JsonTemplate";
import {
	formatTemplateDefinition,
	getConfigFileDocumentSelector,
	nodeIsPropertyName,
	nodeIsPropertyValue,
	parseImportSpecifier,
	resolveTemplateFile,
} from "./shared";

const makeTemplateImportSpecifier = (filePath: string) => `${filePath}#\${0}`;
const makeTemplateImport = (filePath: string) =>
	`\\$import": "${makeTemplateImportSpecifier(filePath)}",`;

const masterTemplateImportPath = `~/templates/master_template.json`;
const masterTemplateImportSpecifier = makeTemplateImportSpecifier(
	masterTemplateImportPath,
);
const masterTemplateImport = makeTemplateImport(masterTemplateImportPath);

export function register(
	workspace: vscode.WorkspaceFolder,
	context: vscode.ExtensionContext,
	ls: JsonLanguageService,
): vscode.Disposable {
	return vscode.languages.registerCompletionItemProvider(
		getConfigFileDocumentSelector(workspace),
		{
			async provideCompletionItems(document, position, _token, _context) {
				const ret: vscode.CompletionItem[] = [];

				const jsonDoc = ls.parseJSONDocument(document as any);
				const node = jsonDoc.getNodeFromOffset(
					document.offsetAt(position),
				);

				if (nodeIsPropertyName(node)) {
					const range = new vscode.Range(
						document.positionAt(node.offset + 1), // start inside the quotes
						document.positionAt(node.offset + node.length), // include the final quotes in the completion
					);

					// We're in a property name, suggest importing from the master template

					const importMasterTemplate = new vscode.CompletionItem(
						"Import from master template",
						vscode.CompletionItemKind.Folder,
					);
					// Using a snippet string allows us to place the cursor inside the completion
					importMasterTemplate.insertText = new vscode.SnippetString(
						masterTemplateImport,
					);

					importMasterTemplate.range = range;

					// Trigger completions again, so an import can be chosen from the selected file
					importMasterTemplate.command = {
						command: "editor.action.triggerSuggest",
						title: "Re-trigger completions...",
					};

					// Try putting the snippet at the front
					importMasterTemplate.sortText = '"$import": $0master';
					importMasterTemplate.filterText = "$import";

					ret.push(importMasterTemplate);

					//
					// Also find nearby manufacturer templates and suggest those

					const mfTemplates = await vscode.workspace.findFiles(
						new vscode.RelativePattern(
							vscode.Uri.joinPath(document.uri, ".."),
							"templates/*.json",
						),
					);

					for (const mfTmpl of mfTemplates) {
						try {
							const importMfTmpl = new vscode.CompletionItem(
								"Import from manufacturer template",
								vscode.CompletionItemKind.Folder,
							);
							// Using a snippet string allows us to place the cursor inside the completion
							const relativePath = path.relative(
								path.dirname(document.uri.fsPath),
								mfTmpl.fsPath,
							);
							importMfTmpl.insertText = new vscode.SnippetString(
								makeTemplateImport(relativePath),
							);
							importMfTmpl.detail = relativePath;
							importMfTmpl.filterText = "$import";

							importMfTmpl.range = range;

							// Trigger completions again, so an import can be chosen from the selected file
							importMfTmpl.command = {
								command: "editor.action.triggerSuggest",
								title: "Re-trigger completions...",
							};

							ret.push(importMfTmpl);
						} catch (e) {
							console.error(e);
						}
					}
				} else if (
					nodeIsPropertyValue(node) &&
					node.parent.keyNode.value === "$import"
				) {
					// We're in the import specifier, return valid imports
					const currentValue = node.value as string;
					const spec = parseImportSpecifier(currentValue);
					if (!spec) {
						const range = new vscode.Range(
							document.positionAt(node.offset + 1), // start inside the quotes
							document.positionAt(node.offset + node.length - 1),
						);

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

						masterTemplate.range = range;

						// Trigger completions again, so an import can be chosen from the selected file
						masterTemplate.command = {
							command: "editor.action.triggerSuggest",
							title: "Re-trigger completions...",
						};

						ret.push(masterTemplate);

						//
						// Also suggest nearby manufacturer templates

						const mfTemplates = await vscode.workspace.findFiles(
							new vscode.RelativePattern(
								vscode.Uri.joinPath(document.uri, ".."),
								"templates/*.json",
							),
						);

						for (const mfTmpl of mfTemplates) {
							try {
								const importMfTmpl = new vscode.CompletionItem(
									"Manufacturer template",
									vscode.CompletionItemKind.Folder,
								);
								// Using a snippet string allows us to place the cursor inside the completion
								const relativePath = path.relative(
									path.dirname(document.uri.fsPath),
									mfTmpl.fsPath,
								);
								importMfTmpl.insertText =
									new vscode.SnippetString(
										makeTemplateImportSpecifier(
											relativePath,
										),
									);
								importMfTmpl.sortText = relativePath;
								importMfTmpl.filterText = relativePath;
								importMfTmpl.detail = relativePath;

								importMfTmpl.range = range;

								// Trigger completions again, so an import can be chosen from the selected file
								importMfTmpl.command = {
									command: "editor.action.triggerSuggest",
									title: "Re-trigger completions...",
								};

								ret.push(importMfTmpl);
							} catch (e) {
								console.error(e);
							}
						}
					} else {
						// Suggest valid templates from the selected file
						try {
							const uri = resolveTemplateFile(
								workspace,
								document.uri,
								spec.filename,
							);
							const fileContent: Record<string, any> =
								await readJsonWithTemplate(
									workspace,
									uri.fsPath,
								);

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
									const documentation =
										formatTemplateDefinition(
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
										new vscode.MarkdownString(
											documentation,
										);
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
						} catch (e) {
							console.error(e);
						}
					}
				}

				return new vscode.CompletionList(ret, false);
			},
		},
		...["\t", "$", "#", '"', "~"],
	);
}
