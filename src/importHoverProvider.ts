import * as vscode from "vscode";

import { readJSON, resolveTemplateFile } from "./shared";

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
        if (!line.startsWith(`"$import":`)) {
          return undefined;
        }

        line = line.substring(line.indexOf(":") + 1).trim();
        line = line.substring(line.indexOf('"') + 1);
        line = line.substring(0, line.indexOf('"'));
        if (!line.includes(".json#")) {
          return undefined;
        }

        const [filename, importSpecifier] = line.split("#");
        const uri = resolveTemplateFile(workspace, filename);

        const fileContent = await readJSON(uri);
        const $import = fileContent[importSpecifier];
        if (!$import) {
          return undefined;
        }

        const { $label, $description, ...$definition } = $import;

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
