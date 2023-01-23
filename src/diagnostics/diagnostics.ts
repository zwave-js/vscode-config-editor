import * as vscode from "vscode";

export enum DiagnosticType {
	UnnecessaryImportOverride,
	ImportOverride,
}

export type Diagnostic =
	| UnnecessaryImportOverrideDiagnostic
	| ImportOverrideDiagnostic;

export interface UnnecessaryImportOverrideDiagnostic {
	type: DiagnosticType.UnnecessaryImportOverride;
	range: vscode.Range;
}

export interface ImportOverrideDiagnostic {
	type: DiagnosticType.ImportOverride;
	range: vscode.Range;
	value: any;
	originalValue: any;
}
