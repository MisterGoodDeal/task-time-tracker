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
import { ICRAItem, ICRATicket, ICRATicketPeriod } from "./types/cra.types";
import { TicketData, MonthAndYearData } from "./types/common.types";

const execAsync = promisify(exec);

interface TicketDataMap {
  ticket: string;
  jiraUrl: string;
}

export class CraAubayTreeDataProvider
  implements vscode.TreeDataProvider<CraAubayItem>, vscode.Disposable
{
  private readonly _onDidChangeTreeData: vscode.EventEmitter<
    CraAubayItem | undefined | null | void
  > = new vscode.EventEmitter<CraAubayItem | undefined | null | void>();
  readonly onDidChangeTreeData: vscode.Event<
    CraAubayItem | undefined | null | void
  > = this._onDidChangeTreeData.event;

  private items: CraAubayItem[] = [];
  private readonly ticketData: Map<string, TicketDataMap> = new Map();
  private readonly ticketTrackingData: Map<string, TicketData> = new Map();
  private readonly monthTrackingData: Map<string, MonthAndYearData> = new Map();
  private gitHeadWatcher?: vscode.FileSystemWatcher;
  private currentBranch: string = "";
  private refreshInterval?: NodeJS.Timeout;

  constructor() {
    this.refresh();
    this.setupGitWatcher();
    this.startAutoRefresh();
  }

  private readonly startAutoRefresh = (): void => {
    this.refreshInterval = setInterval(() => {
      this.refresh();
    }, 60000);
  };

  private readonly getMonthName = (month: number): string => {
    const months: readonly string[] = [
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
  };

  private readonly setupGitWatcher = (): void => {
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders || workspaceFolders.length === 0) {
      return;
    }

    this.gitHeadWatcher = vscode.workspace.createFileSystemWatcher(
      new vscode.RelativePattern(workspaceFolders[0], ".git/HEAD")
    );

    this.gitHeadWatcher.onDidChange(() => {
      this.checkBranchChange();
    });

    this.gitHeadWatcher.onDidCreate(() => {
      this.checkBranchChange();
    });
  };

  private readonly checkBranchChange = async (): Promise<void> => {
    const newBranch = await this.getCurrentBranch();
    if (newBranch !== this.currentBranch && this.currentBranch !== "") {
      await pauseAllActiveTickets();

      const prefixes = getBranchPrefixes();
      const ticket = this.extractTicketFromBranch(newBranch, prefixes);

      if (ticket) {
        await startTicketTrackingIfExists(ticket, newBranch);
      }

      this.currentBranch = newBranch;
      await this.refresh();
    } else if (this.currentBranch === "") {
      this.currentBranch = newBranch;
      await this.refresh();
    }
  };

  readonly refresh = async (): Promise<void> => {
    this.ticketTrackingData.clear();
    this.monthTrackingData.clear();
    const branchName = await this.getCurrentBranch();
    this.currentBranch = branchName;
    const prefixes = getBranchPrefixes();
    const jiraUrl = getJiraBaseUrl();

    const ticket = this.extractTicketFromBranch(branchName, prefixes);

    const quickSettingsChildren: CraAubayItem[] = [
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

    let contextValue: string = "noTicket";
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
      undefined,
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
  };

  private readonly buildTrackingItems = (): CraAubayItem[] => {
    const tracking = getCRATracking();
    if (tracking.length === 0) {
      return [];
    }

    return tracking.map((craItem: ICRAItem): CraAubayItem => {
      const monthName = this.getMonthName(craItem.month);
      const title = `Suivi ${monthName} ${craItem.year}`;

      const ticketChildren = craItem.tickets.map(
        (ticket: ICRATicket): CraAubayItem => {
          const hasActivePeriod = ticket.periods.some(
            (p: ICRATicketPeriod) => p.endDate === null
          );

          const completedPeriods = ticket.periods.filter(
            (p: ICRATicketPeriod) => p.endDate !== null
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

          const timeSpent = calculateTotalTimeSpentInDays(ticket);

          const timeSpentText =
            timeSpent > 0
              ? ` - ${timeSpent} jour${timeSpent > 1 ? "s" : ""}`
              : "";
          const ticketId = `ticket-${craItem.month}-${craItem.year}-${ticket.ticket}`;
          const contextValue = hasActivePeriod
            ? "ticketInProgress"
            : "ticketCompleted";

          const ticketData: TicketData = {
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
        }
      );

      const craItemId = `craItem-${craItem.month}-${craItem.year}`;
      const craItemData: MonthAndYearData = {
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
  };

  private readonly extractTicketFromBranch = (
    branchName: string,
    prefixes: string[]
  ): string | null => {
    for (const prefix of prefixes) {
      const regex = new RegExp(`${prefix}-(\\d+)`, "i");
      const match = branchName.match(regex);
      if (match) {
        return `${prefix}-${match[1]}`;
      }
    }
    return null;
  };

  private readonly getCurrentBranch = async (): Promise<string> => {
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

  readonly getTreeItem = (element: CraAubayItem): vscode.TreeItem => {
    return element;
  };

  readonly getChildren = (element?: CraAubayItem): Thenable<CraAubayItem[]> => {
    if (!element) {
      return Promise.resolve(this.items);
    }
    return Promise.resolve(element.children || []);
  };

  readonly getTicketData = (itemId: string): TicketDataMap | undefined => {
    return this.ticketData.get(itemId);
  };

  readonly getCurrentTicketData = async (): Promise<TicketDataMap | null> => {
    const branchName = await this.getCurrentBranch();
    const itemId = `branch-${branchName}`;
    return this.ticketData.get(itemId) || null;
  };

  readonly getTicketTrackingData = (itemId: string): TicketData | undefined => {
    return this.ticketTrackingData.get(itemId);
  };

  readonly getMonthTrackingData = (
    itemId: string
  ): MonthAndYearData | undefined => {
    return this.monthTrackingData.get(itemId);
  };

  readonly dispose = (): void => {
    if (this.gitHeadWatcher) {
      this.gitHeadWatcher.dispose();
    }
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
    }
    this._onDidChangeTreeData.dispose();
  };
}

export class CraAubayItem extends vscode.TreeItem {
  public readonly itemId?: string;
  public readonly ticketData?: TicketData | MonthAndYearData;

  constructor(
    public readonly label: string,
    public readonly collapsibleState: vscode.TreeItemCollapsibleState,
    public readonly children?: CraAubayItem[],
    public readonly iconName?: string,
    public readonly commandId?: string,
    public readonly commandArgs?: TicketData | MonthAndYearData,
    public readonly contextValueOverride?: string,
    itemId?: string,
    ticketData?: TicketData | MonthAndYearData
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
