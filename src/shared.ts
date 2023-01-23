import * as JSON5 from "json5";
import * as vscode from "vscode";
import {
	ASTNode,
	Location,
	ObjectASTNode,
	Position,
	PropertyASTNode,
	Range,
} from "vscode-json-languageservice";
import { readJsonWithTemplate } from "./JsonTemplate";
import { My } from "./my";

export const configRoot = "packages/config/config/devices";

export function getConfigFileDocumentSelector(
	workspace: vscode.WorkspaceFolder,
): vscode.DocumentFilter {
	return {
		language: "jsonc",
		pattern: new vscode.RelativePattern(
			workspace.uri,
			"packages/config/config/devices/*/*.json",
		),
	};
}

export function getTemplateDocumentSelector(
	workspace: vscode.WorkspaceFolder,
): vscode.DocumentFilter[] {
	return [
		{
			language: "jsonc",
			pattern: new vscode.RelativePattern(
				workspace.uri,
				"packages/config/config/devices/templates/*.json",
			),
		},
		{
			language: "jsonc",
			pattern: new vscode.RelativePattern(
				workspace.uri,
				"packages/config/config/devices/*/templates/*.json",
			),
		},
	];
}

export async function findConfigFiles(
	workspace: vscode.WorkspaceFolder,
	deviceFiles: boolean,
	templateFiles: boolean,
): Promise<vscode.Uri[]> {
	const ret: vscode.Uri[] = [];
	if (deviceFiles) {
		ret.push(
			...(await vscode.workspace.findFiles(
				getConfigFileDocumentSelector(workspace).pattern!,
			)),
		);
	}
	if (templateFiles) {
		for (const filter of getTemplateDocumentSelector(workspace)) {
			ret.push(...(await vscode.workspace.findFiles(filter.pattern!)));
		}
	}
	return ret;
}

export async function readJSON(uri: vscode.Uri): Promise<Record<string, any>> {
	const fileContentRaw = await vscode.workspace.fs.readFile(uri);
	const fileContentString = Buffer.from(fileContentRaw).toString("utf8");
	return JSON5.parse(fileContentString);
}

export async function readTextFile(uri: vscode.Uri): Promise<string> {
	const fileContentRaw = await vscode.workspace.fs.readFile(uri);
	return Buffer.from(fileContentRaw).toString("utf8");
}

