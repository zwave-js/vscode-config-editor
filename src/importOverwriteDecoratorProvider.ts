import * as vscode from "vscode";
import {
	DiagnosticType,
	ImportOverrideDiagnostic,
	UnnecessaryImportOverrideDiagnostic,
} from "./diagnostics/diagnostics";
import { My } from "./my";

const red = "255, 0, 0";
const blue = "255, 255, 0";

export function register(my: My): vscode.Disposable {
	const overwrittenValue = vscode.window.createTextEditorDecorationType({
		before: {
			contentText: "●",
			width: "0",
			margin: "0 1em 0 -1em",
			color: `rgba(${blue}, 0.8)`,
		},
	});
	const overwrittenValueBg = vscode.window.createTextEditorDecorationType({
		isWholeLine: true,
		// backgroundColor: `rgba(${blue}, 0.1)`,
	});
	const unchangedValue = vscode.window.createTextEditorDecorationType({
		before: {
			contentText: "●",
			width: "0",
			margin: "0 1em 0 -1em",
			color: `rgba(${red}, 0.65)`,
		},
	});
	const unchangedValueBg = vscode.window.createTextEditorDecorationType({
		isWholeLine: true,
		backgroundColor: `rgba(${red}, 0.1)`,
	});

	const activeEditor = vscode.window.activeTextEditor;

	return my.onDiagnosticsChanged((diag) => {
		if (!activeEditor) return;

		const valueDecorations: vscode.DecorationOptions[] = [];
		const lineDecorations: vscode.DecorationOptions[] = [];
		const unchangedValueDecorations: vscode.DecorationOptions[] = [];
		const unchangedLineDecorations: vscode.DecorationOptions[] = [];

		const overrideDiagnostics = diag.filter(
			(d): d is ImportOverrideDiagnostic =>
				d.type === DiagnosticType.ImportOverride,
		);
		const unnecessaryOverrideDiagnostics = diag.filter(
			(d): d is UnnecessaryImportOverrideDiagnostic =>
				d.type === DiagnosticType.UnnecessaryImportOverride,
		);

		for (const diag of overrideDiagnostics) {
			const range = diag.range;
			const isPrimitive =
				typeof diag.originalValue === "string" ||
				typeof diag.originalValue === "number" ||
				typeof diag.originalValue === "boolean";

			const hoverMessage = isPrimitive
				? new vscode.MarkdownString(
						`This property overwrites value \`${diag.originalValue}\` from the imported template.`,
				  )
				: new vscode.MarkdownString(
						`This property overwrites this value from the imported template:
\`\`\`
${JSON.stringify(diag.originalValue, null, 2)}
\`\`\``,
				  );

			valueDecorations.push({ range });
			lineDecorations.push({ range, hoverMessage });
		}

		for (const diag of unnecessaryOverrideDiagnostics) {
			const range = diag.range;
			const hoverMessage = new vscode.MarkdownString(
				"This property unnecessarily overwrites the imported template.",
			);

			unchangedValueDecorations.push({ range });
			unchangedLineDecorations.push({ range, hoverMessage });
		}

		activeEditor.setDecorations(overwrittenValue, valueDecorations);
		activeEditor.setDecorations(overwrittenValueBg, lineDecorations);
		activeEditor.setDecorations(unchangedValue, unchangedValueDecorations);
		activeEditor.setDecorations(unchangedValueBg, unchangedLineDecorations);
	});
}
