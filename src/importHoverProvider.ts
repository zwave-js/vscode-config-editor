import * as vscode from "vscode";

import {
  getImportSpecifierFromLine,
  readJSON,
  resolveTemplate,
  resolveTemplateFile,
} from "./shared";

export function register(
  workspace: vscode.WorkspaceFolder,
  context: vscode.ExtensionContext
) {
  return vscode.languages.registerHoverProvider(
    {
      language: "jsonc",
      pattern: new vscode.RelativePattern(
        workspace.uri,
        "packages/config/config/devices/*/*.json"
      ),
    },
    {
      async provideHover(document, position, token) {
        let line = document.lineAt(position.line).text.trim();

        const imp = getImportSpecifierFromLine(line);
        if (!imp) {
          return undefined;
        }

        const template = await resolveTemplate(
          workspace,
          imp.filename,
          imp.importSpecifier
        );
        if (!template) {
          return undefined;
        }

        const { $label, $description, ...$definition } = template;

        let documentation = `\`\`\`json
${JSON.stringify($definition, null, 2)}
\`\`\``;
        if ($description) {
          documentation = $description + "\n\n" + documentation;
        }
        if ($label) {
          documentation = `**${$label}**\n\n${documentation}`;
        }

        return {
          contents: [new vscode.MarkdownString(documentation)],
        };
      },
    }
  );
}
