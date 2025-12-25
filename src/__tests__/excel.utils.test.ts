import { generateExcelForMonth } from "../utils/excel.utils";
import * as vscode from "vscode";
import * as XLSX from "xlsx";
import { getCRATracking } from "../craTracking";
import {
  getExcelOutputPath,
  getExcelExecutable,
  getExcelExportFormat,
} from "../config";
import { getMonthName, formatPreciseTime } from "../utils/time.utils";
import { t } from "../utils/i18n.utils";
import {
  mockTrackingWithTwoTickets,
  mockTrackingWithCompletedTicket,
  mockTrackingWithInProgressTicket,
  mockTrackingWithMultiplePeriods,
} from "./__mocks__/trackingData";

jest.mock("vscode");
jest.mock("../craTracking");
jest.mock("../config");
jest.mock("../utils/time.utils");
jest.mock("../utils/i18n.utils");

describe("excel.utils", () => {
  let mockWorkspaceFolders: vscode.WorkspaceFolder[];
  let mockFs: {
    writeFile: jest.Mock;
  };
  let mockUri: vscode.Uri;

  beforeEach(() => {
    jest.clearAllMocks();

    mockUri = vscode.Uri.file("/test/workspace");

    mockWorkspaceFolders = [
      {
        uri: mockUri,
        name: "test-workspace",
        index: 0,
      },
    ];

    (vscode.workspace.workspaceFolders as unknown) = mockWorkspaceFolders;

    mockFs = {
      writeFile: jest.fn().mockResolvedValue(undefined),
    };

    (vscode.workspace.fs.writeFile as jest.Mock) = mockFs.writeFile;
    
    (getCRATracking as jest.Mock).mockReturnValue([]);

    (getExcelOutputPath as jest.Mock).mockReturnValue("");
    (getExcelExecutable as jest.Mock).mockReturnValue("");
    (getExcelExportFormat as jest.Mock).mockReturnValue("xlsx");
    (t as jest.Mock).mockImplementation((key: string, ...args: string[]) => {
      const translations: Record<string, string> = {
        "excel.errorNoTracking": "No tracking found for this month",
        "excel.errorNoWorkspace": "No workspace open",
        "excel.sheetName": "Tracking",
        "excel.fileName": `Tracking_${args[0] || ""}_${args[1] || ""}`,
        "excel.columns.ticket": "Ticket",
        "excel.columns.branch": "Branch",
        "excel.columns.author": "Author",
        "excel.columns.timeSpentDays": "Time spent (days)",
        "excel.columns.timeSpentDetail": "Time spent (detail)",
        "excel.columns.status": "Status",
        "excel.columns.endDate": "End date",
        "ui.inProgress": "In progress",
        "ui.completed": "Completed",
        "excel.errorOpeningFile": "Error opening file",
        "excel.fileGeneratedButCannotOpen": `Spreadsheet file generated but unable to open: ${args[0] || ""}`,
        "excel.fileGenerated": `${args[0] || ""} file generated: ${args[1] || ""}`,
      };
      const translation = translations[key] || key;
      return translation.replace(/{(\d+)}/g, (match, index) => {
        const argIndex = parseInt(index, 10);
        return args[argIndex] !== undefined ? args[argIndex] : match;
      });
    });
    (getMonthName as jest.Mock).mockImplementation((month: number) => {
      const months: Record<number, string> = {
        1: "January",
        2: "February",
        3: "March",
        4: "April",
        5: "May",
        6: "June",
        7: "July",
        8: "August",
        9: "September",
        10: "October",
        11: "November",
        12: "December",
      };
      return months[month] || "";
    });
    (formatPreciseTime as jest.Mock).mockImplementation(
      (timeSpent: { days: number; hours: number; minutes: number; seconds: number }) => {
        const parts: string[] = [];
        if (timeSpent.days > 0) {
          parts.push(`${timeSpent.days}j`);
        }
        if (timeSpent.hours > 0) {
          parts.push(`${timeSpent.hours}h`);
        }
        if (timeSpent.minutes > 0) {
          parts.push(`${timeSpent.minutes}m`);
        }
        if (timeSpent.seconds > 0 && parts.length === 0) {
          parts.push(`${timeSpent.seconds}s`);
        }
        return parts.join(" ") || "0";
      }
    );
  });

  describe("generateExcelForMonth", () => {
    it("should throw an error if no workspace is open", async () => {
      (vscode.workspace.workspaceFolders as unknown) = undefined;
      (getCRATracking as jest.Mock).mockReturnValueOnce([
        {
          month: 12,
          year: 2025,
          tickets: [],
        },
      ]);

      await expect(generateExcelForMonth(12, 2025, undefined)).rejects.toThrow(
        "No workspace open"
      );
    });

    it("should throw an error if no tracking found for the month", async () => {
      (getCRATracking as jest.Mock).mockReturnValue([]);

      await expect(generateExcelForMonth(12, 2025, undefined)).rejects.toThrow(
        "No tracking found for this month"
      );
    });


    it("should generate Excel file with correct structure and data", async () => {
      (getCRATracking as jest.Mock).mockReturnValue([
        mockTrackingWithTwoTickets,
      ]);
      (formatPreciseTime as jest.Mock)
        .mockReturnValueOnce("1j")
        .mockReturnValueOnce("4h 30m");

      await generateExcelForMonth(12, 2025, undefined);

      expect(mockFs.writeFile).toHaveBeenCalledTimes(1);
      const writeFileCall = mockFs.writeFile.mock.calls[0];
      const filePath = writeFileCall[0];
      const buffer = writeFileCall[1];

      expect(filePath.fsPath).toContain("Tracking_December_2025");

      const workbook = XLSX.read(buffer, { type: "buffer" });
      expect(workbook.SheetNames).toEqual(["Tracking"]);

      const worksheet = workbook.Sheets["Tracking"];
      expect(worksheet).toBeDefined();

      const data = XLSX.utils.sheet_to_json(worksheet, {
        header: 1,
      });

      expect(data[0]).toEqual([
        "Ticket",
        "Branch",
        "Author",
        "Time spent (days)",
        "Time spent (detail)",
        "Status",
        "End date",
      ]);

      expect(data[1]).toEqual([
        "EDI-123",
        "feat/EDI-123_test",
        "John Doe <john@example.com>",
        1.0,
        "1j",
        "Completed",
        expect.stringMatching(/\d{1,2}\/\d{1,2}\/\d{4}/),
      ]);

      expect(data[2]).toEqual([
        "GDD-456",
        "feat/GDD-456_feature",
        "Jane Smith <jane@example.com>",
        expect.any(Number),
        "4h 30m",
        "In progress",
        "In progress",
      ]);

      expect(data).toHaveLength(3);
      expect(data[0]).toHaveLength(7);
    });

    it("should use configured output path when provided", async () => {
      (getCRATracking as jest.Mock).mockReturnValue([
        mockTrackingWithCompletedTicket,
      ]);
      (getExcelOutputPath as jest.Mock).mockReturnValue("/custom/path");
      (formatPreciseTime as jest.Mock).mockReturnValue("1j");

      await generateExcelForMonth(12, 2025, undefined);

      expect(mockFs.writeFile).toHaveBeenCalledTimes(1);
      const writeFileCall = mockFs.writeFile.mock.calls[0];
      const filePath = writeFileCall[0];

      expect(filePath.fsPath).toBe("/custom/path/Tracking_December_2025.xlsx");
      expect(filePath.fsPath).toContain("Tracking_December_2025");
    });

    it("should use workspace folder when output path is empty", async () => {
      (getCRATracking as jest.Mock).mockReturnValue([
        mockTrackingWithCompletedTicket,
      ]);
      (getExcelOutputPath as jest.Mock).mockReturnValue("");
      (formatPreciseTime as jest.Mock).mockReturnValue("1j");

      await generateExcelForMonth(12, 2025, undefined);

      expect(mockFs.writeFile).toHaveBeenCalledTimes(1);
      const writeFileCall = mockFs.writeFile.mock.calls[0];
      const filePath = writeFileCall[0];

      expect(filePath.fsPath).toBe("/test/workspace/Tracking_December_2025.xlsx");
    });

    it("should calculate time spent correctly for completed tickets", async () => {
      (getCRATracking as jest.Mock).mockReturnValue([
        mockTrackingWithCompletedTicket,
      ]);
      (formatPreciseTime as jest.Mock).mockReturnValue("1j");

      await generateExcelForMonth(12, 2025, undefined);

      const writeFileCall = mockFs.writeFile.mock.calls[0];
      const buffer = writeFileCall[1];
      const workbook = XLSX.read(buffer, { type: "buffer" });
      const worksheet = workbook.Sheets["Tracking"];
      const data = XLSX.utils.sheet_to_json(worksheet, {
        header: 1,
      });
      const row = data[1] as unknown[];
      expect(row[3]).toBe(1.0);
    });

    it("should calculate time spent correctly for in-progress tickets", async () => {
      (getCRATracking as jest.Mock).mockReturnValue([
        mockTrackingWithInProgressTicket,
      ]);
      (formatPreciseTime as jest.Mock).mockReturnValue("4h 30m");

      await generateExcelForMonth(12, 2025, undefined);

      const writeFileCall = mockFs.writeFile.mock.calls[0];
      const buffer = writeFileCall[1];
      const workbook = XLSX.read(buffer, { type: "buffer" });
      const worksheet = workbook.Sheets["Tracking"];
      const data = XLSX.utils.sheet_to_json(worksheet, {
        header: 1,
      });
      const row = data[1] as unknown[];
      const timeSpentDays = Number(row[3]);
      expect(timeSpentDays).toBeCloseTo(0.1875, 2);
      expect(row[4]).toBe("4h 30m");
        expect(row[5]).toBe("In progress");
    });

    it("should handle tickets with multiple periods", async () => {
      (getCRATracking as jest.Mock).mockReturnValue([
        mockTrackingWithMultiplePeriods,
      ]);
      (formatPreciseTime as jest.Mock).mockReturnValue("1j 4h");

      await generateExcelForMonth(12, 2025, undefined);

      const writeFileCall = mockFs.writeFile.mock.calls[0];
      const buffer = writeFileCall[1];
      const workbook = XLSX.read(buffer, { type: "buffer" });
      const worksheet = workbook.Sheets["Tracking"];
      const data = XLSX.utils.sheet_to_json(worksheet, {
        header: 1,
      });

      expect(data[1]).toEqual([
        "EDI-789",
        "feat/EDI-789_complex",
        "Bob Wilson <bob@example.com>",
        1.5,
        "1j 4h",
        "Completed",
        expect.stringMatching(/\d{1,2}\/\d{1,2}\/\d{4}/),
      ]);
    });

    it("should generate CSV file when format is csv", async () => {
      (getCRATracking as jest.Mock).mockReturnValue([
        mockTrackingWithCompletedTicket,
      ]);
      (getExcelExportFormat as jest.Mock).mockReturnValue("csv");
      (formatPreciseTime as jest.Mock).mockReturnValue("1j");

      await generateExcelForMonth(12, 2025, undefined);

      expect(mockFs.writeFile).toHaveBeenCalledTimes(1);
      const writeFileCall = mockFs.writeFile.mock.calls[0];
      const filePath = writeFileCall[0];
      const buffer = writeFileCall[1];

      expect(filePath.fsPath).toContain("Tracking_December_2025.csv");
      expect(buffer).toBeInstanceOf(Buffer);
      const csvBuffer = Buffer.from(buffer);
      const csvContent = csvBuffer.toString("utf-8");
      expect(csvContent).toContain("Ticket");
      expect(csvContent).toContain("EDI-123");
    });

    it("should generate ODS file when format is ods", async () => {
      (getCRATracking as jest.Mock).mockReturnValue([
        mockTrackingWithCompletedTicket,
      ]);
      (getExcelExportFormat as jest.Mock).mockReturnValue("ods");
      (formatPreciseTime as jest.Mock).mockReturnValue("1j");

      await generateExcelForMonth(12, 2025, undefined);

      expect(mockFs.writeFile).toHaveBeenCalledTimes(1);
      const writeFileCall = mockFs.writeFile.mock.calls[0];
      const filePath = writeFileCall[0];

      expect(filePath.fsPath).toContain("Tracking_December_2025.ods");
    });
  });
});

