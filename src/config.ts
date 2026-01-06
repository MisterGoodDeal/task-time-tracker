import * as vscode from "vscode";

export const getBranchPrefixes = (): string[] => {
  const config = vscode.workspace.getConfiguration("task-time-tracker");
  const prefixes = config.get<string[]>("branchPrefixes", []);
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
  const increment = config.get<number>("timeIncrement", 0.5);

  if (increment < 0.1 || increment > 1) {
    return 0.5;
  }

  const rounded = Math.round(increment * 10) / 10;
  return rounded;
};

export const getExcelOutputPath = (): string => {
  const config = vscode.workspace.getConfiguration("task-time-tracker");
  return config.get<string>("excelOutputPath", "");
};

export const getExcelExecutable = (): string => {
  const config = vscode.workspace.getConfiguration("task-time-tracker");
  return config.get<string>("excelExecutable", "");
};

export const getExcelExportFormat = (): "xlsx" | "ods" | "csv" => {
  const config = vscode.workspace.getConfiguration("task-time-tracker");
  return config.get<"xlsx" | "ods" | "csv">("excelExportFormat", "xlsx");
};

export const useGlobalStorage = (): boolean => {
  const config = vscode.workspace.getConfiguration("task-time-tracker");
  return config.get<boolean>("useGlobalStorage", false);
};

export const getTrackingConfigurationTarget =
  (): vscode.ConfigurationTarget => {
    return useGlobalStorage()
      ? vscode.ConfigurationTarget.Global
      : vscode.ConfigurationTarget.Workspace;
  };

export const getTrackingConfig = (): vscode.WorkspaceConfiguration => {
  return vscode.workspace.getConfiguration("task-time-tracker");
};

export const getTrackingValue = <T>(key: string, defaultValue: T): T => {
  const config = vscode.workspace.getConfiguration("task-time-tracker");
  const useGlobal = useGlobalStorage();

  const inspect = config.inspect<T>(key);

  if (useGlobal) {
    // In global mode, only read from global storage, never from workspace
    if (inspect?.globalValue !== undefined) {
      return inspect.globalValue;
    }
    return defaultValue;
  } else {
    // In workspace mode, prefer workspace value, fallback to global
    if (inspect?.workspaceValue !== undefined) {
      return inspect.workspaceValue;
    }
    if (inspect?.globalValue !== undefined) {
      return inspect.globalValue;
    }
    return defaultValue;
  }
};

export const migrateTrackingData = async (): Promise<void> => {
  const config = vscode.workspace.getConfiguration("task-time-tracker");
  const currentUseGlobal = useGlobalStorage();
  const newUseGlobal = !currentUseGlobal;

  const inspect = config.inspect<unknown[]>("tracking");
  let dataToMigrate: unknown[] | undefined;

  if (currentUseGlobal) {
    dataToMigrate = inspect?.globalValue;
  } else {
    dataToMigrate = inspect?.workspaceValue;
  }

  const newTarget = newUseGlobal
    ? vscode.ConfigurationTarget.Global
    : vscode.ConfigurationTarget.Workspace;

  const oldTarget = currentUseGlobal
    ? vscode.ConfigurationTarget.Global
    : vscode.ConfigurationTarget.Workspace;

  if (dataToMigrate && dataToMigrate.length > 0) {
    await config.update("tracking", dataToMigrate, newTarget);
  }

  await config.update(
    "useGlobalStorage",
    newUseGlobal,
    vscode.ConfigurationTarget.Global
  );

  if (dataToMigrate && dataToMigrate.length > 0) {
    await config.update("tracking", undefined, oldTarget);
  }
};

export const onConfigurationChange = (
  callback: () => void
): vscode.Disposable => {
  return vscode.workspace.onDidChangeConfiguration(
    (e: vscode.ConfigurationChangeEvent) => {
      if (
        e.affectsConfiguration("task-time-tracker.language") ||
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
        e.affectsConfiguration("task-time-tracker.timeIncrement") ||
        e.affectsConfiguration("task-time-tracker.excelOutputPath") ||
        e.affectsConfiguration("task-time-tracker.excelExecutable") ||
        e.affectsConfiguration("task-time-tracker.excelExportFormat") ||
        e.affectsConfiguration("task-time-tracker.useGlobalStorage")
      ) {
        callback();
      }
    }
  );
};
