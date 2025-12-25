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

export const convert12hTo24h = (hour: number, period: "AM" | "PM"): number => {
  if (period === "AM") {
    if (hour === 12) {
      return 0;
    }
    return hour;
  } else {
    if (hour === 12) {
      return 12;
    }
    return hour + 12;
  }
};

export const getWorkStartHour = (): number => {
  const config = vscode.workspace.getConfiguration("task-time-tracker");
  const timeFormat = getTimeFormat();

  if (timeFormat === "12h") {
    const hour12h = config.get<number>("workStartHour12h", 9);
    const period = config.get<"AM" | "PM">("workStartPeriod", "AM");
    return convert12hTo24h(hour12h, period);
  }

  return config.get<number>("workStartHour", 9);
};

export const getWorkEndHour = (): number => {
  const config = vscode.workspace.getConfiguration("task-time-tracker");
  const timeFormat = getTimeFormat();

  if (timeFormat === "12h") {
    const hour12h = config.get<number>("workEndHour12h", 6);
    const period = config.get<"AM" | "PM">("workEndPeriod", "PM");
    return convert12hTo24h(hour12h, period);
  }

  return config.get<number>("workEndHour", 18);
};

export const getTimeFormat = (): "24h" | "12h" => {
  const config = vscode.workspace.getConfiguration("task-time-tracker");
  return config.get<"24h" | "12h">("timeFormat", "24h");
};

export const getTimeIncrement = (): number => {
  const config = vscode.workspace.getConfiguration("task-time-tracker");
  return config.get<number>("timeIncrement", 0.5);
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
        e.affectsConfiguration("task-time-tracker.workStartHour12h") ||
        e.affectsConfiguration("task-time-tracker.workStartPeriod") ||
        e.affectsConfiguration("task-time-tracker.workEndHour") ||
              e.affectsConfiguration("task-time-tracker.workEndHour12h") ||
              e.affectsConfiguration("task-time-tracker.workEndPeriod") ||
              e.affectsConfiguration("task-time-tracker.timeFormat") ||
              e.affectsConfiguration("task-time-tracker.timeIncrement")
      ) {
        callback();
      }
    }
  );
};
