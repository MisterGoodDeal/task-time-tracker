import * as vscode from "vscode";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

export const getCurrentBranch = async (): Promise<string> => {
  const workspaceFolders = vscode.workspace.workspaceFolders;
  if (!workspaceFolders || workspaceFolders.length === 0) {
    return "Aucun workspace";
  }

  try {
    const { stdout } = await execAsync("git rev-parse --abbrev-ref HEAD", {
      cwd: workspaceFolders[0].uri.fsPath,
    });
    return stdout.trim() || "Aucune branche";
  } catch {
    return "Non Git";
  }
};

export const getGitAuthor = async (): Promise<string> => {
  const workspaceFolders = vscode.workspace.workspaceFolders;
  if (!workspaceFolders || workspaceFolders.length === 0) {
    return "Unknown";
  }

  try {
    const { stdout: name } = await execAsync("git config user.name", {
      cwd: workspaceFolders[0].uri.fsPath,
    });
    const { stdout: email } = await execAsync("git config user.email", {
      cwd: workspaceFolders[0].uri.fsPath,
    });
    return `${name.trim()} <${email.trim()}>`;
  } catch {
    try {
      const { stdout: name } = await execAsync("git config user.name", {
        cwd: workspaceFolders[0].uri.fsPath,
      });
      return name.trim() || "Unknown";
    } catch {
      return "Unknown";
    }
  }
};

export const extractTicketFromBranch = (
  branchName: string,
  prefixes: readonly string[]
): string | null => {
  if (prefixes.length === 0) {
    return branchName;
  }

  for (const prefix of prefixes) {
    const regex = new RegExp(`${prefix}-(\\d+)`, "i");
    const match = branchName.match(regex);
    if (match) {
      return `${prefix}-${match[1]}`;
    }
  }
  return null;
};

