import * as XLSX from "xlsx";
import * as vscode from "vscode";
import { ICRAItem } from "../types/cra.types";
import { getCRATracking } from "../craTracking";
import { getMonthName } from "./time.utils";
import { formatPreciseTime } from "./time.utils";
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
    throw new Error("No tracking found for this month");
  }

  const monthName = getMonthName(month);

  const data: Array<{
    Ticket: string;
    Branch: string;
    Author: string;
    "Time spent (days)": number | string;
    "Time spent (detail)": string;
    Status: string;
    "End date": string;
  }> = [];

  for (const ticket of craItem.tickets) {
    const hasActivePeriod = ticket.periods.some((p) => p.endDate === null);

    const completedPeriods = ticket.periods.filter((p) => p.endDate !== null);
    const lastCompletedPeriod =
      completedPeriods.length > 0
        ? completedPeriods[completedPeriods.length - 1]
        : null;

    const endDateText = hasActivePeriod
      ? "In progress"
      : lastCompletedPeriod
      ? lastCompletedPeriod.endDate!.toLocaleDateString("en-US")
      : "In progress";

    const timeSpentDays =
      ticket.timeSpentInDays !== null
        ? ticket.timeSpentInDays
        : ticket.timeSpent.days +
          ticket.timeSpent.hours / 24 +
          ticket.timeSpent.minutes / (24 * 60) +
          ticket.timeSpent.seconds / (24 * 60 * 60);

    data.push({
      Ticket: ticket.ticket,
      Branch: ticket.branchName,
      Author: ticket.author,
      "Time spent (days)": Math.round(timeSpentDays * 100) / 100,
      "Time spent (detail)": formatPreciseTime(ticket.timeSpent),
      Status: hasActivePeriod ? "In progress" : "Completed",
      "End date": endDateText,
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
  XLSX.utils.book_append_sheet(workbook, worksheet, "Tracking");

  const workspaceFolders = vscode.workspace.workspaceFolders;
  if (!workspaceFolders || workspaceFolders.length === 0) {
    throw new Error("No workspace open");
  }

  const exportFormat = getExcelExportFormat();
  const fileExtension = exportFormat;
  const fileName = `Tracking_${monthName}_${year}.${fileExtension}`;
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
        error instanceof Error ? error.message : "Error opening file";
      vscode.window.showWarningMessage(
        `Spreadsheet file generated but unable to open: ${errorMessage}`
      );
    }
  }

  const formatName = exportFormat.toUpperCase();
  vscode.window.showInformationMessage(
    `${formatName} file generated: ${filePath.fsPath}`
  );
};
