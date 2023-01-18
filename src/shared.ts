import * as vscode from "vscode";
import * as JSON5 from "json5";

export const configRoot = "packages/config/config/devices";

export async function readJSON(uri: vscode.Uri): Promise<Record<string, any>> {
  const fileContentRaw = await vscode.workspace.fs.readFile(uri);
  const fileContentString = Buffer.from(fileContentRaw).toString("utf8");
  return JSON5.parse(fileContentString);
}

export async function readTextFile(uri: vscode.Uri): Promise<string> {
  const fileContentRaw = await vscode.workspace.fs.readFile(uri);
  return Buffer.from(fileContentRaw).toString("utf8");
}

export function resolveTemplateFile(
  workspace: vscode.WorkspaceFolder,
  filename: string
): vscode.Uri {
  const actualFilename = filename.replace(/^~\//, configRoot + "/");
  return vscode.Uri.joinPath(workspace.uri, actualFilename);
}

export function getImportSpecifierFromLine(line: string):
  | {
      filename: string;
      importSpecifier: string;
    }
  | undefined {
  line = line.trim();
  if (!line.startsWith(`"$import":`)) {
    return undefined;
  }

  line = line.substring(line.indexOf(":") + 1).trim();
  line = line.substring(line.indexOf('"') + 1);
  if (line.includes('"')) {
    line = line.substring(0, line.indexOf('"'));
  }

  if (!line.includes(".json#")) {
    return undefined;
  }

  const [filename, importSpecifier] = line.split("#");
  return { filename, importSpecifier };
}

export async function resolveTemplate(
  workspace: vscode.WorkspaceFolder,
  filename: string,
  importSpecifier: string
): Promise<Record<string, any> | undefined> {
  const uri = resolveTemplateFile(workspace, filename);
  const fileContent = await readJSON(uri);
  return fileContent[importSpecifier];
}

export function formatTemplateDefinition(
  template: Record<string, any>,
  label: string | undefined,
  description: string | undefined
): string {
  let ret = `\`\`\`json
${JSON.stringify(template, null, 2)}
\`\`\``;
  if (description) {
    ret = description + "\n\n" + ret;
  }
  if (label) {
    ret = `**${label}**\n\n${ret}`;
  }
  return ret;
}

function getLineIndentation(line: string): string {
  return line.match(/^(\s*)/)?.[1] ?? "";
}

export function getBlockRange(
  jsonDoc: string,
  position: vscode.Position
): vscode.Range {
  const lines = jsonDoc.split("\n");
  let start = position.line;
  let end = position.line;
  const initialLineIndent = getLineIndentation(lines[start]).length;
  while (start > 0) {
    const line = lines[start];
    if (
      getLineIndentation(line).length < initialLineIndent &&
      line.trim().endsWith("{")
    ) {
      break;
    }
    start--;
  }
  while (end < lines.length) {
    const line = lines[end];
    if (
      getLineIndentation(line).length < initialLineIndent &&
      line.trim().startsWith("}")
    ) {
      break;
    }
    end++;
  }
  return new vscode.Range(
    new vscode.Position(start, getLineIndentation(lines[start]).length),
    new vscode.Position(end, getLineIndentation(lines[end]).length + 1)
  );
}
