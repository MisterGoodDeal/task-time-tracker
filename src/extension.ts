import * as vscode from "vscode";
import { CraAubayTreeDataProvider } from "./treeDataProvider";
import { onConfigurationChange } from "./config";
import {
  addTicketToTracking,
  removeTicketFromTracking,
  markTicketAsCompleted,
  markTicketAsInProgress,
  deleteMonthTracking,
} from "./craTracking";

let treeDataProvider: CraAubayTreeDataProvider;

export function activate(context: vscode.ExtensionContext) {
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
    () => {
      vscode.window.showInformationMessage("Hello World depuis CRA Aubay!");
    }
  );

  const refreshCommand = vscode.commands.registerCommand(
    "cra-aubay.refresh",
    async () => {
      await treeDataProvider.refresh();
    }
  );

  const openItemCommand = vscode.commands.registerCommand(
    "cra-aubay.openItem",
    (item) => {
      vscode.window.showInformationMessage(`Ouverture de ${item.label}`);
    }
  );

  const openSettingsCommand = vscode.commands.registerCommand(
    "cra-aubay.openSettings",
    () => {
      vscode.commands.executeCommand(
        "workbench.action.openSettings",
        "@ext:mistergooddeal.cra-aubay branchPrefixes"
      );
    }
  );

  const openJiraTicketCommand = vscode.commands.registerCommand(
    "cra-aubay.openJiraTicket",
    async () => {
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
    () => {
      vscode.window.showInformationMessage(
        "Aucun ticket Jira à ouvrir pour cette branche"
      );
    }
  );

  const addToTrackingCommand = vscode.commands.registerCommand(
    "cra-aubay.addToTracking",
    async () => {
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
      } catch (error: any) {
        vscode.window.showErrorMessage(
          error.message || "Erreur lors de l'ajout au suivi"
        );
      }
    }
  );

  const removeFromTrackingCommand = vscode.commands.registerCommand(
    "cra-aubay.removeFromTracking",
    async () => {
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
      } catch (error: any) {
        vscode.window.showErrorMessage(
          error.message || "Erreur lors de la suppression du suivi"
        );
      }
    }
  );

  const markTicketAsCompletedCommand = vscode.commands.registerCommand(
    "cra-aubay.markTicketAsCompleted",
    async (item: any) => {
      let ticketData = item?.ticketData;
      
      if (!ticketData && item?.itemId) {
        ticketData = treeDataProvider.getTicketTrackingData(item.itemId);
      }

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
      } catch (error: any) {
        vscode.window.showErrorMessage(
          error.message || "Erreur lors du marquage du ticket"
        );
      }
    }
  );

  const deleteTicketCommand = vscode.commands.registerCommand(
    "cra-aubay.deleteTicket",
    async (item: any) => {
      let ticketData = item?.ticketData;
      
      if (!ticketData && item?.itemId) {
        ticketData = treeDataProvider.getTicketTrackingData(item.itemId);
      }

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
      } catch (error: any) {
        vscode.window.showErrorMessage(
          error.message || "Erreur lors de la suppression du ticket"
        );
      }
    }
  );

  const markTicketAsInProgressCommand = vscode.commands.registerCommand(
    "cra-aubay.markTicketAsInProgress",
    async (item: any) => {
      let ticketData = item?.ticketData;

      if (!ticketData && item?.itemId) {
        ticketData = treeDataProvider.getTicketTrackingData(item.itemId);
      }

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
      } catch (error: any) {
        vscode.window.showErrorMessage(
          error.message || "Erreur lors de la remise en cours"
        );
      }
    }
  );

  const deleteMonthTrackingCommand = vscode.commands.registerCommand(
    "cra-aubay.deleteMonthTracking",
    async (item: any) => {
      // Pour les ICRAItem, ticketData contient month et year
      let monthData = item?.ticketData;

      if (!monthData && item?.itemId) {
        monthData = treeDataProvider.getMonthTrackingData(item.itemId);
      }

      if (!monthData || !monthData.month || !monthData.year) {
        vscode.window.showErrorMessage("Impossible de récupérer les informations du mois");
        return;
      }

      const monthName = new Date(2000, monthData.month - 1, 1).toLocaleString("fr-FR", {
        month: "long",
      });
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
        } catch (error: any) {
          vscode.window.showErrorMessage(
            error.message || "Erreur lors de la suppression du suivi"
          );
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
    deleteMonthTrackingCommand,
    treeView,
    configChangeDisposable,
    treeDataProvider
  );
}

export function deactivate() {}

