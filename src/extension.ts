import * as vscode from "vscode";
import { CraAubayTreeDataProvider } from "./treeDataProvider";
import { onConfigurationChange, getBranchPrefixes } from "./config";
import {
  addTicketToTracking,
  removeTicketFromTracking,
  markTicketAsCompleted,
  markTicketAsInProgress,
  deleteMonthTracking,
  pauseAllActiveTickets,
  startTicketTrackingIfExists,
} from "./craTracking";
import { generateExcelForMonth } from "./utils/excel.utils";
import { exec } from "child_process";
import { promisify } from "util";
import {
  TicketData,
  MonthAndYearData,
  TreeItemData,
} from "./types/common.types";

const execAsync = promisify(exec);

const extractTicketFromBranch = (
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

let treeDataProvider: CraAubayTreeDataProvider;

const getTicketDataFromItem = (
  item: TreeItemData | TicketData | undefined
): TicketData | null => {
  if (!item) {
    return null;
  }

  if ("ticket" in item && "month" in item && "year" in item) {
    return item;
  }

  const treeItem = item;
  if (treeItem.ticketData && "ticket" in treeItem.ticketData) {
    return treeItem.ticketData;
  }

  if (treeItem.itemId) {
    const data = treeDataProvider.getTicketTrackingData(treeItem.itemId);
    if (data && "ticket" in data) {
      return data;
    }
  }

  return null;
};

const getMonthDataFromItem = (
  item: TreeItemData | undefined
): MonthAndYearData | null => {
  if (!item) {
    return null;
  }

  if (
    item.ticketData &&
    "month" in item.ticketData &&
    !("ticket" in item.ticketData)
  ) {
    return item.ticketData;
  }

  if (item.itemId) {
    const data = treeDataProvider.getMonthTrackingData(item.itemId);
    if (data) {
      return data;
    }
  }

  return null;
};

export const activate = (context: vscode.ExtensionContext): void => {
  treeDataProvider = new CraAubayTreeDataProvider();

  const treeView = vscode.window.createTreeView("task-time-tracker-view", {
    treeDataProvider: treeDataProvider,
    showCollapseAll: true,
  });

  const configChangeDisposable = onConfigurationChange(() => {
    void treeDataProvider.refresh();
  });

  const helloWorldCommand = vscode.commands.registerCommand(
    "task-time-tracker.helloWorld",
    (): void => {
      vscode.window.showInformationMessage(
        "Hello World from Task Time Tracker!"
      );
    }
  );

  const refreshCommand = vscode.commands.registerCommand(
    "task-time-tracker.refresh",
    (): void => {
      void treeDataProvider.refresh();
    }
  );

  const openItemCommand = vscode.commands.registerCommand(
    "task-time-tracker.openItem",
    (item: TreeItemData): void => {
      const label =
        typeof item.label === "string"
          ? item.label
          : typeof item.label === "object" &&
            item.label !== null &&
            "label" in item.label
          ? String((item.label as { label: string }).label)
          : "item";
      vscode.window.showInformationMessage(`Opening ${label}`);
    }
  );

  const openSettingsCommand = vscode.commands.registerCommand(
    "task-time-tracker.openSettings",
    (): void => {
      vscode.commands.executeCommand(
        "workbench.action.openSettings",
        "@ext:mistergooddeal.task-time-tracker branchPrefixes"
      );
    }
  );

  const openTicketProviderTicketCommand = vscode.commands.registerCommand(
    "task-time-tracker.openTicketProviderTicket",
    async (
      item?: TreeItemData | { ticket: string; ticketProviderUrl: string }
    ): Promise<void> => {
      let ticketDataMap: { ticket: string; ticketProviderUrl: string } | null =
        null;

      if (item) {
        if (
          "ticket" in item &&
          "ticketProviderUrl" in item &&
          !("itemId" in item)
        ) {
          ticketDataMap = item as { ticket: string; ticketProviderUrl: string };
        } else if ("itemId" in item) {
          const itemId = item.itemId;
          if (itemId && typeof itemId === "string") {
            ticketDataMap = treeDataProvider.getTicketData(itemId) || null;
          }
        }
      }

      if (!ticketDataMap) {
        ticketDataMap = await treeDataProvider.getCurrentTicketData();
      }

      if (
        ticketDataMap &&
        ticketDataMap.ticket &&
        ticketDataMap.ticketProviderUrl
      ) {
        const url = `${ticketDataMap.ticketProviderUrl}/${ticketDataMap.ticket}`;
        vscode.env.openExternal(vscode.Uri.parse(url));
      } else {
        vscode.window.showErrorMessage("No ticket data found");
      }
    }
  );

  const showNoTicketCommand = vscode.commands.registerCommand(
    "task-time-tracker.showNoTicket",
    (): void => {
      vscode.window.showInformationMessage("No ticket to open for this branch");
    }
  );

  const addToTrackingCommand = vscode.commands.registerCommand(
    "task-time-tracker.addToTracking",
    async (): Promise<void> => {
      const ticketData = await treeDataProvider.getCurrentTicketData();
      if (!ticketData) {
        vscode.window.showErrorMessage("No ticket data found");
        return;
      }

      try {
        await addTicketToTracking(
          ticketData.ticket,
          ticketData.ticketProviderUrl
        );
        vscode.window.showInformationMessage(
          `Ticket ${ticketData.ticket} added to tracking`
        );
        await treeDataProvider.refresh();
      } catch (error: unknown) {
        const errorMessage =
          error instanceof Error ? error.message : "Error adding to tracking";
        vscode.window.showErrorMessage(errorMessage);
      }
    }
  );

  const removeFromTrackingCommand = vscode.commands.registerCommand(
    "task-time-tracker.removeFromTracking",
    async (): Promise<void> => {
      const ticketData = await treeDataProvider.getCurrentTicketData();
      if (!ticketData) {
        vscode.window.showErrorMessage("No ticket data found");
        return;
      }

      try {
        await removeTicketFromTracking(ticketData.ticket);
        vscode.window.showInformationMessage(
          `Ticket ${ticketData.ticket} removed from tracking`
        );
        await treeDataProvider.refresh();
      } catch (error: unknown) {
        const errorMessage =
          error instanceof Error
            ? error.message
            : "Error removing from tracking";
        vscode.window.showErrorMessage(errorMessage);
      }
    }
  );

  const markTicketAsCompletedCommand = vscode.commands.registerCommand(
    "task-time-tracker.markTicketAsCompleted",
    async (item?: TreeItemData): Promise<void> => {
      const ticketData = getTicketDataFromItem(item);
      if (!ticketData) {
        vscode.window.showErrorMessage("No ticket data found");
        return;
      }

      try {
        await markTicketAsCompleted(
          ticketData.ticket,
          ticketData.month,
          ticketData.year
        );
        vscode.window.showInformationMessage(
          `Ticket ${ticketData.ticket} marked as completed`
        );
        await treeDataProvider.refresh();
      } catch (error: unknown) {
        const errorMessage =
          error instanceof Error ? error.message : "Error marking ticket";
        vscode.window.showErrorMessage(errorMessage);
      }
    }
  );

  const deleteTicketCommand = vscode.commands.registerCommand(
    "task-time-tracker.deleteTicket",
    async (item?: TreeItemData): Promise<void> => {
      const ticketData = getTicketDataFromItem(item);
      if (!ticketData) {
        vscode.window.showErrorMessage("No ticket data found");
        return;
      }

      const confirm = await vscode.window.showWarningMessage(
        `Are you sure you want to delete ticket ${ticketData.ticket}?`,
        "Yes",
        "No"
      );

      if (confirm !== "Yes") {
        return;
      }

      try {
        await removeTicketFromTracking(
          ticketData.ticket,
          ticketData.month,
          ticketData.year
        );
        vscode.window.showInformationMessage(
          `Ticket ${ticketData.ticket} deleted`
        );
        await treeDataProvider.refresh();
      } catch (error: unknown) {
        const errorMessage =
          error instanceof Error ? error.message : "Error deleting ticket";
        vscode.window.showErrorMessage(errorMessage);
      }
    }
  );

  const markTicketAsInProgressCommand = vscode.commands.registerCommand(
    "task-time-tracker.markTicketAsInProgress",
    async (item?: TreeItemData): Promise<void> => {
      const ticketData = getTicketDataFromItem(item);
      if (!ticketData) {
        vscode.window.showErrorMessage("No ticket data found");
        return;
      }

      try {
        await markTicketAsInProgress(
          ticketData.ticket,
          ticketData.month,
          ticketData.year
        );
        vscode.window.showInformationMessage(
          `Ticket ${ticketData.ticket} resumed`
        );
        await treeDataProvider.refresh();
      } catch (error: unknown) {
        const errorMessage =
          error instanceof Error ? error.message : "Error resuming ticket";
        vscode.window.showErrorMessage(errorMessage);
      }
    }
  );

  const openTrackedTicketProviderCommand = vscode.commands.registerCommand(
    "task-time-tracker.openTrackedTicketProvider",
    (item?: TreeItemData): void => {
      const ticketData = getTicketDataFromItem(item);
      if (!ticketData || !ticketData.ticketProviderUrl) {
        vscode.window.showErrorMessage("No URL found for this ticket");
        return;
      }

      vscode.env.openExternal(vscode.Uri.parse(ticketData.ticketProviderUrl));
    }
  );

  const checkoutBranchCommand = vscode.commands.registerCommand(
    "task-time-tracker.checkoutBranch",
    async (item?: TreeItemData): Promise<void> => {
      const ticketData = getTicketDataFromItem(item);
      if (!ticketData) {
        vscode.window.showErrorMessage("No ticket data found");
        return;
      }

      if (!ticketData.branchName || ticketData.branchName.trim() === "") {
        vscode.window.showWarningMessage(
          `Ticket ${
            ticketData.ticket || "unknown"
          } has no associated branch. ` +
            `This can happen for tickets created before this feature was added.`
        );
        return;
      }

      const workspaceFolders = vscode.workspace.workspaceFolders;
      if (!workspaceFolders || workspaceFolders.length === 0) {
        vscode.window.showErrorMessage("No workspace open");
        return;
      }

      try {
        await pauseAllActiveTickets();

        await execAsync(`git checkout ${ticketData.branchName}`, {
          cwd: workspaceFolders[0].uri.fsPath,
        });

        const prefixes = getBranchPrefixes();
        const ticket = extractTicketFromBranch(ticketData.branchName, prefixes);

        if (ticket) {
          await startTicketTrackingIfExists(ticket, ticketData.branchName);
        }

        vscode.window.showInformationMessage(
          `Branch ${ticketData.branchName} checked out successfully`
        );

        await treeDataProvider.refresh();
      } catch (error: unknown) {
        const errorMessage =
          error instanceof Error ? error.message : "Unknown error";
        vscode.window.showErrorMessage(
          `Error during checkout: ${errorMessage}`
        );
      }
    }
  );

  const deleteMonthTrackingCommand = vscode.commands.registerCommand(
    "task-time-tracker.deleteMonthTracking",
    async (item?: TreeItemData): Promise<void> => {
      const monthData = getMonthDataFromItem(item);
      if (!monthData) {
        vscode.window.showErrorMessage("Unable to retrieve month information");
        return;
      }

      const monthName = new Date(2000, monthData.month - 1, 1).toLocaleString(
        "en-US",
        {
          month: "long",
        }
      );
      const confirmation = await vscode.window.showWarningMessage(
        `Do you really want to delete all tracking for ${monthName} ${monthData.year}?`,
        { modal: true },
        "Yes",
        "No"
      );

      if (confirmation === "Yes") {
        try {
          await deleteMonthTracking(monthData.month, monthData.year);
          vscode.window.showInformationMessage(
            `Tracking for ${monthName} ${monthData.year} deleted`
          );
          await treeDataProvider.refresh();
        } catch (error: unknown) {
          const errorMessage =
            error instanceof Error ? error.message : "Error deleting tracking";
          vscode.window.showErrorMessage(errorMessage);
        }
      }
    }
  );

  const exportMonthToExcelCommand = vscode.commands.registerCommand(
    "task-time-tracker.exportMonthToExcel",
    async (item?: TreeItemData): Promise<void> => {
      const monthData = getMonthDataFromItem(item);
      if (!monthData) {
        vscode.window.showErrorMessage("Unable to retrieve month information");
        return;
      }

      try {
        await generateExcelForMonth(monthData.month, monthData.year);
      } catch (error: unknown) {
        const errorMessage =
          error instanceof Error
            ? error.message
            : "Error generating spreadsheet file";
        vscode.window.showErrorMessage(errorMessage);
      }
    }
  );

  context.subscriptions.push(
    helloWorldCommand,
    refreshCommand,
    openItemCommand,
    openSettingsCommand,
    openTicketProviderTicketCommand,
    showNoTicketCommand,
    addToTrackingCommand,
    removeFromTrackingCommand,
    markTicketAsCompletedCommand,
    markTicketAsInProgressCommand,
    deleteTicketCommand,
    openTrackedTicketProviderCommand,
    checkoutBranchCommand,
    deleteMonthTrackingCommand,
    exportMonthToExcelCommand,
    treeView,
    configChangeDisposable,
    treeDataProvider
  );
};

export const deactivate = (): void => {};
