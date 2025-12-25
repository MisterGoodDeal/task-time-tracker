import * as vscode from "vscode";
import { CraAubayTreeDataProvider } from "./treeDataProvider";
import { onConfigurationChange } from "./config";

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

  context.subscriptions.push(
    helloWorldCommand,
    refreshCommand,
    openItemCommand,
    openSettingsCommand,
    openJiraTicketCommand,
    showNoTicketCommand,
    treeView,
    configChangeDisposable,
    treeDataProvider
  );
}

export function deactivate() {}

