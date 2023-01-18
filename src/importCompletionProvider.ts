// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from "vscode";
import {
  getImportSpecifierFromLine,
  readJSON,
  resolveTemplateFile,
} from "./shared";

export function register(
  workspace: vscode.WorkspaceFolder,
  context: vscode.ExtensionContext
) {
  return vscode.languages.registerCompletionItemProvider(
    {
      language: "jsonc",
      pattern: new vscode.RelativePattern(
        workspace.uri,
        "packages/config/config/devices/*/*.json"
      ),
    },
    {
      async provideCompletionItems(document, position, token, context) {
        const currentLinePrefix = document
          .lineAt(position.line)
          .text.substring(0, position.character)
          .trimStart();
        const currentLineSuffix = document
          .lineAt(position.line)
          .text.substring(position.character)
          .trimEnd();

        const ret: vscode.CompletionItem[] = [];

        const imp = getImportSpecifierFromLine(currentLinePrefix);

        if (imp) {
          // We're in the import specifier, return valid imports
          const uri = resolveTemplateFile(workspace, imp.filename);

          try {
            const fileContent = await readJSON(uri);

            const importSuggestions = Object.entries<Record<string, any>>(
              fileContent
            ).map(
              ([key, { $label: label = key, $description, ...$import }]) => {
                let documentation = `\`\`\`json
${JSON.stringify($import, null, 2)}
\`\`\``;
                if ($description) {
                  documentation = $description + "\n\n" + documentation;
                }

                const completionItem: vscode.CompletionItem =
                  new vscode.CompletionItem(
                    key, // Not sure why, but this CANNOT be $label or the item will disappear
                    vscode.CompletionItemKind.Snippet
                  );
                completionItem.detail = label;
                completionItem.insertText = key;
                completionItem.documentation = new vscode.MarkdownString(
                  documentation
                );
                completionItem.range = new vscode.Range(
                  position.translate(0, -imp.importSpecifier.length),
                  position
                );
                return completionItem;
              }
            );

            ret.push(...importSuggestions);
          } catch (e) {
            debugger;
          }
        } else {
          // Provide an import suggestion for the master template
          const masterTemplateImport = `"$import": "~/templates/master_template.json#`;
          if (
            // Requested completions without anything typed
            currentLinePrefix === `"` ||
            // Requested completions with a partial import statement
            (currentLinePrefix.length > 1 &&
              masterTemplateImport.startsWith(currentLinePrefix) &&
              masterTemplateImport !== currentLinePrefix)
          ) {
            const importMasterTemplate = new vscode.CompletionItem(
              "Import from master template",
              vscode.CompletionItemKind.Folder
            );
            importMasterTemplate.insertText = masterTemplateImport.substring(
              currentLinePrefix.length
            );
            // Avoid partial overwrites in the current line
            importMasterTemplate.range = new vscode.Range(position, position);
            // Try putting the snippet at the front
            importMasterTemplate.sortText = "$import$0master";

            // Put a comma after the import
            if (!currentLineSuffix.includes(",")) {
              importMasterTemplate.additionalTextEdits = [
                vscode.TextEdit.insert(
                  position.translate(0, importMasterTemplate.sortText.length),
                  ","
                ),
              ];
            }

            // Trigger completions again, so an import can be chosen from the selected file
            importMasterTemplate.command = {
              command: "editor.action.triggerSuggest",
              title: "Re-trigger completions...",
            };
            ret.push(importMasterTemplate);
          }

          // TODO: Provide an import suggestion for the nearest manufacturer template(s)
        }

        return new vscode.CompletionList(ret, false);
      },
    },
    ...["\t", "$", "#", '"', "~"]
  );
}
