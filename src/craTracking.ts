import * as vscode from "vscode";
import { ICRAItem, ICRATicket, ICRATicketPeriod } from "./types/cra.types";
import {
  getTicketBaseUrl,
  getTrackingConfig,
  getTrackingConfigurationTarget,
  getTrackingValue,
} from "./config";
import { getGitAuthor, getCurrentBranch } from "./utils/git.utils";
import { t } from "./utils/i18n.utils";
import {
  calculateTotalTimeSpentInDays,
  calculatePreciseTimeSpent,
} from "./utils/time.utils";

export const getCRATracking = (): ICRAItem[] => {
  const tracking = getTrackingValue<ICRAItem[]>("tracking", []);

  return tracking.map(
    (item: ICRAItem): ICRAItem => ({
      month: item.month,
      year: item.year,
      tickets: item.tickets.map((ticket: ICRATicket): ICRATicket => {
        const periods: ICRATicketPeriod[] = ticket.periods.map(
          (period: ICRATicketPeriod): ICRATicketPeriod => ({
            startDate: new Date(period.startDate),
            endDate: period.endDate ? new Date(period.endDate) : null,
          })
        );

        const ticketWithPeriods = { ...ticket, periods };
        return {
          ...ticketWithPeriods,
          timeSpent: calculatePreciseTimeSpent(ticketWithPeriods),
        };
      }),
    })
  );
};

export const isTicketTracked = (ticket: string): boolean => {
  const tracking = getCRATracking();
  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();

  const craItem = tracking.find(
    (item: ICRAItem) => item.month === currentMonth && item.year === currentYear
  );

  if (!craItem) {
    return false;
  }

  return craItem.tickets.some((t: ICRATicket) => t.ticket === ticket);
};

export const addTicketToTracking = async (
  ticket: string,
  ticketBaseUrl: string
): Promise<void> => {
  const config = getTrackingConfig();
  const tracking = getCRATracking();

  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();
  const author = await getGitAuthor();
  const branchName = await getCurrentBranch();

  const fullTicketUrl = ticketBaseUrl ? `${ticketBaseUrl}/${ticket}` : "";

  let craItem = tracking.find(
    (item: ICRAItem) => item.month === currentMonth && item.year === currentYear
  );

  const newTicket: ICRATicket = {
    ticketProviderUrl: fullTicketUrl,
    ticket,
    branchName,
    periods: [
      {
        startDate: now,
        endDate: null,
      },
    ],
    author,
    timeSpentInDays: null,
    timeSpent: {
      days: 0,
      hours: 0,
      minutes: 0,
      seconds: 0,
    },
  };

  if (!craItem) {
    craItem = {
      month: currentMonth,
      year: currentYear,
      tickets: [newTicket],
    };
    tracking.push(craItem);
  } else {
    const existingTicket = craItem.tickets.find(
      (t: ICRATicket) => t.ticket === ticket
    );
    if (!existingTicket) {
      craItem.tickets.push(newTicket);
    } else {
      throw new Error(t("errors.ticketAlreadyInTracking"));
    }
  }

  await config.update("tracking", tracking, getTrackingConfigurationTarget());
};

export const removeTicketFromTracking = async (
  ticket: string,
  month?: number,
  year?: number
): Promise<void> => {
  const config = getTrackingConfig();
  const tracking = getCRATracking();

  const now = new Date();
  const targetMonth = month || now.getMonth() + 1;
  const targetYear = year || now.getFullYear();

  const craItem = tracking.find(
    (item: ICRAItem) => item.month === targetMonth && item.year === targetYear
  );

  if (!craItem) {
    throw new Error(t("errors.noTrackingFoundForMonth"));
  }

  const ticketIndex = craItem.tickets.findIndex(
    (t: ICRATicket) => t.ticket === ticket
  );
  if (ticketIndex === -1) {
    throw new Error(t("errors.ticketNotInTracking"));
  }

  craItem.tickets.splice(ticketIndex, 1);

  await config.update("tracking", tracking, getTrackingConfigurationTarget());
};

export const deleteMonthTracking = async (
  month: number,
  year: number
): Promise<void> => {
  const config = getTrackingConfig();
  const tracking = getCRATracking();

  const craItemIndex = tracking.findIndex(
    (item: ICRAItem) => item.month === month && item.year === year
  );

  if (craItemIndex === -1) {
    throw new Error(t("errors.noTrackingFoundForMonth"));
  }

  tracking.splice(craItemIndex, 1);

  await config.update("tracking", tracking, getTrackingConfigurationTarget());
};

