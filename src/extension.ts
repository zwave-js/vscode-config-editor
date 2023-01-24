// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from "vscode";
import { getLanguageService as getJsonLanguageService } from "vscode-json-languageservice";

import { register as registerInlineImportCodeAction } from "./codeActions/inlineImportCodeActionProvider";
import { register as registerCompletions } from "./importCompletionProvider";
import { register as registerGoToDefinition } from "./importGoToDefinitionProvider";
import { register as registerHover } from "./importHoverProvider";
import { register as registerImportOverrides } from "./importOverrides";
import { register as registerReferences } from "./templateReferencesProvider";

import { enableConfigDocumentCache } from "./configDocument";
import { registerDiagnosticsProvider } from "./diagnostics/provider";
import { My } from "./my";
import { PreviewPanel } from "./panels/Preview";

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext): void {
	const workspace = vscode.workspace.workspaceFolders?.[0];
	if (!workspace) {
		return;
	}

	const ls = getJsonLanguageService({});
	ls.configure({
		allowComments: true,
		validate: true,
	});

	const my = new My(workspace, context, ls);
	enableConfigDocumentCache(my);

	// const previewCommand = vscode.commands.registerCommand(
	// 	"config-editor.previewConfig",
	// 	() => {
	// 		PreviewPanel.render(context.extensionUri);
	// 	},
	// );
	// context.subscriptions.push(previewCommand);
	context.subscriptions.push(
		my.onConfigDocumentChanged(async (doc) => {
			if (doc) {
				if (PreviewPanel.currentPanel) {
					// TODO: update PreviewPanel.currentPanel.update(doc);
				} else {
					PreviewPanel.render(context.extensionUri);
				}
				console.log("request");
				await PreviewPanel.currentPanel!.setMessageText(
					doc.original.fileName,
				);
				console.log("response");
			} else {
				PreviewPanel.currentPanel?.dispose();
			}
		}),
	);

	context.subscriptions.push(
		registerCompletions(my),
		registerHover(my),
		registerGoToDefinition(my),
		registerInlineImportCodeAction(my),
		registerReferences(my),
		registerDiagnosticsProvider(my),
		...registerImportOverrides(my),
	);
}

// This method is called when your extension is deactivated
// eslint-disable-next-line @typescript-eslint/no-empty-function
export function deactivate(): void {}
