import * as vscode from "vscode";

import {
	findSurroundingParamDefinition,
	getOptionsFromParamDefinition,
	getPropertyDefinitionFromObject,
	getPropertyNameFromNode,
	nodeIsPropertyNameOrValue,
	rangeFromNode,
} from "../astUtils";
import { My } from "../my";
import {
	getConfigFileDocumentSelector,
	paramInfoPropertyOrder,
} from "../shared";

export function register(my: My): vscode.Disposable {
	const { workspace } = my;
	return vscode.languages.registerCodeActionsProvider(
		[
			getConfigFileDocumentSelector(workspace),
			// ...getTemplateDocumentSelector(workspace),
		],
		{
			provideCodeActions(document, range, _context, _token) {
				const configDoc = my.configDocument;
				if (!configDoc) return;

				const node = configDoc.json.getNodeFromOffset(
					document.offsetAt(range.start),
				);
				if (!nodeIsPropertyNameOrValue(node)) return;

				// Offer the code action on the "options" property inside a param definition
				if (getPropertyNameFromNode(node) !== "options") return;
				const paramDefinition = findSurroundingParamDefinition(node);
				if (!paramDefinition) return;

				// We can offer the refactor, if ...
				// ...there are at least 2 options
				const options = getOptionsFromParamDefinition(paramDefinition);
				if (!options || options.length < 2) return;
				const minOption = Math.min(...options.map((o) => o.value));
				const maxOption = Math.max(...options.map((o) => o.value));

				// ...allowManualEntry is false
				const allowManualEntry = getPropertyDefinitionFromObject(
					paramDefinition,
					"allowManualEntry",
				)?.valueNode?.value;

				// ...or min/max is specified and there is an option for every possible value
				const minValue = getPropertyDefinitionFromObject(
					paramDefinition,
					"minValue",
				)?.valueNode?.value;
				const maxValue = getPropertyDefinitionFromObject(
					paramDefinition,
					"maxValue",
				)?.valueNode?.value;
				if (
					typeof minValue === "number" &&
					typeof maxValue === "number" &&
					minValue === minOption &&
					maxValue === maxOption &&
					options.length === maxValue - minValue + 1
				) {
					// This is okay
				} else if (allowManualEntry === false) {
					// This is also okay
				} else {
					return;
				}

				const refactored: Record<string, any> = {};

				for (const prop of paramInfoPropertyOrder) {
					// Take min/maxValue from options, remove allowManualEntry and options
					if (prop === "minValue") {
						refactored[prop] = minOption;
					} else if (prop === "maxValue") {
						refactored[prop] = maxOption;
					} else if (
						prop === "allowManualEntry" ||
						prop === "options"
					) {
						continue;
					} else {
						// Preserve all other properties
						refactored[prop] = getPropertyDefinitionFromObject(
							paramDefinition,
							prop,
						)?.valueNode?.value;
					}
				}

				// TODO: This isn't ideal as it does not preserve comments
				// Consider doing individual edits for each property if this becomes an issue

				const refactorRange = rangeFromNode(document, paramDefinition);
				const formatted = JSON.stringify(refactored, undefined, "\t")
					.trim()
					.split("\n")
					.map((line, i, lines) => {
						// All lines after the first need to be indented correctly
						if (i === 0) {
							return line;
						}
						const isLastLine = i === lines.length - 1;
						return (
							"\t".repeat(
								refactorRange.start.character +
									(isLastLine ? 0 : 1),
							) + line.replace(/^\t/, "")
						);
					})
					.join("\n");

				const edit = new vscode.WorkspaceEdit();
				edit.replace(document.uri, refactorRange, formatted);

				return [
					{
						title: "Refactor: Replace options with minValue and maxValue",
						kind: vscode.CodeActionKind.RefactorInline,
						edit,
					},
				];
			},
		},
	);
}
