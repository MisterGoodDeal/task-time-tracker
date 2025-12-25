import {
  getCRATracking,
  isTicketTracked,
  addTicketToTracking,
  removeTicketFromTracking,
  markTicketAsCompleted,
  markTicketAsInProgress,
  pauseAllActiveTickets,
  startTicketTrackingIfExists,
} from "../craTracking";
import { calculateTotalTimeSpentInDays } from "../utils/time.utils";
import { ICRAItem, ICRATicket } from "../types/cra.types";
import * as vscode from "vscode";
import { getTicketBaseUrl, getWorkStartHour, getWorkEndHour, getTimeIncrement } from "../config";
import { getGitAuthor, getCurrentBranch } from "../utils/git.utils";

jest.mock("vscode");
jest.mock("../config");
jest.mock("../utils/git.utils");

const mockTrackingData: ICRAItem[] = [
  {
    month: 12,
    year: 2025,
    tickets: [
      {
        ticketProviderUrl: "https://inedi.atlassian.net/browse/GDD-750",
        ticket: "GDD-750",
        branchName: "feat/GDD-750_test-ticket",
        periods: [
          {
            startDate: new Date("2025-12-25T21:07:23.962Z"),
            endDate: new Date("2025-12-25T21:07:28.947Z"),
          },
          {
            startDate: new Date("2025-12-25T21:07:36.244Z"),
            endDate: new Date("2025-12-25T21:08:16.586Z"),
          },
          {
            startDate: new Date("2025-12-25T21:08:46.549Z"),
            endDate: new Date("2025-12-25T21:14:05.477Z"),
          },
          {
            startDate: new Date("2025-12-25T21:14:15.187Z"),
            endDate: new Date("2025-12-25T21:14:28.986Z"),
          },
          {
            startDate: new Date("2025-12-25T21:14:29.071Z"),
            endDate: new Date("2025-12-25T21:14:32.765Z"),
          },
          {
            startDate: new Date("2025-12-25T21:16:20.048Z"),
            endDate: null,
          },
        ],
        author: "Milan Camus <mcamus@aubay.com>",
        timeSpentInDays: 0.5,
      },
      {
        ticketProviderUrl: "https://inedi.atlassian.net/browse/GDD-421",
        ticket: "GDD-421",
        branchName: "feat/GDD-421_dufhzeiufzh",
        periods: [
          {
            startDate: new Date("2025-12-25T21:08:18.363Z"),
            endDate: new Date("2025-12-25T21:08:46.507Z"),
          },
          {
            startDate: new Date("2025-12-25T21:14:05.563Z"),
            endDate: new Date("2025-12-25T21:14:15.103Z"),
          },
          {
            startDate: new Date("2025-12-25T21:14:32.844Z"),
            endDate: new Date("2025-12-25T21:16:19.947Z"),
          },
        ],
        author: "Milan Camus <mcamus@aubay.com>",
        timeSpentInDays: 0.5,
      },
    ],
  },
];

