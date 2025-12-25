import {
  formatHour,
  calculateTimeSpentInDays,
  calculatePreciseTimeSpent,
} from "../utils/time.utils";
import * as vscode from "vscode";
import { getWorkStartHour, getWorkEndHour, getTimeIncrement } from "../config";
import {
  mockEmptyTicket,
  mockTicketWithSinglePeriod,
  mockTicketWithMultiplePeriods,
  mockTicketWithActivePeriod,
  mockTicketWithOverlappingPeriods,
  mockTicketWithCrossDayPeriod,
} from "./__mocks__/ticketData";

jest.mock("vscode");
jest.mock("../config");

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
      expect(formatHour(0, "12h")).toBe("12 AM");
      expect(formatHour(9, "12h")).toBe("9 AM");
      expect(formatHour(12, "12h")).toBe("12 PM");
      expect(formatHour(13, "12h")).toBe("1 PM");
      expect(formatHour(18, "12h")).toBe("6 PM");
      expect(formatHour(23, "12h")).toBe("11 PM");
    });

    it("should accept an explicit format", () => {
      expect(formatHour(9, "24h")).toBe("9h");
      expect(formatHour(9, "12h")).toBe("9 AM");
      expect(formatHour(18, "12h")).toBe("6 PM");
    });
  });

  describe("calculateTimeSpentInDays", () => {
    beforeEach(() => {
      (getWorkStartHour as jest.Mock).mockReturnValue(9);
      (getWorkEndHour as jest.Mock).mockReturnValue(18);
      (getTimeIncrement as jest.Mock).mockReturnValue(0.5);
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

    it("should return a minimum of configured time increment", () => {
      const start = new Date(2024, 0, 1, 9, 0);
      const end = new Date(2024, 0, 1, 9, 30);
      const result = calculateTimeSpentInDays(start, end);
      expect(result).toBe(0.5);
    });
  });

  describe("calculatePreciseTimeSpent", () => {
    beforeEach(() => {
      (getWorkStartHour as jest.Mock).mockReturnValue(9);
      (getWorkEndHour as jest.Mock).mockReturnValue(18);
    });

    it("should return zero for empty periods", () => {
      const ticket = mockEmptyTicket;

      const result = calculatePreciseTimeSpent(ticket);
      expect(result).toEqual({
        days: 0,
        hours: 0,
        minutes: 0,
        seconds: 0,
      });
    });

    it("should calculate time spent during work hours", () => {
      const ticket = {
        ticketProviderUrl: "",
        ticket: "TEST-1",
        branchName: "test",
        periods: [
          {
            startDate: new Date(2024, 0, 1, 10, 0, 0),
            endDate: new Date(2024, 0, 1, 12, 30, 0),
          },
        ],
        author: "Test",
        timeSpentInDays: null,
        timeSpent: {
          days: 0,
          hours: 0,
          minutes: 0,
          seconds: 0,
        },
      };

      const result = calculatePreciseTimeSpent(ticket);
      expect(result.hours).toBe(2);
      expect(result.minutes).toBe(30);
      expect(result.seconds).toBe(0);
    });

    it("should not count time outside work hours", () => {
      const ticket = {
        ticketProviderUrl: "",
        ticket: "TEST-1",
        branchName: "test",
        periods: [
          {
            startDate: new Date(2024, 0, 1, 20, 0, 0),
            endDate: new Date(2024, 0, 1, 22, 0, 0),
          },
        ],
        author: "Test",
        timeSpentInDays: null,
        timeSpent: {
          days: 0,
          hours: 0,
          minutes: 0,
          seconds: 0,
        },
      };

      const result = calculatePreciseTimeSpent(ticket);
      expect(result.days).toBe(0);
      expect(result.hours).toBe(0);
      expect(result.minutes).toBe(0);
      expect(result.seconds).toBe(0);
    });

    it("should count only the part within work hours when period spans outside", () => {
      const ticket = {
        ticketProviderUrl: "",
        ticket: "TEST-1",
        branchName: "test",
        periods: [
          {
            startDate: new Date(2024, 0, 1, 8, 0, 0),
            endDate: new Date(2024, 0, 1, 10, 30, 0),
          },
        ],
        author: "Test",
        timeSpentInDays: null,
        timeSpent: {
          days: 0,
          hours: 0,
          minutes: 0,
          seconds: 0,
        },
      };

      const result = calculatePreciseTimeSpent(ticket);
      expect(result.hours).toBe(1);
      expect(result.minutes).toBe(30);
      expect(result.seconds).toBe(0);
    });

    it("should merge periods on the same day", () => {
      const ticket = {
        ticketProviderUrl: "",
        ticket: "TEST-1",
        branchName: "test",
        periods: [
          {
            startDate: new Date(2024, 0, 1, 10, 0, 0),
            endDate: new Date(2024, 0, 1, 11, 0, 0),
          },
          {
            startDate: new Date(2024, 0, 1, 14, 0, 0),
            endDate: new Date(2024, 0, 1, 15, 0, 0),
          },
        ],
        author: "Test",
        timeSpentInDays: null,
        timeSpent: {
          days: 0,
          hours: 0,
          minutes: 0,
          seconds: 0,
        },
      };

      const result = calculatePreciseTimeSpent(ticket);
      expect(result.hours).toBeGreaterThanOrEqual(2);
      expect(result.minutes).toBeGreaterThanOrEqual(0);
    });

    it("should calculate time across multiple days", () => {
      const ticket = {
        ticketProviderUrl: "",
        ticket: "TEST-1",
        branchName: "test",
        periods: [
          {
            startDate: new Date(2024, 0, 1, 10, 0, 0),
            endDate: new Date(2024, 0, 2, 15, 0, 0),
          },
        ],
        author: "Test",
        timeSpentInDays: null,
        timeSpent: {
          days: 0,
          hours: 0,
          minutes: 0,
          seconds: 0,
        },
      };

      const result = calculatePreciseTimeSpent(ticket);
      expect(result.days).toBe(0);
      expect(result.hours).toBeGreaterThan(0);
    });

    it("should handle active period (endDate null)", () => {
      const now = new Date(2024, 0, 1, 12, 0, 0);
      jest.useFakeTimers();
      jest.setSystemTime(now);

      const ticket = {
        ticketProviderUrl: "",
        ticket: "TEST-1",
        branchName: "test",
        periods: [
          {
            startDate: new Date(2024, 0, 1, 10, 0, 0),
            endDate: null,
          },
        ],
        author: "Test",
        timeSpentInDays: null,
        timeSpent: {
          days: 0,
          hours: 0,
          minutes: 0,
          seconds: 0,
        },
      };

      const result = calculatePreciseTimeSpent(ticket);
      expect(result.hours).toBe(2);
      expect(result.minutes).toBe(0);

      jest.useRealTimers();
    });

    it("should handle complete flow: start during work hours, pause, resume, end outside work hours", () => {
      const ticket = {
        ticketProviderUrl: "",
        ticket: "TEST-1",
        branchName: "test",
        periods: [
          {
            startDate: new Date(2024, 0, 1, 10, 0, 0),
            endDate: new Date(2024, 0, 1, 12, 0, 0),
          },
          {
            startDate: new Date(2024, 0, 1, 14, 0, 0),
            endDate: new Date(2024, 0, 1, 16, 30, 0),
          },
          {
            startDate: new Date(2024, 0, 1, 17, 0, 0),
            endDate: new Date(2024, 0, 1, 19, 0, 0),
          },
        ],
        author: "Test",
        timeSpentInDays: null,
        timeSpent: {
          days: 0,
          hours: 0,
          minutes: 0,
          seconds: 0,
        },
      };

      const result = calculatePreciseTimeSpent(ticket);
      expect(result.hours).toBeGreaterThanOrEqual(5);
      expect(result.minutes).toBeGreaterThanOrEqual(0);
      expect(result.seconds).toBeGreaterThanOrEqual(0);
    });

    it("should handle flow with periods starting before work hours and ending after", () => {
      const ticket = {
        ticketProviderUrl: "",
        ticket: "TEST-1",
        branchName: "test",
        periods: [
          {
            startDate: new Date(2024, 0, 1, 7, 0, 0),
            endDate: new Date(2024, 0, 1, 20, 0, 0),
          },
        ],
        author: "Test",
        timeSpentInDays: null,
        timeSpent: {
          days: 0,
          hours: 0,
          minutes: 0,
          seconds: 0,
        },
      };

      const result = calculatePreciseTimeSpent(ticket);
      expect(result.hours).toBe(9);
      expect(result.minutes).toBe(0);
      expect(result.seconds).toBe(0);
    });

    it("should handle multiple days with periods inside and outside work hours", () => {
      const ticket = {
        ticketProviderUrl: "",
        ticket: "TEST-1",
        branchName: "test",
        periods: [
          {
            startDate: new Date(2024, 0, 1, 10, 0, 0),
            endDate: new Date(2024, 0, 1, 17, 0, 0),
          },
          {
            startDate: new Date(2024, 0, 2, 8, 0, 0),
            endDate: new Date(2024, 0, 2, 22, 0, 0),
          },
        ],
        author: "Test",
        timeSpentInDays: null,
        timeSpent: {
          days: 0,
          hours: 0,
          minutes: 0,
          seconds: 0,
        },
      };

      const result = calculatePreciseTimeSpent(ticket);
      expect(result.hours).toBeGreaterThan(9);
      expect(result.days).toBe(0);
    });
  });
});
