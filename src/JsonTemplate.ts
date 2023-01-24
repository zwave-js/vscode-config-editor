// FIXME: This file is copied from zwave-js. Either make @zwave-js/config a dependency or try to resolve it from the current workspace instead.

import { isArray, isObject } from "alcalzone-shared/typeguards";
import { posix as path } from "path";
import * as vscode from "vscode";
import { configRoot, readJSON } from "./shared";

const IMPORT_KEY = "$import";
const importSpecifierRegex =
	/^(?<filename>(?:~\/)?[\w\d\/\\\._-]+\.json)?(?:#(?<selector>[\w\d\/\._-]+(?:\[0x[0-9a-fA-F]+\])?))?$/i;

type FileCache = Map<string, Record<string, unknown>>;

// // The template cache is used to speed up cases where the same files get parsed multiple times,
// // e.g. during config file linting. It should be cleared whenever the files need to be loaded fresh
// // from disk, like when creating an index
// const templateCache: FileCache = new Map();
// export function clearTemplateCache(): void {
// 	templateCache.clear();
// }

/** Parses a JSON file with $import keys and replaces them with the selected objects */
export async function readJsonWithTemplate(
	workspace: vscode.WorkspaceFolder,
	filename: string,
): Promise<Record<string, unknown>> {
	// if (!(await fs.pathExists(filename))) {
	// 	throw new Error(
	// 		`Could not open config file ${filename}: not found!`,
	// 		ZWaveErrorCodes.Config_NotFound,
	// 	);
	// }

	// Try to use the cached versions of the template files to speed up the loading
	// const fileCache = new Map(templateCache);
	const fileCache = new Map();
	const ret = await readJsonWithTemplateInternal(
		workspace,
		filename,
		undefined,
		[],
		fileCache,
	);

	// // Only remember the cached templates, not the individual files to save RAM
	// for (const [filename, cached] of fileCache) {
	// 	if (/[\\/]templates[\\/]/.test(filename)) {
	// 		templateCache.set(filename, cached);
	// 	}
	// }

	return ret;
}

function assertImportSpecifier(
	val: unknown,
	source?: string,
): asserts val is string {
	if (typeof val !== "string") {
		throw new Error(
			`Invalid import specifier ${String(val)}!${
				source != undefined ? ` Source: ${source}` : ""
			}`,
		);
	}
	if (!importSpecifierRegex.test(val)) {
		throw new Error(
			`Import specifier "${val}" is invalid!${
				source != undefined ? ` Source: ${source}` : ""
			}`,
		);
	}
}

function getImportSpecifier(filename: string, selector?: string): string {
	let ret = filename;
	if (selector) ret += `#${selector}`;
	return ret;
}

function select(
	obj: Record<string, unknown>,
	selector: string,
): Record<string, unknown> {
	let ret: Record<string, unknown> = obj;
	const selectorParts = selector.split("/").filter((s): s is string => !!s);
	for (const part of selectorParts) {
		// Special case for paramInformation selectors to select params by #
		if (isArray(ret)) {
			const item = ret.find(
				(r) => isObject(r) && "#" in r && r["#"] === part,
			);
			if (item != undefined) {
				// Don't copy the param number
				const { ["#"]: _, ...rest } = item as any;
				ret = rest;
				continue;
			}
		}
		// By default select the object property
		ret = (ret as any)[part];
	}
	if (!isObject(ret)) {
		throw new Error(`The import target "${selector}" is not an object!`);
	}
	return ret;
}

function getImportStack(
	visited: string[],
	selector: string | undefined,
): string {
	const source = [...visited, selector ? `#${selector}` : undefined]
		.reverse()
		.filter((s) => !!s) as string[];
	if (source.length > 0) {
		return `\nImport stack: ${source.map((s) => `\n  in ${s}`).join("")}`;
	}
	return "";
}

async function readJsonWithTemplateInternal(
	workspace: vscode.WorkspaceFolder,
	filename: string,
	selector: string | undefined,
	visited: string[],
	fileCache: FileCache,
): Promise<Record<string, unknown>> {
	filename = path.normalize(filename);

	// Make sure the file is inside the config directory
	const rootDir = vscode.Uri.joinPath(workspace.uri, configRoot);
	const relativeToRoot = path.relative(
		rootDir.path,
		vscode.Uri.file(filename).path,
	);
	if (relativeToRoot.startsWith("..")) {
		throw new Error(
			`Tried to import config file "${filename}" outside of root directory "${
				rootDir.fsPath
			}"!${getImportStack(visited, selector)}`,
		);
	}

	const specifier = getImportSpecifier(filename, selector);
	if (visited.includes(specifier)) {
		const msg = `Circular $import in config files: ${[
			...visited,
			specifier,
		].join(" -> ")}\n`;
		// process.stderr.write(msg + "\n");
		throw new Error(msg);
	}

	let json: Record<string, unknown>;
	if (fileCache.has(filename)) {
		json = fileCache.get(filename)!;
	} else {
		try {
			json = await readJSON(vscode.Uri.file(filename));
			fileCache.set(filename, json);
		} catch (e) {
			throw new Error(
				`Could not parse config file ${filename}: ${
					(e as Error).stack
				}${getImportStack(visited, selector)}`,
			);
		}
	}
	// Resolve the JSON imports for (a subset) of the file and return the compound file
	return resolveJsonImports(
		workspace,
		selector ? select(json, selector) : json,
		filename,
		[...visited, specifier],
		fileCache,
	);
}

/** Replaces all `$import` properties in a JSON object with object spreads of the referenced file/property */
export async function resolveJsonImports(
	workspace: vscode.WorkspaceFolder,
	json: Record<string, unknown>,
	filename: string,
	visited: string[],
	fileCache: FileCache,
): Promise<Record<string, unknown>> {
	const ret: Record<string, unknown> = {};
	// Loop through all properties and copy them to the resulting object
	for (const [prop, val] of Object.entries(json)) {
		if (prop === IMPORT_KEY) {
			// This is an import statement. Make sure we're working with a string
			assertImportSpecifier(val, visited.join(" -> "));
			const { filename: importFilename, selector } =
				importSpecifierRegex.exec(val)!.groups!;

			// Resolve the correct import path
			let newFilename: string;
			if (importFilename) {
				if (importFilename.startsWith("~/")) {
					newFilename = vscode.Uri.joinPath(
						workspace.uri,
						configRoot,
						importFilename.slice(2),
					).fsPath;
				} else {
					newFilename = path.join(
						path.dirname(filename),
						importFilename,
					);
				}
			} else {
				newFilename = filename;
			}

			// const importFilename = path.join(path.dirname(filename), val);
			const imported = await readJsonWithTemplateInternal(
				workspace,
				newFilename,
				selector,
				visited,
				fileCache,
			);
			Object.assign(ret, imported);
		} else if (isObject(val)) {
			// We're looking at an object, recurse into it
			ret[prop] = await resolveJsonImports(
				workspace,
				val,
				filename,
				visited,
				fileCache,
			);
		} else if (isArray(val)) {
			// We're looking at an array, check if there are objects we need to recurse into
			const vals: unknown[] = [];
			for (const v of val) {
				if (isObject(v)) {
					vals.push(
						await resolveJsonImports(
							workspace,
							v,
							filename,
							visited,
							fileCache,
						),
					);
				} else {
					vals.push(v);
				}
			}
			ret[prop] = vals;
		} else {
			ret[prop] = val;
		}
	}
	return ret;
}
