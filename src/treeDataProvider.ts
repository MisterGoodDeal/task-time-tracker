import * as vscode from "vscode";
import {
  getBranchPrefixes,
  getTicketBaseUrl,
  getWorkStartHour,
  getWorkEndHour,
  getTimeFormat,
} from "./config";
import { t, getLanguage } from "./utils/i18n.utils";
import {
  calculateTotalTimeSpentInDays,
  formatHour,
  calculatePreciseTimeSpent,
  formatPreciseTime,
  getMonthName,
} from "./utils/time.utils";
import {
  isTicketTracked,
  getCRATracking,
  pauseAllActiveTickets,
  startTicketTrackingIfExists,
} from "./craTracking";
import { ICRAItem, ICRATicket, ICRATicketPeriod } from "./types/cra.types";
import { TicketData, MonthAndYearData } from "./types/common.types";
import { getCurrentBranch, extractTicketFromBranch } from "./utils/git.utils";

interface TicketDataMap {
  ticket: string;
  ticketProviderUrl: string;
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
    void this.refresh();
    this.setupGitWatcher();
    this.startAutoRefresh();
  }

  private readonly startAutoRefresh = (): void => {
    this.refreshInterval = setInterval(() => {
      void this.refresh();
    }, 60000);
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
      void this.checkBranchChange();
    });

    this.gitHeadWatcher.onDidCreate(() => {
      void this.checkBranchChange();
    });
  };

  private readonly checkBranchChange = async (): Promise<void> => {
    const newBranch = await getCurrentBranch();
    if (newBranch !== this.currentBranch && this.currentBranch !== "") {
      await pauseAllActiveTickets();

      const prefixes = getBranchPrefixes();
      const ticket = extractTicketFromBranch(newBranch, prefixes);

      if (ticket) {
        await startTicketTrackingIfExists(ticket, newBranch);
      }

      this.currentBranch = newBranch;
      void this.refresh();
    } else if (this.currentBranch === "") {
      this.currentBranch = newBranch;
      void this.refresh();
    }
  };

  readonly refresh = async (): Promise<void> => {
    this.ticketTrackingData.clear();
    this.monthTrackingData.clear();
    this.ticketData.clear();
    const branchName = await getCurrentBranch();
    this.currentBranch = branchName;
    const prefixes = getBranchPrefixes();
    const ticketBaseUrl = getTicketBaseUrl();

    const ticket = extractTicketFromBranch(branchName, prefixes);

    const timeFormat = getTimeFormat();
    const workStartHour = getWorkStartHour();
    const workEndHour = getWorkEndHour();

    const quickSettingsChildren: CraAubayItem[] = [
      new CraAubayItem(
        t("ui.ticketUrl", ticketBaseUrl || t("ui.notConfigured")),
        vscode.TreeItemCollapsibleState.None,
        undefined,
        "link-external"
      ),
      new CraAubayItem(
        t(
          "ui.prefixes",
          prefixes.length > 0 ? prefixes.join(", ") : t("ui.none")
        ),
        vscode.TreeItemCollapsibleState.None,
        undefined,
        "tag"
      ),
      new CraAubayItem(
        t("ui.timeFormat", timeFormat),
        vscode.TreeItemCollapsibleState.None,
        undefined,
        "watch"
      ),
      new CraAubayItem(
        t(
          "ui.workHours",
          formatHour(workStartHour),
          formatHour(workEndHour),
          String(workStartHour),
          String(workEndHour)
        ),
        vscode.TreeItemCollapsibleState.None,
        undefined,
        "clock"
      ),
    ];

    const branchItemId = `branch-${branchName}`;
    const branchTicketData:
      | { ticket: string; ticketProviderUrl: string }
      | undefined = ticket
      ? {
          ticket,
          ticketProviderUrl: ticketBaseUrl,
        }
      : prefixes.length === 0
      ? {
          ticket: branchName,
          ticketProviderUrl: ticketBaseUrl,
        }
      : undefined;

    if (ticket || prefixes.length === 0) {
      this.ticketData.set(branchItemId, branchTicketData!);
    }

    let contextValue: string = "noTicket";
    if (ticket) {
      const isTracked = isTicketTracked(ticket);
      contextValue = isTracked ? "hasTicketTracked" : "hasTicket";
    } else if (prefixes.length === 0) {
      const isTracked = isTicketTracked(branchName);
      contextValue = isTracked ? "hasTicketTracked" : "hasTicket";
    }

    const branchItem = new CraAubayItem(
      t("ui.branch", branchName),
      vscode.TreeItemCollapsibleState.None,
      undefined,
      "git-branch",
      ticket || prefixes.length === 0
        ? "task-time-tracker.openTicketProviderTicket"
        : undefined,
      branchTicketData,
      contextValue,
      branchItemId
    );

    const trackingItems = this.buildTrackingItems();

    this.items = [
      branchItem,
      ...trackingItems,
      new CraAubayItem(
        t("ui.currentSettings"),
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
      const monthName = getMonthName(craItem.month);
      const title = `Tracking ${monthName} ${craItem.year}`;

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
            ? t("ui.inProgress")
            : lastCompletedPeriod
            ? lastCompletedPeriod.endDate!.toLocaleDateString(
                getLanguage() === "fr" ? "fr-FR" : "en-US"
              )
            : t("ui.inProgress");

          const timeSpent = calculateTotalTimeSpentInDays(ticket);

          const timeSpentText =
            timeSpent > 0
              ? ` - ${timeSpent} ${timeSpent > 1 ? t("ui.days") : t("ui.day")}`
              : "";
          const ticketId = `ticket-${craItem.month}-${craItem.year}-${ticket.ticket}`;
          const contextValue = hasActivePeriod
            ? "ticketInProgress"
            : "ticketCompleted";

          const ticketData: TicketData = {
            ticket: ticket.ticket,
            month: craItem.month,
            year: craItem.year,
            ticketProviderUrl: ticket.ticketProviderUrl,
            branchName: ticket.branchName,
          };

          this.ticketTrackingData.set(ticketId, ticketData);

          const preciseTime = calculatePreciseTimeSpent(ticket);
          const preciseTimeText = formatPreciseTime(preciseTime);
          const label = `${ticket.ticket} - ${endDateText}${timeSpentText}${
            preciseTimeText ? ` (${preciseTimeText})` : ""
          }`;

          return new CraAubayItem(
            label,
            vscode.TreeItemCollapsibleState.None,
            undefined,
            hasActivePeriod ? "edit-session" : "coffee",
            "task-time-tracker.checkoutBranch",
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
    const branchName = await getCurrentBranch();
    const itemId = `branch-${branchName}`;
    let data = this.ticketData.get(itemId);

    if (!data) {
      const prefixes = getBranchPrefixes();
      const ticketBaseUrl = getTicketBaseUrl();
      const ticket = extractTicketFromBranch(branchName, prefixes);

      if (ticket) {
        data = {
          ticket,
          ticketProviderUrl: ticketBaseUrl,
        };
        this.ticketData.set(itemId, data);
      } else if (prefixes.length === 0) {
        data = {
          ticket: branchName,
          ticketProviderUrl: ticketBaseUrl,
        };
        this.ticketData.set(itemId, data);
      }
    }

    return data || null;
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
    public readonly commandArgs?:
      | TicketData
      | MonthAndYearData
      | { ticket: string; ticketProviderUrl: string },
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
