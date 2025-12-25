import * as vscode from "vscode";

export const getBranchPrefixes = (): string[] => {
  const config = vscode.workspace.getConfiguration("cra-aubay");
  const prefixes = config.get<string[]>("branchPrefixes", ["EDI", "GDD"]);
  return prefixes;
};

export const getJiraBaseUrl = (): string => {
  const config = vscode.workspace.getConfiguration("cra-aubay");
  return config.get<string>(
    "jiraBaseUrl",
    "https://inedi.atlassian.net/browse"
  );
};

export const getWorkStartHour = (): number => {
  const config = vscode.workspace.getConfiguration("cra-aubay");
  return config.get<number>("workStartHour", 9);
};

export const getWorkEndHour = (): number => {
  const config = vscode.workspace.getConfiguration("cra-aubay");
  return config.get<number>("workEndHour", 18);
};

export const onConfigurationChange = (
  callback: () => void
): vscode.Disposable => {
  return vscode.workspace.onDidChangeConfiguration(
    (e: vscode.ConfigurationChangeEvent) => {
      if (
        e.affectsConfiguration("cra-aubay.branchPrefixes") ||
        e.affectsConfiguration("cra-aubay.jiraBaseUrl") ||
        e.affectsConfiguration("cra-aubay.tracking") ||
        e.affectsConfiguration("cra-aubay.workStartHour") ||
        e.affectsConfiguration("cra-aubay.workEndHour")
      ) {
        callback();
      }
    }
  );
};
