import * as vscode from "vscode";

import {
	getPropertyNameFromNode,
	getPropertyValueFromNode,
	nodeIsPropertyNameOrValue,
	rangeFromNode,
} from "../astUtils";
import { My } from "../my";
import {
	getConfigFileDocumentSelector,
	getTemplateDocumentSelector,
} from "../shared";

export function register(my: My): vscode.Disposable {
	const { workspace } = my;
	return vscode.languages.registerCodeActionsProvider(
		[
			getConfigFileDocumentSelector(workspace),
			...getTemplateDocumentSelector(workspace),
		],
		{
			provideCodeActions(document, range, _context, _token) {
				const configDoc = my.configDocument;
				if (!configDoc) return;

				const node = configDoc.json.getNodeFromOffset(
					document.offsetAt(range.start),
				);
				if (!nodeIsPropertyNameOrValue(node)) return;
				if (getPropertyNameFromNode(node) !== "$import") {
					return;
				}
				const value = getPropertyValueFromNode(node);
				if (typeof value !== "string") return;

				const template = configDoc.templates[value];
				if (!template) return;

				const { $label, $description, ...$definition } = template;

				const refactorRange = rangeFromNode(document, node.parent);
				const formatted = JSON.stringify($definition, undefined, "\t")
					.slice(1, -1)
					.trim()
					.split("\n")
					.map((line, i) => {
						// All lines after the first need to be indented correctly
						if (i === 0) {
							return line;
						}
						return (
							"\t".repeat(refactorRange.start.character) +
							line.replace(/^\t/, "")
						);
					})
					.join("\n");
				const edit = new vscode.WorkspaceEdit();
				edit.replace(document.uri, refactorRange, formatted);

				return [
					{
						title: "Inline Template",
						kind: vscode.CodeActionKind.RefactorInline,
						edit,
					},
				];
			},
		},
	);
}
