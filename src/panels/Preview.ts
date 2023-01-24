import * as vscode from "vscode";
import {
	IPCMessage,
	IPCMessageBase,
	IPCMessageCallback,
	IPCMessage_SetText,
} from "./shared/protocol";
import { getNonce, getUri } from "./utils";

export class PreviewPanel {
	public static currentPanel: PreviewPanel | undefined;
	private readonly _panel: vscode.WebviewPanel;
	private _disposables: vscode.Disposable[] = [];

	private constructor(panel: vscode.WebviewPanel, extensionUri: vscode.Uri) {
		this._panel = panel;
		this._panel.webview.html = this._getWebviewContent(
			this._panel.webview,
			extensionUri,
		);
		this._setWebviewMessageListener(this._panel.webview);
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
		const contentPolicy = `default-src 'none'; style-src 'nonce-${nonce}'; font-src ${webview.cspSource}; img-src ${webview.cspSource} https:; script-src 'nonce-${nonce}';`;

		// Tip: Install the es6-string-html VS Code extension to enable code highlighting below
		return /*html*/ `
			<!DOCTYPE html>
			<html lang="en">
			<head>
				<meta charset="UTF-8">
				<meta name="viewport" content="width=device-width, initial-scale=1.0">
				<meta http-equiv="Content-Security-Policy" content="${contentPolicy}">
				<title>Hello World!</title>
				<style nonce="${nonce}">
					body {
						padding: 1rem;
					}
				</style>
			</head>
			<body>
				<div id="root"></div>
				<script type="module" nonce="${nonce}" src="${webviewUri.toString()}"></script>
			</body>
			</html>
		`;
	}

	private callbacks = new Map<number, IPCMessageCallback>();
	public sendMessage(
		message: IPCMessage,
		callback?: IPCMessageCallback,
	): void {
		if (callback) {
			message._id = ((message._id ?? 0) + 1) % 2 ** 30;
			if (message._id === 0) message._id = 1;

			this.callbacks.set(message._id, callback);
		}
		void this._panel.webview.postMessage(message);
	}

	public sendMessageAsync(message: IPCMessage): Promise<IPCMessageBase> {
		return new Promise<IPCMessageBase>((resolve) => {
			this.sendMessage(message, resolve);
		});
	}

	private _setWebviewMessageListener(webview: vscode.Webview) {
		webview.onDidReceiveMessage(
			(message: IPCMessage) => {
				if (message._id && this.callbacks.has(message._id)) {
					this.callbacks.get(message._id)?.(message);
					this.callbacks.delete(message._id);
				} else {
					this._messageHandler(message);
				}
			},
			undefined,
			this._disposables,
		);
	}

	private _messageHandler(message: IPCMessage) {
		console.warn("Unhandled message: ", message);
	}

	public async setMessageText(text: string): Promise<void> {
		const result = await this.sendMessageAsync({
			command: "setText",
			text,
		});
		void vscode.window.showInformationMessage(
			(result as IPCMessage_SetText).text,
		);
	}

	public static render(extensionUri: vscode.Uri): void {
		if (PreviewPanel.currentPanel) {
			PreviewPanel.currentPanel._panel.reveal(vscode.ViewColumn.Beside);
		} else {
			const panel = vscode.window.createWebviewPanel(
				"config-preview",
				"Preview",
				{
					viewColumn: vscode.ViewColumn.Beside,
					preserveFocus: true,
				},
				{
					enableScripts: true,
					localResourceRoots: [
						vscode.Uri.joinPath(extensionUri, "out"),
					],
				},
			);

			PreviewPanel.currentPanel = new PreviewPanel(panel, extensionUri);
		}
	}

	public dispose(): void {
		PreviewPanel.currentPanel = undefined;

		this._panel.dispose();

		while (this._disposables.length) {
			const disposable = this._disposables.pop();
			if (disposable) {
				disposable.dispose();
			}
		}
	}
}
