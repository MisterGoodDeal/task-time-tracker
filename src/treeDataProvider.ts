import * as vscode from "vscode";
import { exec } from "child_process";
import { promisify } from "util";
import { getBranchPrefixes, getJiraBaseUrl } from "./config";
import {
  isTicketTracked,
  getCRATracking,
  calculateTotalTimeSpentInDays,
  pauseAllActiveTickets,
  startTicketTrackingIfExists,
} from "./craTracking";
import { ICRAItem } from "./types/cra.types";

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
  private ticketTrackingData: Map<
    string,
    { ticket: string; month: number; year: number }
  > = new Map();
  private monthTrackingData: Map<string, { month: number; year: number }> =
    new Map();
  private gitHeadWatcher?: vscode.FileSystemWatcher;
  private currentBranch: string = "";
  private refreshInterval?: NodeJS.Timeout;

  constructor() {
    this.refresh();
    this.setupGitWatcher();
    this.startAutoRefresh();
  }

  private startAutoRefresh() {
    this.refreshInterval = setInterval(() => {
      this.refresh();
    }, 60000);
  }

  private getMonthName(month: number): string {
    const months = [
      "janvier",
      "février",
      "mars",
      "avril",
      "mai",
      "juin",
      "juillet",
      "août",
      "septembre",
      "octobre",
      "novembre",
      "décembre",
    ];
    return months[month - 1] || "";
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
    if (newBranch !== this.currentBranch && this.currentBranch !== "") {
      // Mettre en pause tous les tickets en cours
      await pauseAllActiveTickets();

      // Extraire le ticket de la nouvelle branche
      const prefixes = getBranchPrefixes();
      const ticket = this.extractTicketFromBranch(newBranch, prefixes);

      // Si un ticket est détecté et qu'il est dans le suivi, démarrer automatiquement
      if (ticket) {
        await startTicketTrackingIfExists(ticket, newBranch);
      }

      this.currentBranch = newBranch;
      await this.refresh();
    } else if (this.currentBranch === "") {
      // Première initialisation
      this.currentBranch = newBranch;
      await this.refresh();
    }
  }

  async refresh(): Promise<void> {
    this.ticketTrackingData.clear();
    this.monthTrackingData.clear();
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

    const trackingItems = this.buildTrackingItems();

    this.items = [
      branchItem,
      ...trackingItems,
      new CraAubayItem(
        "Paramètres actuels",
        vscode.TreeItemCollapsibleState.Collapsed,
        quickSettingsChildren,
        "settings"
      ),
    ];
    this._onDidChangeTreeData.fire();
  }

  private buildTrackingItems(): CraAubayItem[] {
    const tracking = getCRATracking();
    if (tracking.length === 0) {
      return [];
    }

    return tracking.map((craItem: ICRAItem) => {
      const monthName = this.getMonthName(craItem.month);
      const title = `Suivi ${monthName} ${craItem.year}`;

      const ticketChildren = craItem.tickets.map((ticket) => {
        // Vérifier s'il y a une période en cours
        const hasActivePeriod = ticket.periods.some((p) => p.endDate === null);

        // Trouver la dernière période terminée pour afficher sa date de fin
        const completedPeriods = ticket.periods.filter(
          (p) => p.endDate !== null
        );
        const lastCompletedPeriod =
          completedPeriods.length > 0
            ? completedPeriods[completedPeriods.length - 1]
            : null;

        const endDateText = hasActivePeriod
          ? "En cours"
          : lastCompletedPeriod
          ? lastCompletedPeriod.endDate!.toLocaleDateString("fr-FR")
          : "En cours";

        // Calculer le temps total à partir de toutes les périodes
        const timeSpent = calculateTotalTimeSpentInDays(ticket);

        const timeSpentText =
          timeSpent > 0
            ? ` - ${timeSpent} jour${timeSpent > 1 ? "s" : ""}`
            : "";
        const ticketId = `ticket-${craItem.month}-${craItem.year}-${ticket.ticket}`;
        const contextValue = hasActivePeriod
          ? "ticketInProgress"
          : "ticketCompleted";

        const ticketData = {
          ticket: ticket.ticket,
          month: craItem.month,
          year: craItem.year,
          jiraUrl: ticket.jiraUrl,
          branchName: ticket.branchName,
        };

        this.ticketTrackingData.set(ticketId, ticketData);

        return new CraAubayItem(
          `${ticket.ticket} - ${endDateText}${timeSpentText}`,
          vscode.TreeItemCollapsibleState.None,
          undefined,
          hasActivePeriod ? "edit-session" : "coffee",
          "cra-aubay.checkoutBranch",
          ticketData,
          contextValue,
          ticketId,
          ticketData
        );
      });

      const craItemId = `craItem-${craItem.month}-${craItem.year}`;
      const craItemData = {
        month: craItem.month,
        year: craItem.year,
      };

      this.monthTrackingData.set(craItemId, craItemData);

      return new CraAubayItem(
        title,
        vscode.TreeItemCollapsibleState.Collapsed,
        ticketChildren.length > 0 ? ticketChildren : undefined,
        "calendar",
        undefined,
        undefined,
        "craItem",
        craItemId,
        craItemData
      );
    });
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

  getTicketTrackingData(itemId: string):
    | {
        ticket: string;
        month: number;
        year: number;
        jiraUrl?: string;
        branchName?: string;
      }
    | undefined {
    return this.ticketTrackingData.get(itemId);
  }

  getMonthTrackingData(
    itemId: string
  ): { month: number; year: number } | undefined {
    return this.monthTrackingData.get(itemId);
  }

  dispose(): void {
    if (this.gitHeadWatcher) {
      this.gitHeadWatcher.dispose();
    }
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
    }
    this._onDidChangeTreeData.dispose();
  }
}

export class CraAubayItem extends vscode.TreeItem {
  public readonly itemId?: string;
  public readonly ticketData?:
    | { ticket: string; month: number; year: number }
    | { month: number; year: number };

  constructor(
    public readonly label: string,
    public readonly collapsibleState: vscode.TreeItemCollapsibleState,
    public readonly children?: CraAubayItem[],
    public readonly iconName?: string,
    public readonly commandId?: string,
    public readonly commandArgs?: any,
    public readonly contextValueOverride?: string,
    itemId?: string,
    ticketData?:
      | { ticket: string; month: number; year: number }
      | { month: number; year: number }
  ) {
    super(label, collapsibleState);
    this.tooltip = `${this.label}`;
    this.itemId = itemId;
    this.ticketData = ticketData;
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
