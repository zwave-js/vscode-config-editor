import { randomBytes } from "crypto";
import { Uri, Webview } from "vscode";

export function getUri(
	webview: Webview,
	extensionUri: Uri,
	pathList: string[],
): Uri {
	return webview.asWebviewUri(Uri.joinPath(extensionUri, ...pathList));
}

export function getNonce(): string {
	let text = "";
	const bytes = randomBytes(32);
	const possible =
		"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
	for (let i = 0; i < bytes.length; i++) {
		text += possible.charAt(bytes[i] % possible.length);
	}
	return text;
}
