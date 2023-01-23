import * as vscode from "vscode";
import { LanguageService as JsonLanguageService } from "vscode-json-languageservice";
import { ConfigDocument } from "./configDocument";
import { Diagnostic } from "./diagnostics/diagnostics";

export class My {
	public constructor(
		workspace: vscode.WorkspaceFolder,
		context: vscode.ExtensionContext,
		ls: JsonLanguageService,
	) {
		this.workspace = workspace;
		this.context = context;
		this.ls = ls;
	}

	public readonly workspace: vscode.WorkspaceFolder;
	public readonly context: vscode.ExtensionContext;
	public readonly ls: JsonLanguageService;

	private _configDocument: ConfigDocument | undefined;
	public get configDocument(): ConfigDocument | undefined {
		return this._configDocument;
	}
	public set configDocument(value: ConfigDocument | undefined) {
		this._configDocument = value;
		this._onConfigDocumentChanged.fire(value);
	}
	private _onConfigDocumentChanged = new vscode.EventEmitter<
		ConfigDocument | undefined
	>();
	public get onConfigDocumentChanged(): vscode.Event<
		ConfigDocument | undefined
	> {
		return this._onConfigDocumentChanged.event;
	}

	private _diagnostics: Diagnostic[] = [];
	public get diagnostics(): Diagnostic[] {
		return this._diagnostics;
	}
	public set diagnostics(value: Diagnostic[]) {
		this._diagnostics = value;
		this._onDiagnosticsChanged.fire(value);
	}

	private _onDiagnosticsChanged = new vscode.EventEmitter<
		My["diagnostics"]
	>();
	public get onDiagnosticsChanged(): vscode.Event<My["diagnostics"]> {
		return this._onDiagnosticsChanged.event;
	}
}
