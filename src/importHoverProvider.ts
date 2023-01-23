import * as vscode from "vscode";
import { My } from "./my";

import {
	formatTemplateDefinition,
	getConfigFileDocumentSelector,
	getPropertyNameFromNode,
	getPropertyValueFromNode,
	nodeIsPropertyNameOrValue,
} from "./shared";

export function register(my: My): vscode.Disposable {
	const { workspace } = my;
	return vscode.languages.registerHoverProvider(
		getConfigFileDocumentSelector(workspace),
		{
			provideHover(document, position, _token) {
				const configDoc = my.configDocument;
				if (!configDoc) return;

				const nodeAtPosition = configDoc.json.getNodeFromOffset(
					document.offsetAt(position),
				);
				if (!nodeIsPropertyNameOrValue(nodeAtPosition)) return;
				if (getPropertyNameFromNode(nodeAtPosition) !== "$import") {
					return;
				}
				const value = getPropertyValueFromNode(nodeAtPosition);
				if (typeof value !== "string") return;

				const template = configDoc.templates[value];
				if (!template) return;

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
