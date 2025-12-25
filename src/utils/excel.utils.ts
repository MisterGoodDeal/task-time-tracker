import * as XLSX from "xlsx";
import * as vscode from "vscode";
import { ICRAItem } from "../types/cra.types";
import { getCRATracking } from "../craTracking";
import { getMonthName } from "./time.utils";
import { formatPreciseTime } from "./time.utils";
import { t, getLanguage } from "./i18n.utils";
import {
  getExcelOutputPath,
  getExcelExecutable,
  getExcelExportFormat,
} from "../config";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

export const generateExcelForMonth = async (
  month: number,
  year: number
): Promise<void> => {
  const tracking = getCRATracking();
  const craItem = tracking.find(
    (item: ICRAItem) => item.month === month && item.year === year
  );

  if (!craItem) {
    throw new Error(t("excel.errorNoTracking"));
  }

  const monthName = getMonthName(month);

  const data: Array<{
    [key: string]: string | number;
  }> = [];

  for (const ticket of craItem.tickets) {
    const hasActivePeriod = ticket.periods.some((p) => p.endDate === null);

    const completedPeriods = ticket.periods.filter((p) => p.endDate !== null);
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

    const timeSpentDays =
      ticket.timeSpentInDays !== null
        ? ticket.timeSpentInDays
        : ticket.timeSpent.days +
          ticket.timeSpent.hours / 24 +
          ticket.timeSpent.minutes / (24 * 60) +
          ticket.timeSpent.seconds / (24 * 60 * 60);

    data.push({
      [t("excel.columns.ticket")]: ticket.ticket,
      [t("excel.columns.branch")]: ticket.branchName,
      [t("excel.columns.author")]: ticket.author,
      [t("excel.columns.timeSpentDays")]: Math.round(timeSpentDays * 100) / 100,
      [t("excel.columns.timeSpentDetail")]: formatPreciseTime(ticket.timeSpent),
      [t("excel.columns.status")]: hasActivePeriod
        ? t("ui.inProgress")
        : t("ui.completed"),
      [t("excel.columns.endDate")]: endDateText,
    });
  }

  const worksheet = XLSX.utils.json_to_sheet(data);

  const columnWidths = [
    { wch: 20 },
    { wch: 30 },
    { wch: 30 },
    { wch: 18 },
    { wch: 20 },
    { wch: 12 },
    { wch: 15 },
  ];
  worksheet["!cols"] = columnWidths;

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, t("excel.sheetName"));

  const workspaceFolders = vscode.workspace.workspaceFolders;
  if (!workspaceFolders || workspaceFolders.length === 0) {
    throw new Error(t("excel.errorNoWorkspace"));
  }

  const exportFormat = getExcelExportFormat();
  const fileExtension = exportFormat;
  const fileName = `${t(
    "excel.fileName",
    monthName,
    String(year)
  )}.${fileExtension}`;
  const excelOutputPath = getExcelOutputPath();

  let filePath: vscode.Uri;
  if (excelOutputPath && excelOutputPath.trim() !== "") {
    const outputUri = vscode.Uri.file(excelOutputPath);
    filePath = vscode.Uri.joinPath(outputUri, fileName);
  } else {
    filePath = vscode.Uri.joinPath(workspaceFolders[0].uri, fileName);
  }

  let buffer: Buffer;
  if (exportFormat === "csv") {
    const csv: string = XLSX.utils.sheet_to_csv(worksheet);
    buffer = Buffer.from(csv, "utf-8");
  } else {
    const writeResult: Buffer | Uint8Array = XLSX.write(workbook, {
      type: "buffer",
      bookType: exportFormat,
    }) as Buffer | Uint8Array;
    buffer = Buffer.isBuffer(writeResult)
      ? writeResult
      : Buffer.from(writeResult);
  }

  await vscode.workspace.fs.writeFile(filePath, buffer);

  const excelExecutable = getExcelExecutable();
  if (excelExecutable && excelExecutable.trim() !== "") {
    try {
      const isMacApp =
        process.platform === "darwin" && excelExecutable.endsWith(".app");

      if (isMacApp) {
        await execAsync(`open -a "${excelExecutable}" "${filePath.fsPath}"`);
      } else {
        await execAsync(`"${excelExecutable}" "${filePath.fsPath}"`);
      }
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : t("excel.errorOpeningFile");
      vscode.window.showWarningMessage(
        t("excel.fileGeneratedButCannotOpen", errorMessage)
      );
    }
  }

  const formatName = exportFormat.toUpperCase();
  vscode.window.showInformationMessage(
    t("excel.fileGenerated", formatName, filePath.fsPath)
  );
};