describe("craTracking", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (vscode.workspace.getConfiguration as jest.Mock).mockReturnValue({
      get: jest.fn((key: string, defaultValue?: any) => {
        if (key === "tracking") {
          return mockTrackingData.map((item) => ({
            ...item,
            tickets: item.tickets.map((ticket) => ({
              ...ticket,
              periods: ticket.periods.map((period) => ({
                startDate: period.startDate.toISOString(),
                endDate: period.endDate ? period.endDate.toISOString() : null,
              })),
            })),
          }));
        }
        return defaultValue;
      }),
      update: jest.fn(),
    });
  });

  describe("getCRATracking", () => {
    it("should return tracking data with proper date conversion", () => {
      const tracking = getCRATracking();
      expect(tracking).toHaveLength(1);
      expect(tracking[0].month).toBe(12);
      expect(tracking[0].year).toBe(2025);
      expect(tracking[0].tickets).toHaveLength(2);

      const firstTicket = tracking[0].tickets[0];
      expect(firstTicket.ticket).toBe("GDD-750");
      expect(firstTicket.periods).toHaveLength(6);
      expect(firstTicket.periods[0].startDate).toBeInstanceOf(Date);
      expect(firstTicket.periods[5].endDate).toBeNull();
    });
  });

  describe("isTicketTracked", () => {
    it("should return true if ticket is tracked in current month", () => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date("2025-12-25T12:00:00.000Z"));

      const result = isTicketTracked("GDD-750");
      expect(result).toBe(true);

      jest.useRealTimers();
    });

    it("should return false if ticket is not tracked", () => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date("2025-12-25T12:00:00.000Z"));

      const result = isTicketTracked("GDD-999");
      expect(result).toBe(false);

      jest.useRealTimers();
    });

    it("should return false if ticket is tracked in different month", () => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date("2025-11-25T12:00:00.000Z"));

      const result = isTicketTracked("GDD-750");
      expect(result).toBe(false);

      jest.useRealTimers();
    });
  });

  describe("calculateTotalTimeSpentInDays", () => {
    beforeEach(() => {
      (getWorkStartHour as jest.Mock).mockReturnValue(9);
      (getWorkEndHour as jest.Mock).mockReturnValue(18);
      (getTimeIncrement as jest.Mock).mockReturnValue(0.5);
    });

    it("should calculate time spent correctly for multiple periods on same day", () => {
      const ticket: ICRATicket = {
        ticketProviderUrl: "https://inedi.atlassian.net/browse/GDD-750",
        ticket: "GDD-750",
        branchName: "feat/GDD-750_test",
        periods: [
          {
            startDate: new Date("2025-12-25T09:00:00.000Z"),
            endDate: new Date("2025-12-25T13:00:00.000Z"),
          },
          {
            startDate: new Date("2025-12-25T14:00:00.000Z"),
            endDate: new Date("2025-12-25T18:00:00.000Z"),
          },
        ],
        author: "Test User",
        timeSpentInDays: null,
      };

      const result = calculateTotalTimeSpentInDays(ticket);
      expect(result).toBeGreaterThan(0);
      expect(result).toBe(1);
    });

    it("should calculate time for active period using current time", () => {
      jest.useFakeTimers();
      const now = new Date("2025-12-25T13:30:00.000Z");
      jest.setSystemTime(now);

      const ticket: ICRATicket = {
        ticketProviderUrl: "https://inedi.atlassian.net/browse/GDD-750",
        ticket: "GDD-750",
        branchName: "feat/GDD-750_test",
        periods: [
          {
            startDate: new Date("2025-12-25T09:00:00.000Z"),
            endDate: null,
          },
        ],
        author: "Test User",
        timeSpentInDays: null,
      };

      const result = calculateTotalTimeSpentInDays(ticket);
      expect(result).toBeGreaterThan(0);
      expect(result).toBe(0.5);

      jest.useRealTimers();
    });
  });

  describe("addTicketToTracking", () => {
    beforeEach(() => {
      (getTicketBaseUrl as jest.Mock).mockReturnValue(
        "https://inedi.atlassian.net/browse"
      );
      (getGitAuthor as jest.Mock).mockResolvedValue(
        "Test User <test@example.com>"
      );
      (getCurrentBranch as jest.Mock).mockResolvedValue("feat/GDD-999_test");
    });

    it("should add a new ticket to existing month", async () => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date("2025-12-25T12:00:00.000Z"));

      const mockUpdate = jest.fn();
      (vscode.workspace.getConfiguration as jest.Mock).mockReturnValue({
        get: jest.fn((key: string, defaultValue?: unknown) => {
          if (key === "tracking") {
            return mockTrackingData.map((item) => ({
              ...item,
              tickets: item.tickets.map((ticket) => ({
                ...ticket,
                periods: ticket.periods.map((period) => ({
                  startDate: period.startDate.toISOString(),
                  endDate: period.endDate ? period.endDate.toISOString() : null,
                })),
              })),
            }));
          }
          return defaultValue;
        }),
        update: mockUpdate,
      });

      await addTicketToTracking(
        "GDD-999",
        "https://inedi.atlassian.net/browse"
      );

      expect(mockUpdate).toHaveBeenCalled();
      const callArgs = mockUpdate.mock.calls[0];
      expect(callArgs[0]).toBe("tracking");
      const updatedTracking = callArgs[1] as ICRAItem[] | undefined;
      expect(updatedTracking).toBeDefined();
      if (!updatedTracking) return;
      const decemberItem = updatedTracking.find(
        (item) => item.month === 12 && item.year === 2025
      );
      expect(decemberItem).toBeDefined();
      const newTicket = decemberItem!.tickets.find(
        (t) => t.ticket === "GDD-999"
      );
      expect(newTicket).toBeDefined();
      expect(newTicket!.periods).toHaveLength(1);
      expect(newTicket!.periods[0].endDate).toBeNull();

      jest.useRealTimers();
    });

    it("should create new month item if it doesn't exist", async () => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date("2025-11-25T12:00:00.000Z"));

      const mockUpdate = jest.fn();
      (vscode.workspace.getConfiguration as jest.Mock).mockReturnValue({
        get: jest.fn((key: string, defaultValue?: unknown) => {
          if (key === "tracking") {
            return mockTrackingData.map((item) => ({
              ...item,
              tickets: item.tickets.map((ticket) => ({
                ...ticket,
                periods: ticket.periods.map((period) => ({
                  startDate: period.startDate.toISOString(),
                  endDate: period.endDate ? period.endDate.toISOString() : null,
                })),
              })),
            }));
          }
          return defaultValue;
        }),
        update: mockUpdate,
      });

      await addTicketToTracking(
        "GDD-999",
        "https://inedi.atlassian.net/browse"
      );

      expect(mockUpdate).toHaveBeenCalled();
      const callArgs = mockUpdate.mock.calls[0];
      if (!callArgs || callArgs.length < 2) return;
      const updatedTracking = callArgs[1] as ICRAItem[] | undefined;
      expect(updatedTracking).toBeDefined();
      if (!updatedTracking) return;
      const novemberItem = updatedTracking.find(
        (item) => item.month === 11 && item.year === 2025
      );
      expect(novemberItem).toBeDefined();

      jest.useRealTimers();
    });

    it("should throw error if ticket already exists", async () => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date("2025-12-25T12:00:00.000Z"));

      await expect(
        addTicketToTracking("GDD-750", "https://inedi.atlassian.net/browse")
      ).rejects.toThrow("Ce ticket est déjà dans le suivi pour ce mois");

      jest.useRealTimers();
    });
  });

  describe("removeTicketFromTracking", () => {
    it("should remove ticket from tracking", async () => {
      const mockUpdate = jest.fn();
      (vscode.workspace.getConfiguration as jest.Mock).mockReturnValue({
        get: jest.fn((key: string, defaultValue?: unknown) => {
          if (key === "tracking") {
            return mockTrackingData.map((item) => ({
              ...item,
              tickets: item.tickets.map((ticket) => ({
                ...ticket,
                periods: ticket.periods.map((period) => ({
                  startDate: period.startDate.toISOString(),
                  endDate: period.endDate ? period.endDate.toISOString() : null,
                })),
              })),
            }));
          }
          return defaultValue;
        }),
        update: mockUpdate,
      });

      await removeTicketFromTracking("GDD-750", 12, 2025);

      expect(mockUpdate).toHaveBeenCalled();
      const callArgs = mockUpdate.mock.calls[0];
      if (!callArgs || callArgs.length < 2) return;
      const updatedTracking = callArgs[1] as ICRAItem[] | undefined;
      expect(updatedTracking).toBeDefined();
      if (!updatedTracking) return;
      const decemberItem = updatedTracking.find(
        (item) => item.month === 12 && item.year === 2025
      );
      expect(decemberItem).toBeDefined();
      const removedTicket = decemberItem!.tickets.find(
        (t) => t.ticket === "GDD-750"
      );
      expect(removedTicket).toBeUndefined();
    });

    it("should throw error if ticket not found", async () => {
      await expect(
        removeTicketFromTracking("GDD-999", 12, 2025)
      ).rejects.toThrow("Ce ticket n'est pas dans le suivi");
    });
  });

  describe("markTicketAsCompleted", () => {
    it("should mark active ticket as completed", async () => {
      const mockUpdate = jest.fn();
      (vscode.workspace.getConfiguration as jest.Mock).mockReturnValue({
        get: jest.fn((key: string, defaultValue?: unknown) => {
          if (key === "tracking") {
            return mockTrackingData.map((item) => ({
              ...item,
              tickets: item.tickets.map((ticket) => ({
                ...ticket,
                periods: ticket.periods.map((period) => ({
                  startDate: period.startDate.toISOString(),
                  endDate: period.endDate ? period.endDate.toISOString() : null,
                })),
              })),
            }));
          }
          if (key === "workStartHour") return 9;
          if (key === "workEndHour") return 18;
          if (key === "timeIncrement") return 0.5;
          return defaultValue;
        }),
        update: mockUpdate,
      });

      await markTicketAsCompleted("GDD-750", 12, 2025);

      expect(mockUpdate).toHaveBeenCalled();
      const callArgs = mockUpdate.mock.calls[0];
      if (!callArgs || callArgs.length < 2) return;
      const updatedTracking = callArgs[1] as ICRAItem[] | undefined;
      expect(updatedTracking).toBeDefined();
      if (!updatedTracking) return;
      const decemberItem = updatedTracking.find(
        (item) => item.month === 12 && item.year === 2025
      );
      const ticket = decemberItem!.tickets.find((t) => t.ticket === "GDD-750");
      expect(ticket).toBeDefined();
      const activePeriod = ticket!.periods.find((p) => p.endDate === null);
      expect(activePeriod).toBeUndefined();
      expect(ticket!.timeSpentInDays).not.toBeNull();
    });

    it("should throw error if ticket already completed", async () => {
      const completedTrackingData: ICRAItem[] = [
        {
          month: 12,
          year: 2025,
          tickets: [
            {
              ticketProviderUrl: "https://inedi.atlassian.net/browse/GDD-750",
              ticket: "GDD-750",
              branchName: "feat/GDD-750_test",
              periods: [
                {
                  startDate: new Date("2025-12-25T09:00:00.000Z"),
                  endDate: new Date("2025-12-25T18:00:00.000Z"),
                },
              ],
              author: "Test User",
              timeSpentInDays: 1,
            },
          ],
        },
      ];

      (vscode.workspace.getConfiguration as jest.Mock).mockReturnValue({
        get: jest.fn((key: string, defaultValue?: unknown) => {
          if (key === "tracking") {
            return completedTrackingData.map((item) => ({
              ...item,
              tickets: item.tickets.map((ticket) => ({
                ...ticket,
                periods: ticket.periods.map((period) => ({
                  startDate: period.startDate.toISOString(),
                  endDate: period.endDate ? period.endDate.toISOString() : null,
                })),
              })),
            }));
          }
          return defaultValue;
        }),
        update: jest.fn(),
      });

      await expect(markTicketAsCompleted("GDD-750", 12, 2025)).rejects.toThrow(
        "Ce ticket est déjà marqué comme terminé"
      );
    });
  });

  describe("markTicketAsInProgress", () => {
    it("should mark completed ticket as in progress", async () => {
      const completedTrackingData: ICRAItem[] = [
        {
          month: 12,
          year: 2025,
          tickets: [
            {
              ticketProviderUrl: "https://inedi.atlassian.net/browse/GDD-750",
              ticket: "GDD-750",
              branchName: "feat/GDD-750_test",
              periods: [
                {
                  startDate: new Date("2025-12-25T09:00:00.000Z"),
                  endDate: new Date("2025-12-25T18:00:00.000Z"),
                },
              ],
              author: "Test User",
              timeSpentInDays: 1,
            },
          ],
        },
      ];

      jest.useFakeTimers();
      jest.setSystemTime(new Date("2025-12-26T12:00:00.000Z"));

      const mockUpdate = jest.fn();
      (vscode.workspace.getConfiguration as jest.Mock).mockReturnValue({
        get: jest.fn((key: string, defaultValue?: unknown) => {
          if (key === "tracking") {
            return completedTrackingData.map((item) => ({
              ...item,
              tickets: item.tickets.map((ticket) => ({
                ...ticket,
                periods: ticket.periods.map((period) => ({
                  startDate: period.startDate.toISOString(),
                  endDate: period.endDate ? period.endDate.toISOString() : null,
                })),
              })),
            }));
          }
          if (key === "workStartHour") return 9;
          if (key === "workEndHour") return 18;
          if (key === "timeIncrement") return 0.5;
          return defaultValue;
        }),
        update: mockUpdate,
      });

      await markTicketAsInProgress("GDD-750", 12, 2025);

      expect(mockUpdate).toHaveBeenCalled();
      const callArgs = mockUpdate.mock.calls[0];
      if (!callArgs || callArgs.length < 2) return;
      const updatedTracking = callArgs[1] as ICRAItem[] | undefined;
      expect(updatedTracking).toBeDefined();
      if (!updatedTracking) return;
      const decemberItem = updatedTracking.find(
        (item) => item.month === 12 && item.year === 2025
      );
      const ticket = decemberItem!.tickets.find((t) => t.ticket === "GDD-750");
      expect(ticket).toBeDefined();
      const activePeriod = ticket!.periods.find((p) => p.endDate === null);
      expect(activePeriod).toBeDefined();

      jest.useRealTimers();
    });
  });

  describe("pauseAllActiveTickets", () => {
    it("should pause all active tickets", async () => {
      const mockUpdate = jest.fn();
      (vscode.workspace.getConfiguration as jest.Mock).mockReturnValue({
        get: jest.fn((key: string, defaultValue?: unknown) => {
          if (key === "tracking") {
            return mockTrackingData.map((item) => ({
              ...item,
              tickets: item.tickets.map((ticket) => ({
                ...ticket,
                periods: ticket.periods.map((period) => ({
                  startDate: period.startDate.toISOString(),
                  endDate: period.endDate ? period.endDate.toISOString() : null,
                })),
              })),
            }));
          }
          if (key === "workStartHour") return 9;
          if (key === "workEndHour") return 18;
          if (key === "timeIncrement") return 0.5;
          return defaultValue;
        }),
        update: mockUpdate,
      });

      await pauseAllActiveTickets();

      expect(mockUpdate).toHaveBeenCalled();
      const callArgs = mockUpdate.mock.calls[0];
      if (!callArgs || callArgs.length < 2) return;
      const updatedTracking = callArgs[1] as ICRAItem[] | undefined;
      expect(updatedTracking).toBeDefined();
      if (!updatedTracking) return;
      const decemberItem = updatedTracking.find(
        (item) => item.month === 12 && item.year === 2025
      );
      const activeTicket = decemberItem!.tickets.find((t) =>
        t.periods.some((p) => p.endDate === null)
      );
      expect(activeTicket).toBeUndefined();
    });
  });

  describe("startTicketTrackingIfExists", () => {
    beforeEach(() => {
      (getTicketBaseUrl as jest.Mock).mockReturnValue(
        "https://inedi.atlassian.net/browse"
      );
    });

    it("should start tracking if ticket exists and is not active", async () => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date("2025-12-25T12:00:00.000Z"));

      const completedTrackingData: ICRAItem[] = [
        {
          month: 12,
          year: 2025,
          tickets: [
            {
              ticketProviderUrl: "https://inedi.atlassian.net/browse/GDD-750",
              ticket: "GDD-750",
              branchName: "feat/GDD-750_old",
              periods: [
                {
                  startDate: new Date("2025-12-25T09:00:00.000Z"),
                  endDate: new Date("2025-12-25T18:00:00.000Z"),
                },
              ],
              author: "Test User",
              timeSpentInDays: 1,
            },
          ],
        },
      ];

      const mockUpdate = jest.fn();
      (vscode.workspace.getConfiguration as jest.Mock).mockReturnValue({
        get: jest.fn((key: string, defaultValue?: unknown) => {
          if (key === "tracking") {
            return completedTrackingData.map((item) => ({
              ...item,
              tickets: item.tickets.map((ticket) => ({
                ...ticket,
                periods: ticket.periods.map((period) => ({
                  startDate: period.startDate.toISOString(),
                  endDate: period.endDate ? period.endDate.toISOString() : null,
                })),
              })),
            }));
          }
          return defaultValue;
        }),
        update: mockUpdate,
      });

      const result = await startTicketTrackingIfExists(
        "GDD-750",
        "feat/GDD-750_new"
      );

      expect(result).toBe(true);
      expect(mockUpdate).toHaveBeenCalled();
      const callArgs = mockUpdate.mock.calls[0];
      if (!callArgs || callArgs.length < 2) return;
      const updatedTracking = callArgs[1] as ICRAItem[] | undefined;
      expect(updatedTracking).toBeDefined();
      if (!updatedTracking) return;
      const decemberItem = updatedTracking.find(
        (item) => item.month === 12 && item.year === 2025
      );
      const ticket = decemberItem!.tickets.find((t) => t.ticket === "GDD-750");
      expect(ticket!.branchName).toBe("feat/GDD-750_new");
      const activePeriod = ticket!.periods.find((p) => p.endDate === null);
      expect(activePeriod).toBeDefined();

      jest.useRealTimers();
    });

    it("should return false if ticket does not exist", async () => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date("2025-12-25T12:00:00.000Z"));

      const result = await startTicketTrackingIfExists(
        "GDD-999",
        "feat/GDD-999_test"
      );

      expect(result).toBe(false);

      jest.useRealTimers();
    });

    it("should return false if ticket is already active", async () => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date("2025-12-25T12:00:00.000Z"));

      const result = await startTicketTrackingIfExists(
        "GDD-750",
        "feat/GDD-750_test"
      );

      expect(result).toBe(false);

      jest.useRealTimers();
    });
  });
});
