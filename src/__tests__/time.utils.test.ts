import { formatHour, calculateTimeSpentInDays } from "../utils/time.utils";
import * as vscode from "vscode";

jest.mock("vscode");

describe("time.utils", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("formatHour", () => {
    it("should format an hour in 24h format", () => {
      const mockGet = jest.fn((key: string, defaultValue?: unknown) => {
        if (key === "timeFormat") return "24h";
        return defaultValue;
      });
      (vscode.workspace.getConfiguration as jest.Mock).mockReturnValue({
        get: mockGet as jest.Mock,
      });

      expect(formatHour(9)).toBe("9h");
      expect(formatHour(18)).toBe("18h");
      expect(formatHour(0)).toBe("0h");
      expect(formatHour(23)).toBe("23h");
    });

    it("should format an hour in 12h format", () => {
      const mockGet = jest.fn((key: string, defaultValue?: unknown) => {
        if (key === "timeFormat") return "12h";
        return defaultValue;
      });
      (vscode.workspace.getConfiguration as jest.Mock).mockReturnValue({
        get: mockGet as jest.Mock,
      });

      expect(formatHour(0)).toBe("12 AM");
      expect(formatHour(9)).toBe("9 AM");
      expect(formatHour(12)).toBe("12 PM");
      expect(formatHour(13)).toBe("1 PM");
      expect(formatHour(18)).toBe("6 PM");
      expect(formatHour(23)).toBe("11 PM");
    });

    it("should accept an explicit format", () => {
      expect(formatHour(9, "24h")).toBe("9h");
      expect(formatHour(9, "12h")).toBe("9 AM");
      expect(formatHour(18, "12h")).toBe("6 PM");
    });
  });

  describe("calculateTimeSpentInDays", () => {
    beforeEach(() => {
      const mockGet = jest.fn((key: string, defaultValue?: unknown) => {
        if (key === "workStartHour") return 9;
        if (key === "workEndHour") return 18;
        return defaultValue;
      });
      (vscode.workspace.getConfiguration as jest.Mock).mockReturnValue({
        get: mockGet as jest.Mock,
      });
    });

    it("should calculate 0.5 days for a half day", () => {
      const start = new Date(2024, 0, 1, 9, 0);
      const end = new Date(2024, 0, 1, 13, 30);
      const result = calculateTimeSpentInDays(start, end);
      expect(result).toBe(0.5);
    });

    it("should calculate 1 day for a full day", () => {
      const start = new Date(2024, 0, 1, 9, 0);
      const end = new Date(2024, 0, 2, 18, 0);
      const result = calculateTimeSpentInDays(start, end);
      expect(result).toBe(1);
    });

    it("should return a minimum of 0.5 days", () => {
      const start = new Date(2024, 0, 1, 9, 0);
      const end = new Date(2024, 0, 1, 9, 30);
      const result = calculateTimeSpentInDays(start, end);
      expect(result).toBe(0.5);
    });
  });
});
