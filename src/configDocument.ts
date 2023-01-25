import * as vscode from "vscode";
import {
	ASTNode,
	JSONDocument,
	SymbolInformation,
	TextDocument,
} from "vscode-json-languageservice";
import {
	getPropertyValueFromNode,
	nodeIsPropertyNameOrValue,
} from "./astUtils";
import { My } from "./my";
import {
	getConfigFileDocumentSelector,
	ImportSpecifier,
	j2vRange,
	parseImportSpecifier,
	reactToActiveEditorChanges,
	resolveTemplate,
} from "./shared";

export class ConfigDocument {
	public constructor(
		original: vscode.TextDocument,
		text: TextDocument,
		json: JSONDocument,
		templates: Record<string, Record<string, any>>,
		symbols: SymbolInformation[],
	) {
		this.original = original;
		this.text = text;
		this.json = json;
		this.templates = templates;
		this.symbols = symbols;
	}

	/** A reference to the original TextDocument */
	public readonly original: vscode.TextDocument;
	/** The text document on which the json document is based on */
	public readonly text: TextDocument;
	/** The parsed JSON document */
	public readonly json: JSONDocument;
	/** Resolved template imports (specifier => template) */
	public readonly templates: Record<string, Record<string, any>>;
	/** All symbols in the current document */
	public readonly symbols: SymbolInformation[];

	public getNodeFromSymbol(symbol: SymbolInformation): ASTNode | undefined {
		return this.json.getNodeFromOffset(
			this.text.offsetAt(symbol.location.range.start),
		);
	}

	public getNodeAtPosition(position: vscode.Position): ASTNode | undefined {
		return this.json.getNodeFromOffset(this.text.offsetAt(position));
	}

	public getSymbolsAtPosition(
		position: vscode.Position,
	): SymbolInformation[] {
		return this.symbols.filter((s) =>
			j2vRange(s.location.range).contains(position),
		);
	}
}

/** Analyzes the given document and resolves the referenced templates */
export async function parseConfigDocument(
	my: My,
	document: vscode.TextDocument,
): Promise<ConfigDocument> {
	const textDoc = TextDocument.create(
		document.uri.toString(),
		"jsonc",
		1,
		document.getText(),
	);
	const jsonDoc = my.ls.parseJSONDocument(textDoc);
	const symbols = my.ls.findDocumentSymbols(textDoc, jsonDoc);

	const importDirectives = symbols
		.filter((s) => s.name === "$import")
		.map((s) =>
			jsonDoc.getNodeFromOffset(textDoc.offsetAt(s.location.range.start)),
		)
		.filter((s): s is ASTNode => !!s)
		.map((s) =>
			nodeIsPropertyNameOrValue(s)
				? getPropertyValueFromNode(s)
				: undefined,
		)
		.filter((s): s is string => typeof s === "string")
		.map((imp) => [imp, parseImportSpecifier(imp)] as const)
		.filter((imp): imp is [string, ImportSpecifier] => !!imp[1]);

	const templates = (
		await Promise.all(
			importDirectives.map(
				async ([imp, spec]) =>
					[
						imp,
						await resolveTemplate(
							my.workspace,
							document.uri,
							spec.filename,
							spec.templateKey,
						),
					] as const,
			),
		)
	).filter((t): t is [string, Record<string, any>] => !!t[1]);

	return new ConfigDocument(
		document,
		textDoc,
		jsonDoc,
		Object.fromEntries(templates),
		symbols,
	);
}

export function enableConfigDocumentCache(my: My): void {
	reactToActiveEditorChanges(my, async (editor) => {
		// Don't try to parse unrelated documents
		if (
			!editor ||
			!editor.document ||
			editor.document.isUntitled ||
			!vscode.languages.match(
				getConfigFileDocumentSelector(my.workspace),
				editor.document,
			)
		) {
			my.configDocument = undefined;
			return;
		}

		try {
			my.configDocument = await parseConfigDocument(my, editor.document);
		} catch (e) {
			console.error(e);
			my.configDocument = undefined;
		}
	});
}

export type ConfigDocumentChange =
	| {
			type: "opened";
			prev: undefined;
			current: ConfigDocument;
	  }
	| {
			type: "switched";
			prev: ConfigDocument;
			current: ConfigDocument;
	  }
	| {
			type: "edited";
			prev: ConfigDocument;
			current: ConfigDocument;
	  }
	| {
			type: "closed";
			prev: ConfigDocument;
			current: undefined;
	  };
