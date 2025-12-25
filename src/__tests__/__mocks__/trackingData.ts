import { ICRAItem, ICRATicket } from "../../types/cra.types";

export const mockTicketsForExcel: ICRATicket[] = [
  {
    ticketProviderUrl: "https://example.com/ticket/EDI-123",
    ticket: "EDI-123",
    branchName: "feat/EDI-123_test",
    periods: [
      {
        startDate: new Date("2025-12-01T09:00:00Z"),
        endDate: new Date("2025-12-01T17:00:00Z"),
      },
    ],
    author: "John Doe <john@example.com>",
    timeSpentInDays: 1.0,
    timeSpent: { days: 1, hours: 0, minutes: 0, seconds: 0 },
  },
  {
    ticketProviderUrl: "https://example.com/ticket/GDD-456",
    ticket: "GDD-456",
    branchName: "feat/GDD-456_feature",
    periods: [
      {
        startDate: new Date("2025-12-02T09:00:00Z"),
        endDate: null,
      },
    ],
    author: "Jane Smith <jane@example.com>",
    timeSpentInDays: null,
    timeSpent: { days: 0, hours: 4, minutes: 30, seconds: 0 },
  },
  {
    ticketProviderUrl: "https://example.com/ticket/EDI-789",
    ticket: "EDI-789",
    branchName: "feat/EDI-789_complex",
    periods: [
      {
        startDate: new Date("2025-12-01T09:00:00Z"),
        endDate: new Date("2025-12-01T12:00:00Z"),
      },
      {
        startDate: new Date("2025-12-02T09:00:00Z"),
        endDate: new Date("2025-12-02T17:00:00Z"),
      },
    ],
    author: "Bob Wilson <bob@example.com>",
    timeSpentInDays: 1.5,
    timeSpent: { days: 1, hours: 4, minutes: 0, seconds: 0 },
  },
];

export const mockTrackingForDecember2025: ICRAItem = {
  month: 12,
  year: 2025,
  tickets: mockTicketsForExcel,
};

export const mockTrackingWithTwoTickets: ICRAItem = {
  month: 12,
  year: 2025,
  tickets: [mockTicketsForExcel[0], mockTicketsForExcel[1]],
};

export const mockTrackingWithCompletedTicket: ICRAItem = {
  month: 12,
  year: 2025,
  tickets: [mockTicketsForExcel[0]],
};

export const mockTrackingWithInProgressTicket: ICRAItem = {
  month: 12,
  year: 2025,
  tickets: [mockTicketsForExcel[1]],
};

export const mockTrackingWithMultiplePeriods: ICRAItem = {
  month: 12,
  year: 2025,
  tickets: [mockTicketsForExcel[2]],
};

export const mockTrackingArray: ICRAItem[] = [mockTrackingForDecember2025];

export const mockTrackingDataForCraTracking: ICRAItem[] = [
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
        timeSpent: {
          days: 0,
          hours: 0,
          minutes: 0,
          seconds: 0,
        },
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
        timeSpent: {
          days: 0,
          hours: 0,
          minutes: 0,
          seconds: 0,
        },
      },
    ],
  },
];
