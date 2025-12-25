import * as vscode from "vscode";
import { exec } from "child_process";
import { promisify } from "util";
import { getBranchPrefixes, getJiraBaseUrl } from "./config";

const execAsync = promisify(exec);

export class CraAubayTreeDataProvider
  implements vscode.TreeDataProvider<CraAubayItem>
{
  private _onDidChangeTreeData: vscode.EventEmitter<
    CraAubayItem | undefined | null | void
  > = new vscode.EventEmitter<CraAubayItem | undefined | null | void>();
  readonly onDidChangeTreeData: vscode.Event<
    CraAubayItem | undefined | null | void
  > = this._onDidChangeTreeData.event;

  private items: CraAubayItem[] = [];

  constructor() {
    this.refresh();
  }

  async refresh(): Promise<void> {
    const branchName = await this.getCurrentBranch();
    const prefixes = getBranchPrefixes();
    const jiraUrl = getJiraBaseUrl();

    const quickSettingsChildren = [
      new CraAubayItem(
        `URL Jira: ${jiraUrl || "Non configuré"}`,
        vscode.TreeItemCollapsibleState.None,
        undefined,
        "link-external"
      ),
      new CraAubayItem(
        `Préfixes: ${prefixes.length > 0 ? prefixes.join(", ") : "Aucun"}`,
        vscode.TreeItemCollapsibleState.None,
        undefined,
        "tag"
      ),
    ];

    this.items = [
      new CraAubayItem(
        `Branche: ${branchName}`,
        vscode.TreeItemCollapsibleState.None,
        undefined,
        "git-branch"
      ),
      new CraAubayItem(
        "Paramètres actuels",
        vscode.TreeItemCollapsibleState.Collapsed,
        quickSettingsChildren,
        "settings"
      ),
    ];
    this._onDidChangeTreeData.fire();
  }

  private async getCurrentBranch(): Promise<string> {
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders || workspaceFolders.length === 0) {
      return "Aucun workspace";
    }

    try {
      const { stdout } = await execAsync("git rev-parse --abbrev-ref HEAD", {
        cwd: workspaceFolders[0].uri.fsPath,
      });
      return stdout.trim() || "Aucune branche";
    } catch (error) {
      return "Non Git";
    }
  }

  getTreeItem(element: CraAubayItem): vscode.TreeItem {
    return element;
  }

  getChildren(element?: CraAubayItem): Thenable<CraAubayItem[]> {
    if (!element) {
      return Promise.resolve(this.items);
    }
    return Promise.resolve(element.children || []);
  }
}

export class CraAubayItem extends vscode.TreeItem {
  constructor(
    public readonly label: string,
    public readonly collapsibleState: vscode.TreeItemCollapsibleState,
    public readonly children?: CraAubayItem[],
    public readonly iconName?: string
  ) {
    super(label, collapsibleState);
    this.tooltip = `${this.label}`;
    if (iconName) {
      this.iconPath = new vscode.ThemeIcon(iconName);
    }
  }

  contextValue = "craAubayItem";
}
