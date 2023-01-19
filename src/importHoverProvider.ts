import * as vscode from "vscode";

import {
	formatTemplateDefinition,
	getImportSpecifierFromLine,
	resolveTemplate,
} from "./shared";

export function register(
	workspace: vscode.WorkspaceFolder,
	context: vscode.ExtensionContext,
) {
	return vscode.languages.registerHoverProvider(
		{
			language: "jsonc",
			pattern: new vscode.RelativePattern(
				workspace.uri,
				"packages/config/config/devices/*/*.json",
			),
		},
		{
			async provideHover(document, position, token) {
				let line = document.lineAt(position.line).text.trim();

				const imp = getImportSpecifierFromLine(line);
				if (!imp) {
					return undefined;
				}

				const template = await resolveTemplate(
					workspace,
					imp.filename,
					imp.templateKey,
				);
				if (!template) {
					return undefined;
				}

				const { $label, $description, ...$definition } = template;

				let documentation = formatTemplateDefinition(
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
