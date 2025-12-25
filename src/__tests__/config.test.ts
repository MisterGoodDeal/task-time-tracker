import { getWorkStartHour, getWorkEndHour, convert12hTo24h } from "../config";
import * as vscode from "vscode";

jest.mock("vscode");

describe("config", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("convert12hTo24h", () => {
    it("should convert 12 AM to 0", () => {
      expect(convert12hTo24h(12, "AM")).toBe(0);
    });

    it("should convert 1 AM to 1", () => {
      expect(convert12hTo24h(1, "AM")).toBe(1);
    });

    it("should convert 12 PM to 12", () => {
      expect(convert12hTo24h(12, "PM")).toBe(12);
    });

    it("should convert 1 PM to 13", () => {
      expect(convert12hTo24h(1, "PM")).toBe(13);
    });

    it("should convert 6 PM to 18", () => {
      expect(convert12hTo24h(6, "PM")).toBe(18);
    });
  });

  describe("getWorkStartHour", () => {
    it("should return hour in 24h format if timeFormat is 24h", () => {
      const mockGet = jest.fn((key: string, defaultValue?: unknown) => {
        if (key === "timeFormat") return "24h";
        if (key === "workStartHour") return 9;
        return defaultValue;
      });
      (vscode.workspace.getConfiguration as jest.Mock).mockReturnValue({
        get: mockGet as jest.Mock,
      });

      expect(getWorkStartHour()).toBe(9);
    });

    it("should convert hour to 24h format if timeFormat is 12h", () => {
      const mockGet = jest.fn((key: string, defaultValue?: unknown) => {
        if (key === "timeFormat") return "12h";
        if (key === "workStartHour12h") return 9;
        if (key === "workStartPeriod") return "AM";
        return defaultValue;
      });
      (vscode.workspace.getConfiguration as jest.Mock).mockReturnValue({
        get: mockGet as jest.Mock,
      });

      expect(getWorkStartHour()).toBe(9);
    });
  });

  describe("getWorkEndHour", () => {
    it("should return hour in 24h format if timeFormat is 24h", () => {
      const mockGet = jest.fn((key: string, defaultValue?: unknown) => {
        if (key === "timeFormat") return "24h";
        if (key === "workEndHour") return 18;
        return defaultValue;
      });
      (vscode.workspace.getConfiguration as jest.Mock).mockReturnValue({
        get: mockGet as jest.Mock,
      });

      expect(getWorkEndHour()).toBe(18);
    });

    it("should convert hour to 24h format if timeFormat is 12h", () => {
      const mockGet = jest.fn((key: string, defaultValue?: unknown) => {
        if (key === "timeFormat") return "12h";
        if (key === "workEndHour12h") return 6;
        if (key === "workEndPeriod") return "PM";
        return defaultValue;
      });
      (vscode.workspace.getConfiguration as jest.Mock).mockReturnValue({
        get: mockGet as jest.Mock,
      });

      expect(getWorkEndHour()).toBe(18);
    });
  });
});
