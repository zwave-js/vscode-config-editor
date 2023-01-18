import * as vscode from "vscode";

import {
  getBlockRange,
  getImportSpecifierFromLine,
  readJSON,
  readTextFile,
  resolveTemplate,
  resolveTemplateFile,
} from "./shared";

export function register(
  workspace: vscode.WorkspaceFolder,
  context: vscode.ExtensionContext
) {
  return vscode.languages.registerDefinitionProvider(
    {
      language: "jsonc",
      pattern: new vscode.RelativePattern(
        workspace.uri,
        "packages/config/config/devices/*/*.json"
      ),
    },
    {
      async provideDefinition(document, position, token) {
        // Provide definitions for "$import" directives
        const line = document.lineAt(position.line).text;

        const imp = getImportSpecifierFromLine(line);
        if (!imp) {
          return undefined;
        }

        const file = resolveTemplateFile(workspace, imp.filename);
        if (!file) {
          return undefined;
        }

        // Find the template in the target file. For now do a simple text search
        // TODO: Figure out if we can use the JSON parser to find the template
        const fileContent = await readTextFile(file);
        const fileLines = fileContent.split("\n");
        const templateLineIndex = fileLines.findIndex((l) => {
          return l.trimStart().startsWith(`"${imp.importSpecifier}":`);
        });
        const targetRange = getBlockRange(
          fileContent,
          new vscode.Position(templateLineIndex + 1, 0)
        );

        // Underline the whole import specifier
        const startIndex =
          line.substring(0, position.character).lastIndexOf('"') + 1;
        let endIndex =
          line.substring(position.character).indexOf('"') + position.character;
        if (endIndex < position.character) {
          // No closing " found, select until the end of the line
          endIndex = line.length;
        }

        const link: vscode.LocationLink = {
          originSelectionRange: new vscode.Range(
            position.line,
            startIndex,
            position.line,
            endIndex
          ),
          targetUri: file,
          targetRange,
          // targetRange: new vscode.Range(
          //   templateLineIndex,
          //   0,
          //   templateLineIndex,
          //   fileLines[templateLineIndex].length
          // ),
        };

        return [link];
      },
    }
  );
}
