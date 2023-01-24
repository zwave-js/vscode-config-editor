import * as vscode from "vscode";
import { My } from "../my";
import { generateImportOverrideDiagnostics } from "./importOverrideDiagnostics";

export function registerDiagnosticsProvider(my: My): vscode.Disposable {
	return my.onConfigDocumentChanged((change) => {
		if (change.type === "closed" || !vscode.window.activeTextEditor) {
			my.diagnostics = [];
			return;
		}

		my.diagnostics = [...generateImportOverrideDiagnostics(change.current)];
	});
}
