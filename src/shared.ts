import * as vscode from "vscode";
import * as JSON5 from "json5";

export const configRoot = "packages/config/config/devices";

export async function readJSON(uri: vscode.Uri): Promise<Record<string, any>> {
  const fileContentRaw = await vscode.workspace.fs.readFile(uri);
  const fileContentString = Buffer.from(fileContentRaw).toString("utf8");
  return JSON5.parse(fileContentString);
}

export function resolveTemplateFile(
  workspace: vscode.WorkspaceFolder,
  filename: string
): vscode.Uri {
  const actualFilename = filename.replace(/^~\//, configRoot + "/");
  return vscode.Uri.joinPath(workspace.uri, actualFilename);
}
