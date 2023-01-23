import * as vscode from "vscode";
import { My } from "../my";
import { generateImportOverrideDiagnostics } from "./importOverrideDiagnostics";

export function registerDiagnosticsProvider(my: My): vscode.Disposable {
	return my.onConfigDocumentChanged((doc) => {
		if (!doc || !vscode.window.activeTextEditor) {
			my.diagnostics = [];
			return;
		}

		my.diagnostics = [...generateImportOverrideDiagnostics(doc)];
	});
}
