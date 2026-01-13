import * as vscode from "vscode";

export enum DiagnosticType {
	UnnecessaryImportOverride,
	ImportOverride,
	AllowedMinMaxConflict,
}

export type Diagnostic =
	| UnnecessaryImportOverrideDiagnostic
	| ImportOverrideDiagnostic
	| AllowedMinMaxConflictDiagnostic;

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

export interface AllowedMinMaxConflictDiagnostic {
	type: DiagnosticType.AllowedMinMaxConflict;
	range: vscode.Range;
	localHasAllowed: boolean;
	templateHasAllowed: boolean;
}