export function resolveTemplateFile(
	workspace: vscode.WorkspaceFolder,
	from: vscode.Uri,
	filename: string,
): vscode.Uri {
	if (filename.startsWith("~")) {
		// "absolute" URL
		const actualFilename = filename.replace(/^~\//, configRoot + "/");
		return vscode.Uri.joinPath(workspace.uri, actualFilename);
	} else {
		// relative URL
		return vscode.Uri.joinPath(from, "..", filename);
	}
}

export interface ImportSpecifier {
	filename: string;
	templateKey: string;
}

export function getImportSpecifierFromLine(line: string):
	| {
			filename: string;
			templateKey: string;
	  }
	| undefined {
	line = line.trim();
	if (!line.startsWith(`"$import":`)) {
		return undefined;
	}

	line = line.substring(line.indexOf(":") + 1).trim();
	line = line.substring(line.indexOf('"') + 1);
	if (line.includes('"')) {
		line = line.substring(0, line.indexOf('"'));
	}

	if (!line.includes(".json#")) {
		return undefined;
	}

	const [filename, templateKey] = line.split("#");
	return { filename, templateKey };
}

export function parseImportSpecifier(
	value: string,
): ImportSpecifier | undefined {
	if (!value.includes(".json#")) {
		return undefined;
	}

	const [filename, templateKey] = value.split("#");
	return { filename, templateKey };
}

export async function resolveTemplate(
	workspace: vscode.WorkspaceFolder,
	from: vscode.Uri,
	filename: string,
	importSpecifier: string,
): Promise<Record<string, any> | undefined> {
	const uri = resolveTemplateFile(workspace, from, filename);
	const fileContent: Record<string, any> = await readJsonWithTemplate(
		workspace,
		uri.fsPath,
	);
	return fileContent[importSpecifier];
}

export function formatTemplateDefinition(
	template: Record<string, any>,
	label: string | undefined,
	description: string | undefined,
): string {
	let ret = `\`\`\`json
${JSON.stringify(template, null, 2)}
\`\`\``;
	if (description) {
		ret = description + "\n\n" + ret;
	}
	if (label) {
		ret = `**${label}**\n\n${ret}`;
	}
	return ret;
}

function getLineIndentation(line: string): string {
	return line.match(/^(\s*)/)?.[1] ?? "";
}

export function getBlockRange(
	jsonDoc: string,
	position: vscode.Position,
): vscode.Range {
	const lines = jsonDoc.split("\n");
	let start = position.line;
	let end = position.line;
	const initialLineIndent = getLineIndentation(lines[start]).length;
	while (start > 0) {
		const line = lines[start];
		if (
			getLineIndentation(line).length < initialLineIndent &&
			line.trim().endsWith("{")
		) {
			break;
		}
		start--;
	}
	while (end < lines.length) {
		const line = lines[end];
		if (
			getLineIndentation(line).length < initialLineIndent &&
			line.trim().startsWith("}")
		) {
			break;
		}
		end++;
	}
	return new vscode.Range(
		new vscode.Position(start, getLineIndentation(lines[start]).length),
		new vscode.Position(end, getLineIndentation(lines[end]).length + 1),
	);
}

export function nodeIsPropertyName(
	node: ASTNode | undefined,
): node is ASTNode & { parent: PropertyASTNode } {
	return node?.parent?.type === "property" && node === node.parent.keyNode;
}

export function nodeIsPropertyValue(
	node: ASTNode | undefined,
): node is ASTNode & { parent: PropertyASTNode } {
	return node?.parent?.type === "property" && node === node.parent.valueNode;
}

export function nodeIsPropertyNameOrValue(
	node: ASTNode | undefined,
): node is ASTNode & { parent: PropertyASTNode } {
	return node?.parent?.type === "property";
}

export function getPropertyNameFromNode(
	node: ASTNode & { parent: PropertyASTNode },
): string {
	return node.parent.keyNode.value;
}

export function getPropertyValueFromNode(
	node: ASTNode & { parent: PropertyASTNode },
): string | number | boolean | null | undefined {
	return node.parent.valueNode?.value;
}

export function rangeFromNodeLocation(location: Location): vscode.Range {
	return new vscode.Range(
		location.range.start.line,
		location.range.start.character,
		location.range.end.line,
		location.range.end.character,
	);
}

export function rangeFromNode(
	document: vscode.TextDocument,
	node: ASTNode,
): vscode.Range {
	const start = document.positionAt(node.offset);
	const end = document.positionAt(node.offset + node.length);
	return new vscode.Range(start, end);
}

export function tryExpandPropertyRange(
	document: vscode.TextDocument,
	node: PropertyASTNode & { parent: ObjectASTNode },
): vscode.Range {
	const siblings = node.parent.properties;
	if (siblings.length === 1) return rangeFromNode(document, node);
	const index = siblings.indexOf(node);
	if (index > 0) {
		// Select everything from the end of the previous property to the end of this one
		const start = document.positionAt(
			siblings[index - 1].offset + siblings[index - 1].length,
		);
		const end = document.positionAt(node.offset + node.length);
		return new vscode.Range(start, end);
	} else {
		// Select everything from the start of this property to the start of the next one
		const start = document.positionAt(node.offset);
		const end = document.positionAt(siblings[index + 1].offset);
		return new vscode.Range(start, end);
	}
}

export function reactToActiveEditorChanges(
	{ context }: My,
	handler: (editor: vscode.TextEditor | undefined) => void,
	throttleIntervalMs: number = 250,
): void {
	let timeout: NodeJS.Timer | undefined = undefined;
	let activeEditor = vscode.window.activeTextEditor;

	function triggerHandler(throttle = false) {
		if (timeout) {
			clearTimeout(timeout);
			timeout = undefined;
		}
		if (throttle) {
			timeout = setTimeout(handler, throttleIntervalMs, activeEditor);
		} else {
			handler(activeEditor);
		}
	}

	if (activeEditor) {
		triggerHandler();
	}

	vscode.window.onDidChangeActiveTextEditor(
		(editor) => {
			activeEditor = editor;
			if (editor) {
				triggerHandler();
			}
		},
		null,
		context.subscriptions,
	);

	vscode.workspace.onDidChangeTextDocument(
		(event) => {
			if (activeEditor && event.document === activeEditor.document) {
				triggerHandler(true);
			}
		},
		null,
		context.subscriptions,
	);
}

export function j2vPos(position: Position): vscode.Position {
	return new vscode.Position(position.line, position.character);
}

export function j2vRange(range: Range): vscode.Range {
	return new vscode.Range(j2vPos(range.start), j2vPos(range.end));
}