export const markTicketAsCompleted = async (
  ticket: string,
  month: number,
  year: number
): Promise<void> => {
  const config = getTrackingConfig();
  const tracking = getCRATracking();

  const craItem = tracking.find(
    (item: ICRAItem) => item.month === month && item.year === year
  );

  if (!craItem) {
    throw new Error(t("errors.noTrackingFoundForMonth"));
  }

  const ticketItem = craItem.tickets.find(
    (t: ICRATicket) => t.ticket === ticket
  );
  if (!ticketItem) {
    throw new Error(t("errors.ticketNotInTracking"));
  }

  const currentPeriod = ticketItem.periods.find(
    (p: ICRATicketPeriod) => p.endDate === null
  );
  if (!currentPeriod) {
    throw new Error(t("errors.ticketAlreadyCompleted"));
  }

  currentPeriod.endDate = new Date();
  ticketItem.timeSpentInDays = calculateTotalTimeSpentInDays(ticketItem);
  ticketItem.timeSpent = calculatePreciseTimeSpent(ticketItem);

  await config.update("tracking", tracking, getTrackingConfigurationTarget());
};

export const markTicketAsInProgress = async (
  ticket: string,
  month: number,
  year: number
): Promise<void> => {
  const config = getTrackingConfig();
  const tracking = getCRATracking();

  const craItem = tracking.find(
    (item: ICRAItem) => item.month === month && item.year === year
  );

  if (!craItem) {
    throw new Error(t("errors.noTrackingFoundForMonth"));
  }

  const ticketItem = craItem.tickets.find(
    (t: ICRATicket) => t.ticket === ticket
  );
  if (!ticketItem) {
    throw new Error(t("errors.ticketNotInTracking"));
  }

  const hasActivePeriod = ticketItem.periods.some(
    (p: ICRATicketPeriod) => p.endDate === null
  );
  if (hasActivePeriod) {
    throw new Error(t("errors.ticketAlreadyInProgress"));
  }

  ticketItem.periods.push({
    startDate: new Date(),
    endDate: null,
  });

  ticketItem.timeSpentInDays = calculateTotalTimeSpentInDays(ticketItem);
  ticketItem.timeSpent = calculatePreciseTimeSpent(ticketItem);

  await config.update("tracking", tracking, getTrackingConfigurationTarget());
};

export const pauseAllActiveTickets = async (): Promise<void> => {
  const config = getTrackingConfig();
  const tracking = getCRATracking();
  let hasChanges = false;

  for (const craItem of tracking) {
    for (const ticket of craItem.tickets) {
      const activePeriod = ticket.periods.find(
        (p: ICRATicketPeriod) => p.endDate === null
      );
      if (activePeriod) {
        activePeriod.endDate = new Date();
        ticket.timeSpentInDays = calculateTotalTimeSpentInDays(ticket);
        ticket.timeSpent = calculatePreciseTimeSpent(ticket);
        hasChanges = true;
      }
    }
  }

  if (hasChanges) {
    await config.update(
      "tracking",
      tracking,
      getTrackingConfigurationTarget()
    );
  }
};

export const startTicketTrackingIfExists = async (
  ticket: string,
  branchName: string
): Promise<boolean> => {
  const config = getTrackingConfig();
  const tracking = getCRATracking();
  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();

  const craItem = tracking.find(
    (item: ICRAItem) => item.month === currentMonth && item.year === currentYear
  );

  if (!craItem) {
    return false;
  }

  const ticketItem = craItem.tickets.find(
    (t: ICRATicket) => t.ticket === ticket
  );
  if (!ticketItem) {
    return false;
  }

  const hasActivePeriod = ticketItem.periods.some(
    (p: ICRATicketPeriod) => p.endDate === null
  );
  if (hasActivePeriod) {
    return false;
  }

  ticketItem.branchName = branchName;

  const ticketBaseUrl = getTicketBaseUrl();
  if (ticketBaseUrl && !ticketItem.ticketProviderUrl.includes(`/${ticket}`)) {
    ticketItem.ticketProviderUrl = `${ticketBaseUrl}/${ticket}`;
  }

  ticketItem.periods.push({
    startDate: now,
    endDate: null,
  });

  ticketItem.timeSpentInDays = calculateTotalTimeSpentInDays(ticketItem);
  ticketItem.timeSpent = calculatePreciseTimeSpent(ticketItem);

  await config.update(
    "tracking",
    tracking,
    getTrackingConfigurationTarget()
  );

  return true;
};
