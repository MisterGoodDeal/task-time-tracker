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
import {
  mockTrackingForDecember2025,
  mockTrackingWithTwoTickets,
  mockTrackingWithCompletedTicket,
  mockTrackingWithInProgressTicket,
  mockTrackingWithMultiplePeriods,
} from "./__mocks__/trackingData";

jest.mock("vscode");
jest.mock("../craTracking");
jest.mock("../config");
jest.mock("../utils/time.utils");

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
    (getMonthName as jest.Mock).mockImplementation((month: number) => {
      const months = [
        "janvier",
        "février",
        "mars",
        "avril",
        "mai",
        "juin",
        "juillet",
        "août",
        "septembre",
        "octobre",
        "novembre",
        "décembre",
      ];
      return months[month - 1];
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

      await expect(generateExcelForMonth(12, 2025)).rejects.toThrow(
        "Aucun workspace ouvert"
      );
    });

    it("should throw an error if no tracking found for the month", async () => {
      (getCRATracking as jest.Mock).mockReturnValue([]);

      await expect(generateExcelForMonth(12, 2025)).rejects.toThrow(
        "Aucun suivi trouvé pour ce mois"
      );
    });


    it("should generate Excel file with correct structure and data", async () => {
      (getCRATracking as jest.Mock).mockReturnValue([
        mockTrackingWithTwoTickets,
      ]);
      (formatPreciseTime as jest.Mock)
        .mockReturnValueOnce("1j")
        .mockReturnValueOnce("4h 30m");

      await generateExcelForMonth(12, 2025);

      expect(mockFs.writeFile).toHaveBeenCalledTimes(1);
      const writeFileCall = mockFs.writeFile.mock.calls[0];
      const filePath = writeFileCall[0];
      const buffer = writeFileCall[1];

      expect(filePath.fsPath).toContain("Suivi_décembre_2025");

      const workbook = XLSX.read(buffer, { type: "buffer" });
      expect(workbook.SheetNames).toEqual(["Suivi"]);

      const worksheet = workbook.Sheets["Suivi"];
      expect(worksheet).toBeDefined();

      const data = XLSX.utils.sheet_to_json(worksheet, {
        header: 1,
      }) as unknown[][];

      expect(data[0]).toEqual([
        "Ticket",
        "Branche",
        "Auteur",
        "Temps passé (jours)",
        "Temps passé (détail)",
        "Statut",
        "Date de fin",
      ]);

      expect(data[1]).toEqual([
        "EDI-123",
        "feat/EDI-123_test",
        "John Doe <john@example.com>",
        1.0,
        "1j",
        "Terminé",
        "01/12/2025",
      ]);

      expect(data[2]).toEqual([
        "GDD-456",
        "feat/GDD-456_feature",
        "Jane Smith <jane@example.com>",
        expect.any(Number),
        "4h 30m",
        "En cours",
        "En cours",
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

      await generateExcelForMonth(12, 2025);

      expect(mockFs.writeFile).toHaveBeenCalledTimes(1);
      const writeFileCall = mockFs.writeFile.mock.calls[0];
      const filePath = writeFileCall[0];

      expect(filePath.fsPath).toBe("/custom/path/Suivi_décembre_2025.xlsx");
      expect(filePath.fsPath).toContain("Suivi_décembre_2025");
    });

    it("should use workspace folder when output path is empty", async () => {
      (getCRATracking as jest.Mock).mockReturnValue([
        mockTrackingWithCompletedTicket,
      ]);
      (getExcelOutputPath as jest.Mock).mockReturnValue("");
      (formatPreciseTime as jest.Mock).mockReturnValue("1j");

      await generateExcelForMonth(12, 2025);

      expect(mockFs.writeFile).toHaveBeenCalledTimes(1);
      const writeFileCall = mockFs.writeFile.mock.calls[0];
      const filePath = writeFileCall[0];

      expect(filePath.fsPath).toBe("/test/workspace/Suivi_décembre_2025.xlsx");
    });

    it("should calculate time spent correctly for completed tickets", async () => {
      (getCRATracking as jest.Mock).mockReturnValue([
        mockTrackingWithCompletedTicket,
      ]);
      (formatPreciseTime as jest.Mock).mockReturnValue("1j");

      await generateExcelForMonth(12, 2025);

      const writeFileCall = mockFs.writeFile.mock.calls[0];
      const buffer = writeFileCall[1];
      const workbook = XLSX.read(buffer, { type: "buffer" });
      const worksheet = workbook.Sheets["Suivi"];
      const data = XLSX.utils.sheet_to_json(worksheet, {
        header: 1,
      }) as unknown[][];

      expect(data[1][3]).toBe(1.0);
    });

    it("should calculate time spent correctly for in-progress tickets", async () => {
      (getCRATracking as jest.Mock).mockReturnValue([
        mockTrackingWithInProgressTicket,
      ]);
      (formatPreciseTime as jest.Mock).mockReturnValue("4h 30m");

      await generateExcelForMonth(12, 2025);

      const writeFileCall = mockFs.writeFile.mock.calls[0];
      const buffer = writeFileCall[1];
      const workbook = XLSX.read(buffer, { type: "buffer" });
      const worksheet = workbook.Sheets["Suivi"];
      const data = XLSX.utils.sheet_to_json(worksheet, {
        header: 1,
      }) as unknown[][];

      const timeSpentDays = data[1][3] as number;
      expect(timeSpentDays).toBeCloseTo(0.1875, 2);
      expect(data[1][4]).toBe("4h 30m");
      expect(data[1][5]).toBe("En cours");
    });

    it("should handle tickets with multiple periods", async () => {
      (getCRATracking as jest.Mock).mockReturnValue([
        mockTrackingWithMultiplePeriods,
      ]);
      (formatPreciseTime as jest.Mock).mockReturnValue("1j 4h");

      await generateExcelForMonth(12, 2025);

      const writeFileCall = mockFs.writeFile.mock.calls[0];
      const buffer = writeFileCall[1];
      const workbook = XLSX.read(buffer, { type: "buffer" });
      const worksheet = workbook.Sheets["Suivi"];
      const data = XLSX.utils.sheet_to_json(worksheet, {
        header: 1,
      }) as unknown[][];

      expect(data[1]).toEqual([
        "EDI-789",
        "feat/EDI-789_complex",
        "Bob Wilson <bob@example.com>",
        1.5,
        "1j 4h",
        "Terminé",
        "02/12/2025",
      ]);
    });

    it("should generate CSV file when format is csv", async () => {
      (getCRATracking as jest.Mock).mockReturnValue([
        mockTrackingWithCompletedTicket,
      ]);
      (getExcelExportFormat as jest.Mock).mockReturnValue("csv");
      (formatPreciseTime as jest.Mock).mockReturnValue("1j");

      await generateExcelForMonth(12, 2025);

      expect(mockFs.writeFile).toHaveBeenCalledTimes(1);
      const writeFileCall = mockFs.writeFile.mock.calls[0];
      const filePath = writeFileCall[0];
      const buffer = writeFileCall[1];

      expect(filePath.fsPath).toContain("Suivi_décembre_2025.csv");
      expect(buffer).toBeInstanceOf(Buffer);
      const csvContent = buffer.toString("utf-8");
      expect(csvContent).toContain("Ticket");
      expect(csvContent).toContain("EDI-123");
    });

    it("should generate ODS file when format is ods", async () => {
      (getCRATracking as jest.Mock).mockReturnValue([
        mockTrackingWithCompletedTicket,
      ]);
      (getExcelExportFormat as jest.Mock).mockReturnValue("ods");
      (formatPreciseTime as jest.Mock).mockReturnValue("1j");

      await generateExcelForMonth(12, 2025);

      expect(mockFs.writeFile).toHaveBeenCalledTimes(1);
      const writeFileCall = mockFs.writeFile.mock.calls[0];
      const filePath = writeFileCall[0];

      expect(filePath.fsPath).toContain("Suivi_décembre_2025.ods");
    });
  });
});

