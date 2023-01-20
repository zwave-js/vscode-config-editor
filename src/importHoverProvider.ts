import * as vscode from "vscode";

import {
	formatTemplateDefinition,
	getConfigFileDocumentSelector,
	getImportSpecifierFromLine,
	resolveTemplate,
} from "./shared";

export function register(
	workspace: vscode.WorkspaceFolder,
	_context: vscode.ExtensionContext,
): vscode.Disposable {
	return vscode.languages.registerHoverProvider(
		getConfigFileDocumentSelector(workspace),
		{
			async provideHover(document, position, _token) {
				const line = document.lineAt(position.line).text.trim();

				const imp = getImportSpecifierFromLine(line);
				if (!imp) {
					return undefined;
				}

				const template = await resolveTemplate(
					workspace,
					document.uri,
					imp.filename,
					imp.templateKey,
				);
				if (!template) {
					return undefined;
				}

				const { $label, $description, ...$definition } = template;

				const documentation = formatTemplateDefinition(
					$definition,
					$label,
					$description,
				);

				return {
					contents: [new vscode.MarkdownString(documentation)],
				};
			},
		},
	);
}
