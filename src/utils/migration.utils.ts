import { ICRATicket, ICRATicketPeriod } from "../types/cra.types";
import { getJiraBaseUrl } from "../config";

interface RawTicket {
  jiraUrl?: string;
  ticket: string;
  branchName?: string;
  periods?: RawPeriod[];
  startDate?: string | Date;
  endDate?: string | Date | null;
  author?: string;
  timeSpentInDays?: number | null;
}

interface RawPeriod {
  startDate: string | Date;
  endDate: string | Date | null;
}

export const migrateTicket = (ticket: RawTicket): ICRATicket => {
  if (ticket.periods) {
    let jiraUrl = ticket.jiraUrl || "";
    if (
      jiraUrl &&
      ticket.ticket &&
      !jiraUrl.includes(`/${ticket.ticket}`)
    ) {
      jiraUrl = `${jiraUrl}/${ticket.ticket}`;
    }

    return {
      ...ticket,
      jiraUrl: jiraUrl,
      periods: ticket.periods.map(
        (period: RawPeriod): ICRATicketPeriod => ({
          startDate: new Date(period.startDate),
          endDate: period.endDate ? new Date(period.endDate) : null,
        })
      ),
      author: ticket.author || "",
      branchName: ticket.branchName || "",
      timeSpentInDays: ticket.timeSpentInDays ?? null,
    };
  } else {
    const periods: ICRATicketPeriod[] = [];
    if (ticket.startDate) {
      periods.push({
        startDate: new Date(ticket.startDate),
        endDate: ticket.endDate ? new Date(ticket.endDate) : null,
      });
    }

    let jiraUrl = ticket.jiraUrl || "";
    if (
      jiraUrl &&
      ticket.ticket &&
      !jiraUrl.includes(`/${ticket.ticket}`)
    ) {
      jiraUrl = `${jiraUrl}/${ticket.ticket}`;
    }

    return {
      jiraUrl: jiraUrl,
      ticket: ticket.ticket,
      branchName: ticket.branchName || "",
      periods: periods,
      author: ticket.author || "",
      timeSpentInDays: ticket.timeSpentInDays ?? null,
    };
  }
};

