import * as vscode from "vscode";

export const getBranchPrefixes = (): string[] => {
  const config = vscode.workspace.getConfiguration("task-time-tracker");
  const prefixes = config.get<string[]>("branchPrefixes", ["EDI", "GDD"]);
  return prefixes;
};

export const getTicketBaseUrl = (): string => {
  const config = vscode.workspace.getConfiguration("task-time-tracker");
  return config.get<string>("ticketBaseUrl", "");
};

export const getWorkStartHour = (): number => {
  const config = vscode.workspace.getConfiguration("task-time-tracker");
  return config.get<number>("workStartHour", 9);
};

export const getWorkEndHour = (): number => {
  const config = vscode.workspace.getConfiguration("task-time-tracker");
  return config.get<number>("workEndHour", 18);
};

export const onConfigurationChange = (
  callback: () => void
): vscode.Disposable => {
  return vscode.workspace.onDidChangeConfiguration(
    (e: vscode.ConfigurationChangeEvent) => {
      if (
        e.affectsConfiguration("task-time-tracker.branchPrefixes") ||
        e.affectsConfiguration("task-time-tracker.ticketBaseUrl") ||
        e.affectsConfiguration("task-time-tracker.tracking") ||
        e.affectsConfiguration("task-time-tracker.workStartHour") ||
        e.affectsConfiguration("task-time-tracker.workEndHour")
      ) {
        callback();
      }
    }
  );
};
