export interface ICRAItem {
  month: number;
  year: number;
  tickets: ICRATicket[];
}

export interface ICRATicketPeriod {
  startDate: Date;
  endDate: Date | null;
}

export interface ICRATicket {
  ticketProviderUrl: string;
  ticket: string;
  branchName: string;
  periods: ICRATicketPeriod[];
  author: string;
  timeSpentInDays: number | null;
}
