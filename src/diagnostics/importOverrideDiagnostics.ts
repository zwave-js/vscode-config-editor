import { ASTNode, PropertyASTNode } from "vscode-json-languageservice";
import {
	getPropertyNameFromNode,
	getPropertyValueFromNode,
	isJSONDifferentToAST,
	nodeIsPropertyNameOrValue,
	rangeFromNode,
} from "../astUtils";
import { ConfigDocument } from "../configDocument";
import { j2vRange } from "../shared";
import { Diagnostic, DiagnosticType } from "./diagnostics";

export function generateImportOverrideDiagnostics(
	config: ConfigDocument,
): Diagnostic[] {
	const ret: Diagnostic[] = [];

	const importsInParamInformation = config.symbols
		.filter(
			(s) =>
				s.name === "$import" && s.containerName === "paramInformation",
		)
		.map((s) => config.getNodeFromSymbol(s))
		.filter(nodeIsPropertyNameOrValue);

	const importsAndContainingBlocks = importsInParamInformation
		.filter(
			(
				n,
			): n is ASTNode & {
				parent: PropertyASTNode & { parent: ASTNode };
			} => !!n?.parent?.parent,
		)
		.map((n) => [n, n.parent.parent] as const);

	const symbolsInParamInformationWithRanges = config.symbols
		.filter((s) => s.containerName === "paramInformation")
		.map((s) => [s, j2vRange(s.location.range)] as const);

	const importsAndSymbolsAfter = importsAndContainingBlocks
		.map(([imp, block]) => {
			const blockRange = rangeFromNode(config.original, block);
			const importRange = rangeFromNode(config.original, imp);
			// We're looking for symbols within the containing block
			return [
				imp,
				symbolsInParamInformationWithRanges
					.filter(([, r]) => blockRange.contains(r))
					// but after the import
					.filter(([, r]) => importRange.end.isBeforeOrEqual(r.start))
					.map(([s]) => s),
			] as const;
		})
		.filter(([, s]) => s.length > 0);

	const propertiesOverwritingImports = importsAndSymbolsAfter.map(
		([imp, s]) => {
			const importSpecifier = getPropertyValueFromNode(imp);
			if (typeof importSpecifier !== "string") return undefined;
			const resolvedImport = config.templates[importSpecifier];
			if (!resolvedImport) return undefined;

			const properties = s
				.map((s) => config.getNodeFromSymbol(s))
				.filter(nodeIsPropertyNameOrValue)
				.map((n) => {
					return [
						getPropertyNameFromNode(n),
						n.parent.valueNode,
						n,
					] as const;
				})
				.filter(([name]) => name in resolvedImport);
			return [resolvedImport, properties] as const;
		},
	);

	for (const block of propertiesOverwritingImports) {
		if (!block) continue;
		const [imp, properties] = block;

		for (const [name, valueNode, propNode] of properties) {
			const originalValue = imp[name];

			if (valueNode && !isJSONDifferentToAST(originalValue, valueNode)) {
				ret.push({
					type: DiagnosticType.UnnecessaryImportOverride,
					range: rangeFromNode(config.original, propNode.parent),
				});
			} else {
				ret.push({
					type: DiagnosticType.ImportOverride,
					range: rangeFromNode(config.original, propNode),
					value: getPropertyValueFromNode(propNode),
					originalValue,
				});
			}
		}
	}

	return ret;
}
