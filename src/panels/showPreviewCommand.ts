import * as vscode from "vscode";
import { My } from "../my";
import { PreviewPanel } from "./Preview";

export function registerShowPreviewCommand(my: My): vscode.Disposable[] {
	const showPanel = () => PreviewPanel.render(my.context.extensionUri);

	return [
		vscode.commands.registerCommand("configEditor.open", async () => {
			// Render the preview on click
			if (my.configDocument) await showPanel();
		}),

		my.onConfigDocumentChanged(async (change) => {
			// Show/hide the preview button
			await vscode.commands.executeCommand(
				"setContext",
				"configEditor.hasConfigDocument",
				!!change.current,
			);

			// Update open previews, but don't automatically open a new one
			if (change.current && PreviewPanel.currentPanel) {
				await showPanel();
			}
		}),
	];
}
