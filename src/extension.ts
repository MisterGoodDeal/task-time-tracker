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
        "Hello World depuis Task Time Tracker!"
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
      vscode.window.showInformationMessage(`Ouverture de ${label}`);
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
        vscode.window.showErrorMessage("Aucune donnée de ticket trouvée");
      }
    }
  );

  const showNoTicketCommand = vscode.commands.registerCommand(
    "task-time-tracker.showNoTicket",
    (): void => {
      vscode.window.showInformationMessage(
        "Aucun ticket à ouvrir pour cette branche"
      );
    }
  );

  const addToTrackingCommand = vscode.commands.registerCommand(
    "task-time-tracker.addToTracking",
    async (): Promise<void> => {
      const ticketData = await treeDataProvider.getCurrentTicketData();
      if (!ticketData) {
        vscode.window.showErrorMessage("Aucune donnée de ticket trouvée");
        return;
      }

      try {
        await addTicketToTracking(
          ticketData.ticket,
          ticketData.ticketProviderUrl
        );
        vscode.window.showInformationMessage(
          `Ticket ${ticketData.ticket} ajouté au suivi`
        );
        await treeDataProvider.refresh();
      } catch (error: unknown) {
        const errorMessage =
          error instanceof Error
            ? error.message
            : "Erreur lors de l'ajout au suivi";
        vscode.window.showErrorMessage(errorMessage);
      }
    }
  );

  const removeFromTrackingCommand = vscode.commands.registerCommand(
    "task-time-tracker.removeFromTracking",
    async (): Promise<void> => {
      const ticketData = await treeDataProvider.getCurrentTicketData();
      if (!ticketData) {
        vscode.window.showErrorMessage("Aucune donnée de ticket trouvée");
        return;
      }

      try {
        await removeTicketFromTracking(ticketData.ticket);
        vscode.window.showInformationMessage(
          `Ticket ${ticketData.ticket} retiré du suivi`
        );
        await treeDataProvider.refresh();
      } catch (error: unknown) {
        const errorMessage =
          error instanceof Error
            ? error.message
            : "Erreur lors de la suppression du suivi";
        vscode.window.showErrorMessage(errorMessage);
      }
    }
  );

  const markTicketAsCompletedCommand = vscode.commands.registerCommand(
    "task-time-tracker.markTicketAsCompleted",
    async (item?: TreeItemData): Promise<void> => {
      const ticketData = getTicketDataFromItem(item);
      if (!ticketData) {
        vscode.window.showErrorMessage("Aucune donnée de ticket trouvée");
        return;
      }

      try {
        await markTicketAsCompleted(
          ticketData.ticket,
          ticketData.month,
          ticketData.year
        );
        vscode.window.showInformationMessage(
          `Ticket ${ticketData.ticket} marqué comme terminé`
        );
        await treeDataProvider.refresh();
      } catch (error: unknown) {
        const errorMessage =
          error instanceof Error
            ? error.message
            : "Erreur lors du marquage du ticket";
        vscode.window.showErrorMessage(errorMessage);
      }
    }
  );

  const deleteTicketCommand = vscode.commands.registerCommand(
    "task-time-tracker.deleteTicket",
    async (item?: TreeItemData): Promise<void> => {
      const ticketData = getTicketDataFromItem(item);
      if (!ticketData) {
        vscode.window.showErrorMessage("Aucune donnée de ticket trouvée");
        return;
      }

      const confirm = await vscode.window.showWarningMessage(
        `Êtes-vous sûr de vouloir supprimer le ticket ${ticketData.ticket} ?`,
        "Oui",
        "Non"
      );

      if (confirm !== "Oui") {
        return;
      }

      try {
        await removeTicketFromTracking(
          ticketData.ticket,
          ticketData.month,
          ticketData.year
        );
        vscode.window.showInformationMessage(
          `Ticket ${ticketData.ticket} supprimé`
        );
        await treeDataProvider.refresh();
      } catch (error: unknown) {
        const errorMessage =
          error instanceof Error
            ? error.message
            : "Erreur lors de la suppression du ticket";
        vscode.window.showErrorMessage(errorMessage);
      }
    }
  );

  const markTicketAsInProgressCommand = vscode.commands.registerCommand(
    "task-time-tracker.markTicketAsInProgress",
    async (item?: TreeItemData): Promise<void> => {
      const ticketData = getTicketDataFromItem(item);
      if (!ticketData) {
        vscode.window.showErrorMessage("Aucune donnée de ticket trouvée");
        return;
      }

      try {
        await markTicketAsInProgress(
          ticketData.ticket,
          ticketData.month,
          ticketData.year
        );
        vscode.window.showInformationMessage(
          `Ticket ${ticketData.ticket} remis en cours`
        );
        await treeDataProvider.refresh();
      } catch (error: unknown) {
        const errorMessage =
          error instanceof Error
            ? error.message
            : "Erreur lors de la remise en cours";
        vscode.window.showErrorMessage(errorMessage);
      }
    }
  );

  const openTrackedTicketProviderCommand = vscode.commands.registerCommand(
    "task-time-tracker.openTrackedTicketProvider",
    (item?: TreeItemData): void => {
      const ticketData = getTicketDataFromItem(item);
      if (!ticketData || !ticketData.ticketProviderUrl) {
        vscode.window.showErrorMessage("Aucune URL trouvée pour ce ticket");
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
        vscode.window.showErrorMessage("Aucune donnée de ticket trouvée");
        return;
      }

      if (!ticketData.branchName || ticketData.branchName.trim() === "") {
        vscode.window.showWarningMessage(
          `Le ticket ${
            ticketData.ticket || "inconnu"
          } n'a pas de branche associée. ` +
            `Cela peut arriver pour les tickets créés avant l'ajout de cette fonctionnalité.`
        );
        return;
      }

      const workspaceFolders = vscode.workspace.workspaceFolders;
      if (!workspaceFolders || workspaceFolders.length === 0) {
        vscode.window.showErrorMessage("Aucun workspace ouvert");
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
          `Branche ${ticketData.branchName} checkout avec succès`
        );

        await treeDataProvider.refresh();
      } catch (error: unknown) {
        const errorMessage =
          error instanceof Error ? error.message : "Erreur inconnue";
        vscode.window.showErrorMessage(
          `Erreur lors du checkout : ${errorMessage}`
        );
      }
    }
  );

  const deleteMonthTrackingCommand = vscode.commands.registerCommand(
    "task-time-tracker.deleteMonthTracking",
    async (item?: TreeItemData): Promise<void> => {
      const monthData = getMonthDataFromItem(item);
      if (!monthData) {
        vscode.window.showErrorMessage(
          "Impossible de récupérer les informations du mois"
        );
        return;
      }

      const monthName = new Date(2000, monthData.month - 1, 1).toLocaleString(
        "fr-FR",
        {
          month: "long",
        }
      );
      const confirmation = await vscode.window.showWarningMessage(
        `Voulez-vous vraiment supprimer tout le suivi de ${monthName} ${monthData.year} ?`,
        { modal: true },
        "Oui",
        "Non"
      );

      if (confirmation === "Oui") {
        try {
          await deleteMonthTracking(monthData.month, monthData.year);
          vscode.window.showInformationMessage(
            `Suivi de ${monthName} ${monthData.year} supprimé`
          );
          await treeDataProvider.refresh();
        } catch (error: unknown) {
          const errorMessage =
            error instanceof Error
              ? error.message
              : "Erreur lors de la suppression du suivi";
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
        vscode.window.showErrorMessage(
          "Impossible de récupérer les informations du mois"
        );
        return;
      }

      try {
        await generateExcelForMonth(monthData.month, monthData.year);
      } catch (error: unknown) {
        const errorMessage =
          error instanceof Error
            ? error.message
            : "Erreur lors de la génération du fichier Excel";
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
