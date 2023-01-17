// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from "vscode";

import * as JSON5 from "json5";

const configRoot = "packages/config/config/devices";

const masterTemplateFilename = "templates/master_template.json";

export function register(context: vscode.ExtensionContext) {
  const workspace = vscode.workspace.workspaceFolders?.[0];
  if (!workspace) {
    return;
  }

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

        const ret: vscode.CompletionItem[] = [];

        console.debug("currentLine", currentLinePrefix);

        if (
          currentLinePrefix.startsWith(`"$import":`) &&
          currentLinePrefix.includes(`.json#`)
        ) {
          // We're in the import specifier, return valid imports
          const filenameAndImport = currentLinePrefix.substring(
            currentLinePrefix.lastIndexOf('"') + 1
          );
          const [filename, importSpecifier] = filenameAndImport.split("#");
          const actualFilename =
            filename === "~/templates/master_template.json"
              ? masterTemplateFilename
              : filename;

          try {
            const uri = vscode.Uri.joinPath(
              workspace.uri,
              configRoot,
              actualFilename
            );
            const fileContentRaw = await vscode.workspace.fs.readFile(uri);
            const fileContentString =
              Buffer.from(fileContentRaw).toString("utf8");
            const fileContent = JSON5.parse(fileContentString);

            const importSuggestions = Object.entries<Record<string, any>>(
              fileContent
            ).map(([key, $import]) => {
              const label = $import.$label ?? key;
              const detail = $import.$label ? key : undefined;
              let documentation = `\`\`\`json
${JSON.stringify(fileContent[key], null, 2)}
\`\`\``;
              if ("$description" in $import) {
                documentation = $import.$description + "\n\n" + documentation;
              }
              documentation = `**${label}**\n\n` + documentation;

              if (key === "base_enable_disable") {
                console.dir({ key, label, detail, documentation });
              }

              const completionItem = new vscode.CompletionItem(
                label,
                vscode.CompletionItemKind.Snippet
              );
              completionItem.detail = detail;
              completionItem.insertText = key;
              completionItem.documentation = new vscode.MarkdownString(
                documentation
              );
              completionItem.range = new vscode.Range(
                position.translate(0, -importSpecifier.length),
                position
              );
              return completionItem;
            });

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
            importMasterTemplate.additionalTextEdits = [
              vscode.TextEdit.insert(
                position.translate(0, importMasterTemplate.sortText.length),
                ","
              ),
            ];

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
