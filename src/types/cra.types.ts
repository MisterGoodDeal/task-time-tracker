export interface ICRAItem {
  month: number;
  year: number;
  tickets: ICRATicket[];
}

export interface ICRATicket {
  jiraUrl: string;
  ticket: string;
  startDate: Date;
  endDate: Date | null;
  author: string;
}
