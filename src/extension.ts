// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from "vscode";
import { getLanguageService as getJsonLanguageService } from "vscode-json-languageservice";

import { register as registerInlineImportCodeAction } from "./codeActions/inlineImportCodeActionProvider";
import { register as refactorToBaseEnableDisableCodeAction } from "./codeActions/refactorToBaseEnableDisableCodeActionProvider";
import { register as replaceOptionsWithMinMaxValueCodeAction } from "./codeActions/replaceOptionsWithMinMaxValueCodeActionProvider";
import { register as registerCompletions } from "./importCompletionProvider";
import { register as registerGoToDefinition } from "./importGoToDefinitionProvider";
import { register as registerHover } from "./importHoverProvider";
import { register as registerImportOverrides } from "./importOverrides";
import { register as registerReferences } from "./templateReferencesProvider";

import { enableConfigDocumentCache } from "./configDocument";
import { registerDiagnosticsProvider } from "./diagnostics/provider";
import { registerPreviewProvider } from "./interactivePreview/provider";
import { My } from "./my";
import { registerShowPreviewCommand } from "./panels/showPreviewCommand";

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

	context.subscriptions.push(
		registerCompletions(my),
		registerHover(my),
		registerGoToDefinition(my),
		registerInlineImportCodeAction(my),
		refactorToBaseEnableDisableCodeAction(my),
		replaceOptionsWithMinMaxValueCodeAction(my),
		registerReferences(my),
		registerDiagnosticsProvider(my),
		...registerPreviewProvider(my),
		...registerShowPreviewCommand(my),
		...registerImportOverrides(my),
	);
}

// This method is called when your extension is deactivated
export function deactivate(): void {}
