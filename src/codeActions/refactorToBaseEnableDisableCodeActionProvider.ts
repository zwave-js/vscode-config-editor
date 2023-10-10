import * as vscode from "vscode";

import {
	findSurroundingParamDefinition,
	getOptionsFromParamDefinition,
	getPropertyDefinitionFromObject,
	getPropertyNameFromNode,
	getPropertyValueFromNode,
	nodeIsPropertyNameOrValue,
	rangeFromNode,
} from "../astUtils";
import { My } from "../my";
import {
	getConfigFileDocumentSelector,
	masterTemplateImportPath,
	resolveTemplate,
} from "../shared";

const possibleTemplates = [
	"base_enable_disable",
	"base_enable_disable_255",
	"base_enable_disable_inverted",
	"base_enable_disable_255_inverted",
];

export function register(my: My): vscode.Disposable {
	const { workspace } = my;
	return vscode.languages.registerCodeActionsProvider(
		[
			getConfigFileDocumentSelector(workspace),
			// ...getTemplateDocumentSelector(workspace),
		],
		{
			async provideCodeActions(document, range, _context, _token) {
				const configDoc = my.configDocument;
				if (!configDoc) return;

				const node = configDoc.json.getNodeFromOffset(
					document.offsetAt(range.start),
				);
				if (!nodeIsPropertyNameOrValue(node)) return;

				// Offer the code action on the "#" property inside a param definition
				if (getPropertyNameFromNode(node) !== "#") return;
				const paramDefinition = findSurroundingParamDefinition(node);
				if (!paramDefinition) return;

				// We can offer the refactor, if ...
				// ...there isn't already an import
				if (
					!!getPropertyDefinitionFromObject(
						paramDefinition,
						"$import",
					)
				) {
					return;
				}
				// ...there are exactly 2 options
				const options = getOptionsFromParamDefinition(paramDefinition);
				if (options?.length !== 2) return;
				// ... at least the label or the options contain "enable" or "disable"
				const labelNode = getPropertyDefinitionFromObject(
					paramDefinition,
					"label",
				);
				const label = labelNode?.valueNode?.value;
				if (typeof label !== "string") return;
				const descriptionNode = getPropertyDefinitionFromObject(
					paramDefinition,
					"description",
				);
				const description = descriptionNode?.valueNode?.value;

				const isCalledEnableOrDisable =
					/(enable|disable)/.test(label.toLowerCase()) ||
					(typeof description === "string" &&
						/(enable|disable)/.test(description.toLowerCase())) ||
					options.some((o) =>
						/(enable|disable)/.test(o.label.toLowerCase()),
					);
				if (!isCalledEnableOrDisable) return;

				const valueSize = getPropertyDefinitionFromObject(
					paramDefinition,
					"valueSize",
				)?.valueNode?.value;
				const defaultValue = getPropertyDefinitionFromObject(
					paramDefinition,
					"defaultValue",
				)?.valueNode?.value;

				// Try to find a matching template in the master template
				const disableOptionValue = options.find((o) =>
					o.label.toLowerCase().includes("disable"),
				)?.value;
				const enableOptionValue = options.find((o) =>
					o.label.toLowerCase().includes("enable"),
				)?.value;
				if (
					disableOptionValue == undefined ||
					enableOptionValue == undefined
				) {
					return;
				}

				let matchingTemplateSpecifier: string | undefined;
				let matchingTemplate: Record<string, any> | undefined;
				for (const specifier of possibleTemplates) {
					const template = await resolveTemplate(
						my.workspace,
						document.uri,
						masterTemplateImportPath,
						specifier,
					);
					if (!template) continue;
					const templateEnableOptionValue = template.options?.find(
						(o: any) => o.label.toLowerCase() === "enable",
					)?.value;
					const templateDisableOptionValue = template.options?.find(
						(o: any) => o.label.toLowerCase() === "disable",
					)?.value;
					if (
						templateEnableOptionValue === enableOptionValue &&
						templateDisableOptionValue === disableOptionValue
					) {
						matchingTemplateSpecifier = specifier;
						matchingTemplate = template;
						break;
					}
				}
				if (!matchingTemplateSpecifier || !matchingTemplate) return;

				const templateDefaultValue = matchingTemplate.defaultValue;
				const templateValueSize = matchingTemplate.valueSize;

				// Remove occurences of enable/disable from the param label
				const fixedLabel = label
					.split(" ")
					.filter(
						(word) =>
							!["disable", "enable", "enable/disable"].includes(
								word.toLowerCase(),
							),
					)
					.join(" ");

				const condition = getPropertyDefinitionFromObject(
					paramDefinition,
					"$if",
				)?.valueNode?.value;

				const refactored: Record<string, any> = {
					"#": getPropertyValueFromNode(node),
					$if: condition,
					$import: `${masterTemplateImportPath}#${matchingTemplateSpecifier}`,
					label: fixedLabel,
					description,
				};
				// Preserve overridden valueSize/default
				if (templateValueSize !== valueSize) {
					refactored.valueSize = valueSize;
				}
				if (templateDefaultValue !== defaultValue) {
					refactored.defaultValue = defaultValue;
				}

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
						title: "Refactor to use Enable/Disable template",
						kind: vscode.CodeActionKind.RefactorInline,
						edit,
					},
				];
			},
		},
	);
}
