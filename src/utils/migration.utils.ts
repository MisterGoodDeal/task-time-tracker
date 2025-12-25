import { ICRATicket, ICRATicketPeriod } from "../types/cra.types";

interface RawTicket {
  ticketProviderUrl?: string;
  ticket: string;
  branchName?: string;
  periods?: RawPeriod[];
  startDate?: string | Date;
  endDate?: string | Date | null;
  author?: string;
  timeSpentInDays?: number | null;
  [key: string]: unknown;
}

interface RawPeriod {
  startDate: string | Date;
  endDate: string | Date | null;
}

export const migrateTicket = (ticket: RawTicket): ICRATicket => {
  const ticketProviderUrl = ticket.ticketProviderUrl || "";

  if (ticket.periods) {
    let finalTicketProviderUrl = ticketProviderUrl;
    if (
      finalTicketProviderUrl &&
      ticket.ticket &&
      !finalTicketProviderUrl.includes(`/${ticket.ticket}`)
    ) {
      finalTicketProviderUrl = `${finalTicketProviderUrl}/${ticket.ticket}`;
    }

    return {
      ...ticket,
      ticketProviderUrl: finalTicketProviderUrl,
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

    let finalTicketProviderUrl = ticketProviderUrl;
    if (
      finalTicketProviderUrl &&
      ticket.ticket &&
      !finalTicketProviderUrl.includes(`/${ticket.ticket}`)
    ) {
      finalTicketProviderUrl = `${finalTicketProviderUrl}/${ticket.ticket}`;
    }

    return {
      ticketProviderUrl: finalTicketProviderUrl,
      ticket: ticket.ticket,
      branchName: ticket.branchName || "",
      periods: periods,
      author: ticket.author || "",
      timeSpentInDays: ticket.timeSpentInDays ?? null,
    };
  }
};
