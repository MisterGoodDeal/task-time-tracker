import * as vscode from "vscode";
import { exec } from "child_process";
import { promisify } from "util";
import { getBranchPrefixes, getJiraBaseUrl } from "./config";
import { isTicketTracked } from "./craTracking";

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
  private ticketData: Map<string, { ticket: string; jiraUrl: string }> =
    new Map();
  private gitHeadWatcher?: vscode.FileSystemWatcher;
  private currentBranch: string = "";

  constructor() {
    this.refresh();
    this.setupGitWatcher();
  }

  private setupGitWatcher(): void {
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders || workspaceFolders.length === 0) {
      return;
    }

    const gitHeadPath = vscode.Uri.joinPath(
      workspaceFolders[0].uri,
      ".git",
      "HEAD"
    );

    this.gitHeadWatcher = vscode.workspace.createFileSystemWatcher(
      new vscode.RelativePattern(workspaceFolders[0], ".git/HEAD")
    );

    this.gitHeadWatcher.onDidChange(() => {
      this.checkBranchChange();
    });

    this.gitHeadWatcher.onDidCreate(() => {
      this.checkBranchChange();
    });
  }

  private async checkBranchChange(): Promise<void> {
    const newBranch = await this.getCurrentBranch();
    if (newBranch !== this.currentBranch) {
      this.currentBranch = newBranch;
      await this.refresh();
    }
  }

  async refresh(): Promise<void> {
    const branchName = await this.getCurrentBranch();
    this.currentBranch = branchName;
    const prefixes = getBranchPrefixes();
    const jiraUrl = getJiraBaseUrl();

    const ticket = this.extractTicketFromBranch(branchName, prefixes);

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

    const branchItemId = `branch-${branchName}`;
    if (ticket) {
      this.ticketData.set(branchItemId, { ticket, jiraUrl });
    }

    let contextValue = "noTicket";
    if (ticket) {
      const isTracked = isTicketTracked(ticket);
      contextValue = isTracked ? "hasTicketTracked" : "hasTicket";
    }

    const branchItem = new CraAubayItem(
      `Branche: ${branchName}`,
      vscode.TreeItemCollapsibleState.None,
      undefined,
      "git-branch",
      ticket ? "cra-aubay.openJiraTicket" : undefined,
      ticket ? branchItemId : undefined,
      contextValue,
      branchItemId
    );

    this.items = [
      branchItem,
      new CraAubayItem(
        "Paramètres actuels",
        vscode.TreeItemCollapsibleState.Collapsed,
        quickSettingsChildren,
        "settings"
      ),
    ];
    this._onDidChangeTreeData.fire();
  }

  private extractTicketFromBranch(
    branchName: string,
    prefixes: string[]
  ): string | null {
    for (const prefix of prefixes) {
      const regex = new RegExp(`${prefix}-(\\d+)`, "i");
      const match = branchName.match(regex);
      if (match) {
        return `${prefix}-${match[1]}`;
      }
    }
    return null;
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

  getTicketData(
    itemId: string
  ): { ticket: string; jiraUrl: string } | undefined {
    return this.ticketData.get(itemId);
  }

  async getCurrentTicketData(): Promise<{
    ticket: string;
    jiraUrl: string;
  } | null> {
    const branchName = await this.getCurrentBranch();
    const itemId = `branch-${branchName}`;
    return this.ticketData.get(itemId) || null;
  }

  dispose(): void {
    if (this.gitHeadWatcher) {
      this.gitHeadWatcher.dispose();
    }
  }
}

export class CraAubayItem extends vscode.TreeItem {
  public readonly itemId?: string;

  constructor(
    public readonly label: string,
    public readonly collapsibleState: vscode.TreeItemCollapsibleState,
    public readonly children?: CraAubayItem[],
    public readonly iconName?: string,
    public readonly commandId?: string,
    public readonly commandArgs?: any,
    public readonly contextValueOverride?: string,
    itemId?: string
  ) {
    super(label, collapsibleState);
    this.tooltip = `${this.label}`;
    this.itemId = itemId;
    if (iconName) {
      this.iconPath = new vscode.ThemeIcon(iconName);
    }
    if (commandId) {
      this.command = {
        command: commandId,
        title: this.label,
        arguments: commandArgs ? [commandArgs] : [],
      };
    }
    if (contextValueOverride) {
      this.contextValue = contextValueOverride;
    } else {
      this.contextValue = "craAubayItem";
    }
  }
}
