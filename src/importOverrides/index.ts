import * as vscode from "vscode";
import { My } from "../my";
import { register as registerDecorations } from "./decorations";
import { register as registerUnnecessaryImportOverrideFixes } from "./fixUnnecessary";

export function register(my: My): vscode.Disposable[] {
	return [
		...registerUnnecessaryImportOverrideFixes(my),
		registerDecorations(my),
	];
}
