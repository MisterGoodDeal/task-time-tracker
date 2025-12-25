import { ICRATicket } from "../../types/cra.types";

export const mockEmptyTicket: ICRATicket = {
  ticketProviderUrl: "",
  ticket: "TEST-1",
  branchName: "test",
  periods: [],
  author: "Test",
  timeSpentInDays: null,
  timeSpent: {
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
  },
};

export const mockTicketWithSinglePeriod: ICRATicket = {
  ticketProviderUrl: "",
  ticket: "TEST-2",
  branchName: "test",
  periods: [
    {
      startDate: new Date(2024, 0, 1, 9, 0),
      endDate: new Date(2024, 0, 1, 17, 0),
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

export const mockTicketWithMultiplePeriods: ICRATicket = {
  ticketProviderUrl: "",
  ticket: "TEST-3",
  branchName: "test",
  periods: [
    {
      startDate: new Date(2024, 0, 1, 9, 0),
      endDate: new Date(2024, 0, 1, 12, 0),
    },
    {
      startDate: new Date(2024, 0, 1, 14, 0),
      endDate: new Date(2024, 0, 1, 17, 0),
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

export const mockTicketWithActivePeriod: ICRATicket = {
  ticketProviderUrl: "",
  ticket: "TEST-4",
  branchName: "test",
  periods: [
    {
      startDate: new Date(2024, 0, 1, 9, 0),
      endDate: new Date(2024, 0, 1, 12, 0),
    },
    {
      startDate: new Date(2024, 0, 1, 14, 0),
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

export const mockTicketWithOverlappingPeriods: ICRATicket = {
  ticketProviderUrl: "",
  ticket: "TEST-5",
  branchName: "test",
  periods: [
    {
      startDate: new Date(2024, 0, 1, 9, 0),
      endDate: new Date(2024, 0, 1, 11, 0),
    },
    {
      startDate: new Date(2024, 0, 1, 10, 0),
      endDate: new Date(2024, 0, 1, 12, 0),
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

export const mockTicketWithCrossDayPeriod: ICRATicket = {
  ticketProviderUrl: "",
  ticket: "TEST-6",
  branchName: "test",
  periods: [
    {
      startDate: new Date(2024, 0, 1, 9, 0),
      endDate: new Date(2024, 0, 2, 17, 0),
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

