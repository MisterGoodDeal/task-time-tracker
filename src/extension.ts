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
  item: TreeItemData | undefined
): TicketData | null => {
  if (!item) {
    return null;
  }

  if (item.ticketData && "ticket" in item.ticketData) {
    return item.ticketData as TicketData;
  }

  if (item.itemId) {
    const data = treeDataProvider.getTicketTrackingData(item.itemId);
    if (data && "ticket" in data) {
      return data as TicketData;
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
    return item.ticketData as MonthAndYearData;
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

  const treeView = vscode.window.createTreeView("cra-aubay-view", {
    treeDataProvider: treeDataProvider,
    showCollapseAll: true,
  });

  const configChangeDisposable = onConfigurationChange(() => {
    treeDataProvider.refresh();
  });

  const helloWorldCommand = vscode.commands.registerCommand(
    "cra-aubay.helloWorld",
    (): void => {
      vscode.window.showInformationMessage("Hello World depuis CRA Aubay!");
    }
  );

  const refreshCommand = vscode.commands.registerCommand(
    "cra-aubay.refresh",
    async (): Promise<void> => {
      await treeDataProvider.refresh();
    }
  );

  const openItemCommand = vscode.commands.registerCommand(
    "cra-aubay.openItem",
    (item: TreeItemData): void => {
      vscode.window.showInformationMessage(`Ouverture de ${item.label}`);
    }
  );

  const openSettingsCommand = vscode.commands.registerCommand(
    "cra-aubay.openSettings",
    (): void => {
      vscode.commands.executeCommand(
        "workbench.action.openSettings",
        "@ext:mistergooddeal.cra-aubay branchPrefixes"
      );
    }
  );

  const openJiraTicketCommand = vscode.commands.registerCommand(
    "cra-aubay.openJiraTicket",
    async (): Promise<void> => {
      const ticketData = await treeDataProvider.getCurrentTicketData();
      if (ticketData) {
        const url = `${ticketData.jiraUrl}/${ticketData.ticket}`;
        vscode.env.openExternal(vscode.Uri.parse(url));
      } else {
        vscode.window.showErrorMessage("Aucune donnée de ticket trouvée");
      }
    }
  );

  const showNoTicketCommand = vscode.commands.registerCommand(
    "cra-aubay.showNoTicket",
    (): void => {
      vscode.window.showInformationMessage(
        "Aucun ticket Jira à ouvrir pour cette branche"
      );
    }
  );

  const addToTrackingCommand = vscode.commands.registerCommand(
    "cra-aubay.addToTracking",
    async (): Promise<void> => {
      const ticketData = await treeDataProvider.getCurrentTicketData();
      if (!ticketData) {
        vscode.window.showErrorMessage("Aucune donnée de ticket trouvée");
        return;
      }

      try {
        await addTicketToTracking(ticketData.ticket, ticketData.jiraUrl);
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
    "cra-aubay.removeFromTracking",
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
    "cra-aubay.markTicketAsCompleted",
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
    "cra-aubay.deleteTicket",
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
    "cra-aubay.markTicketAsInProgress",
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

  const openTrackedTicketJiraCommand = vscode.commands.registerCommand(
    "cra-aubay.openTrackedTicketJira",
    async (item?: TreeItemData): Promise<void> => {
      const ticketData = getTicketDataFromItem(item);
      if (!ticketData || !ticketData.jiraUrl) {
        vscode.window.showErrorMessage(
          "Aucune URL Jira trouvée pour ce ticket"
        );
        return;
      }

      vscode.env.openExternal(vscode.Uri.parse(ticketData.jiraUrl));
    }
  );

  const checkoutBranchCommand = vscode.commands.registerCommand(
    "cra-aubay.checkoutBranch",
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
    "cra-aubay.deleteMonthTracking",
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

  context.subscriptions.push(
    helloWorldCommand,
    refreshCommand,
    openItemCommand,
    openSettingsCommand,
    openJiraTicketCommand,
    showNoTicketCommand,
    addToTrackingCommand,
    removeFromTrackingCommand,
    markTicketAsCompletedCommand,
    markTicketAsInProgressCommand,
    deleteTicketCommand,
    openTrackedTicketJiraCommand,
    checkoutBranchCommand,
    deleteMonthTrackingCommand,
    treeView,
    configChangeDisposable,
    treeDataProvider
  );
};

export const deactivate = (): void => {};
