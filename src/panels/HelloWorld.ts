import * as vscode from "vscode";
import { getNonce, getUri } from "./utils";

export class HelloWorldPanel {
	public static currentPanel: HelloWorldPanel | undefined;
	private readonly _panel: vscode.WebviewPanel;
	private _disposables: vscode.Disposable[] = [];

	private constructor(panel: vscode.WebviewPanel, extensionUri: vscode.Uri) {
		this._panel = panel;
		this._panel.webview.html = this._getWebviewContent(
			this._panel.webview,
			extensionUri,
		);
		this._panel.onDidDispose(() => this.dispose(), null, this._disposables);
	}

	private _getWebviewContent(
		webview: vscode.Webview,
		extensionUri: vscode.Uri,
	) {
		const webviewUri = getUri(webview, extensionUri, [
			"out",
			"webview-root.js",
		]);
		const nonce = getNonce();
		const contentPolicy = `default-src 'none'; style-src ${webview.cspSource}; font-src ${webview.cspSource}; img-src ${webview.cspSource} https:; script-src 'nonce-${nonce}';`;

		// Tip: Install the es6-string-html VS Code extension to enable code highlighting below
		return /*html*/ `
			<!DOCTYPE html>
			<html lang="en">
			<head>
				<meta charset="UTF-8">
				<meta name="viewport" content="width=device-width, initial-scale=1.0">
				<meta http-equiv="Content-Security-Policy" content="${contentPolicy}">
				<title>Hello World!</title>
			</head>
			<body>
				<div id="root"></div>
				<script type="module" nonce="${nonce}" src="${webviewUri.toString()}"></script>
			</body>
			</html>
		`;
	}

	public static render(extensionUri: vscode.Uri): void {
		if (HelloWorldPanel.currentPanel) {
			HelloWorldPanel.currentPanel._panel.reveal(vscode.ViewColumn.One);
		} else {
			const panel = vscode.window.createWebviewPanel(
				"hello-world",
				"Hello World",
				vscode.ViewColumn.One,
				{
					enableScripts: true,
					localResourceRoots: [
						vscode.Uri.joinPath(extensionUri, "out"),
					],
				},
			);

			HelloWorldPanel.currentPanel = new HelloWorldPanel(
				panel,
				extensionUri,
			);
		}
	}

	public dispose(): void {
		HelloWorldPanel.currentPanel = undefined;

		this._panel.dispose();

		while (this._disposables.length) {
			const disposable = this._disposables.pop();
			if (disposable) {
				disposable.dispose();
			}
		}
	}
}
