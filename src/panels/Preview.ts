import {
	createDeferredPromise,
	DeferredPromise,
} from "alcalzone-shared/deferred-promise";
import * as vscode from "vscode";
import { IPCMessage, IPCMessageCallback } from "./shared/protocol";
import { getNonce, getUri } from "./utils";

export class PreviewPanel {
	public static currentPanel: PreviewPanel | undefined;
	private readonly _panel: vscode.WebviewPanel;
	private _disposables: vscode.Disposable[] = [];

	private constructor(panel: vscode.WebviewPanel, extensionUri: vscode.Uri) {
		this._panel = panel;
		this._ready = createDeferredPromise();
		this._setWebviewMessageListener(this._panel.webview);

		this._panel.webview.html = this._getWebviewContent(
			this._panel.webview,
			extensionUri,
		);
		this._panel.onDidDispose(() => this.dispose(), null, this._disposables);
	}

	private _ready: DeferredPromise<boolean>;
	public ensureReady(): Promise<boolean> {
		return this._ready;
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
		const styleUri = getUri(webview, extensionUri, [
			"out",
			"webview-root.css",
		]);

		// Tip: Install the es6-string-html VS Code extension to enable code highlighting below
		return /*html*/ `
			<!DOCTYPE html>
			<html lang="en">
			<head>
				<meta charset="UTF-8">
				<meta name="viewport" content="width=device-width, initial-scale=1.0">
				<meta http-equiv="Content-Security-Policy" content="${contentPolicy}">
				<title>Hello World!</title>
				<link rel="stylesheet" href="${styleUri.toString()}">
			</head>
			<body>
				<div id="root"></div>
				<script type="module" nonce="${nonce}" src="${webviewUri.toString()}"></script>
			</body>
			</html>
		`;
	}

	private callbacks = new Map<number, IPCMessageCallback>();
	private sendMessage(
		message: IPCMessage,
		callback?: IPCMessageCallback,
	): void {
		if (callback) {
			// FIXME: This is bullshit
			message._id = ((message._id ?? 0) + 1) % 2 ** 30;
			if (message._id === 0) message._id = 1;

			this.callbacks.set(message._id, callback);
		}
		void this._panel.webview.postMessage(message);
	}

	private sendMessageAsync(message: IPCMessage): Promise<IPCMessage> {
		return new Promise<IPCMessage>((resolve) => {
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
		if (message.command === "ready") {
			this._ready.resolve(true);
			return;
		}
		console.warn("Unhandled message: ", message);
	}

	public static async render(extensionUri: vscode.Uri): Promise<void> {
		if (PreviewPanel.currentPanel) {
			PreviewPanel.currentPanel._panel.reveal(
				vscode.ViewColumn.Beside,
				true,
			);
		} else {
			const panel = vscode.window.createWebviewPanel(
				"config-preview",
				"Config preview",
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
		await PreviewPanel.currentPanel.ensureReady();
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

	// ------------------------------------------------------------
	// Here follow IPC methods

	public renderParam(
		param: Record<string, any> | undefined,
		overwrittenProperties: string[] | undefined,
	): void {
		this.sendMessage({
			command: "renderParam",
			param,
			overwrittenProperties,
		});
	}
}
