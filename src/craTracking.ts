import * as vscode from "vscode";
import { exec } from "child_process";
import { promisify } from "util";
import { ICRAItem, ICRATicket, ICRATicketPeriod } from "./types/cra.types";
import { getWorkStartHour, getWorkEndHour, getJiraBaseUrl } from "./config";

const execAsync = promisify(exec);

interface RawTrackingItem {
  month: number;
  year: number;
  tickets: RawTicket[];
}

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

interface PeriodWithEnd {
  startDate: Date;
  endDate: Date;
}

export const getCRATracking = (): ICRAItem[] => {
  const config = vscode.workspace.getConfiguration("cra-aubay");
  const tracking = config.get<RawTrackingItem[]>("tracking", []);

  return tracking.map(
    (item: RawTrackingItem): ICRAItem => ({
      month: item.month,
      year: item.year,
      tickets: item.tickets.map((ticket: RawTicket): ICRATicket => {
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
      }),
    })
  );
};

export const calculateTotalTimeSpentInDays = (ticket: ICRATicket): number => {
  if (ticket.periods.length === 0) {
    return 0;
  }

  const workStartHour = getWorkStartHour();
  const workEndHour = getWorkEndHour();

  const now = new Date();
  const periodsWithEnd: PeriodWithEnd[] = ticket.periods.map(
    (period: ICRATicketPeriod): PeriodWithEnd => ({
      startDate: period.startDate,
      endDate: period.endDate || now,
    })
  );

  periodsWithEnd.sort(
    (a: PeriodWithEnd, b: PeriodWithEnd) =>
      a.startDate.getTime() - b.startDate.getTime()
  );

  const mergedPeriods: PeriodWithEnd[] = [];
  let currentPeriod: PeriodWithEnd | null = null;

  for (const period of periodsWithEnd) {
    if (!currentPeriod) {
      currentPeriod = { ...period };
    } else {
      const currentStartDay = new Date(
        currentPeriod.startDate.getFullYear(),
        currentPeriod.startDate.getMonth(),
        currentPeriod.startDate.getDate()
      );
      const periodStartDay = new Date(
        period.startDate.getFullYear(),
        period.startDate.getMonth(),
        period.startDate.getDate()
      );

      if (currentStartDay.getTime() === periodStartDay.getTime()) {
        currentPeriod.startDate = new Date(
          Math.min(
            currentPeriod.startDate.getTime(),
            period.startDate.getTime()
          )
        );
        currentPeriod.endDate = new Date(
          Math.max(currentPeriod.endDate.getTime(), period.endDate.getTime())
        );
      } else {
        mergedPeriods.push(currentPeriod);
        currentPeriod = { ...period };
      }
    }
  }

  if (currentPeriod) {
    mergedPeriods.push(currentPeriod);
  }

  let totalDays = 0;
  for (const period of mergedPeriods) {
    totalDays += calculateTimeSpentInDays(period.startDate, period.endDate);
  }

  return totalDays;
};

export const calculateTimeSpentInDays = (
  startDate: Date,
  endDate: Date
): number => {
  const workStartHour = getWorkStartHour();
  const workEndHour = getWorkEndHour();
  const workHoursPerDay = workEndHour - workStartHour;

  const start = new Date(startDate);
  const end = new Date(endDate);

  const startDay = new Date(
    start.getFullYear(),
    start.getMonth(),
    start.getDate()
  );
  const endDay = new Date(end.getFullYear(), end.getMonth(), end.getDate());

  if (startDay.getTime() === endDay.getTime()) {
    const startHour = start.getHours() + start.getMinutes() / 60;
    const endHour = end.getHours() + end.getMinutes() / 60;

    const effectiveStartHour = Math.max(startHour, workStartHour);
    const effectiveEndHour = Math.min(endHour, workEndHour);

    if (effectiveStartHour >= effectiveEndHour) {
      return 0.5;
    }

    const hoursWorked = effectiveEndHour - effectiveStartHour;
    const days = hoursWorked / workHoursPerDay;
    return Math.max(0.5, Math.ceil(days * 2) / 2);
  }

  let totalDays = 0;
  const currentDay = new Date(startDay);

  while (currentDay <= endDay) {
    const isStartDay = currentDay.getTime() === startDay.getTime();
    const isEndDay = currentDay.getTime() === endDay.getTime();

    if (isStartDay && isEndDay) {
      const startHour = start.getHours() + start.getMinutes() / 60;
      const endHour = end.getHours() + end.getMinutes() / 60;
      const effectiveStartHour = Math.max(startHour, workStartHour);
      const effectiveEndHour = Math.min(endHour, workEndHour);

      if (effectiveStartHour < effectiveEndHour) {
        const hoursWorked = effectiveEndHour - effectiveStartHour;
        const days = hoursWorked / workHoursPerDay;
        totalDays += Math.max(0.5, Math.ceil(days * 2) / 2);
      } else {
        totalDays += 0.5;
      }
    } else if (isStartDay) {
      const startHour = start.getHours() + start.getMinutes() / 60;
      const effectiveStartHour = Math.max(startHour, workStartHour);
      if (effectiveStartHour < workEndHour) {
        totalDays += 0.5;
      }
    } else if (isEndDay) {
      const endHour = end.getHours() + end.getMinutes() / 60;
      const effectiveEndHour = Math.min(endHour, workEndHour);
      if (effectiveEndHour > workStartHour) {
        totalDays += 0.5;
      }
    } else {
      totalDays += 1;
    }

    currentDay.setDate(currentDay.getDate() + 1);
  }

  return Math.max(0.5, totalDays);
};

const getGitAuthor = async (): Promise<string> => {
  const workspaceFolders = vscode.workspace.workspaceFolders;
  if (!workspaceFolders || workspaceFolders.length === 0) {
    return "Unknown";
  }

  try {
    const { stdout: name } = await execAsync("git config user.name", {
      cwd: workspaceFolders[0].uri.fsPath,
    });
    const { stdout: email } = await execAsync("git config user.email", {
      cwd: workspaceFolders[0].uri.fsPath,
    });
    return `${name.trim()} <${email.trim()}>`;
  } catch {
    try {
      const { stdout: name } = await execAsync("git config user.name", {
        cwd: workspaceFolders[0].uri.fsPath,
      });
      return name.trim() || "Unknown";
    } catch {
      return "Unknown";
    }
  }
};

const getCurrentBranch = async (): Promise<string> => {
  const workspaceFolders = vscode.workspace.workspaceFolders;
  if (!workspaceFolders || workspaceFolders.length === 0) {
    return "Aucun workspace";
  }

  try {
    const { stdout } = await execAsync("git rev-parse --abbrev-ref HEAD", {
      cwd: workspaceFolders[0].uri.fsPath,
    });
    return stdout.trim() || "Aucune branche";
  } catch {
    return "Non Git";
  }
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
  jiraBaseUrl: string
): Promise<void> => {
  const config = vscode.workspace.getConfiguration("cra-aubay");
  const tracking = getCRATracking();

  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();
  const author = await getGitAuthor();
  const branchName = await getCurrentBranch();

  const fullJiraUrl = `${jiraBaseUrl}/${ticket}`;

  let craItem = tracking.find(
    (item: ICRAItem) => item.month === currentMonth && item.year === currentYear
  );

  const newTicket: ICRATicket = {
    jiraUrl: fullJiraUrl,
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
      throw new Error("Ce ticket est déjà dans le suivi pour ce mois");
    }
  }

  await config.update(
    "tracking",
    tracking,
    vscode.ConfigurationTarget.Workspace
  );
};

export const removeTicketFromTracking = async (
  ticket: string,
  month?: number,
  year?: number
): Promise<void> => {
  const config = vscode.workspace.getConfiguration("cra-aubay");
  const tracking = getCRATracking();

  const now = new Date();
  const targetMonth = month || now.getMonth() + 1;
  const targetYear = year || now.getFullYear();

  const craItem = tracking.find(
    (item: ICRAItem) => item.month === targetMonth && item.year === targetYear
  );

  if (!craItem) {
    throw new Error("Aucun suivi trouvé pour ce mois");
  }

  const ticketIndex = craItem.tickets.findIndex(
    (t: ICRATicket) => t.ticket === ticket
  );
  if (ticketIndex === -1) {
    throw new Error("Ce ticket n'est pas dans le suivi");
  }

  craItem.tickets.splice(ticketIndex, 1);

  await config.update(
    "tracking",
    tracking,
    vscode.ConfigurationTarget.Workspace
  );
};

export const deleteMonthTracking = async (
  month: number,
  year: number
): Promise<void> => {
  const config = vscode.workspace.getConfiguration("cra-aubay");
  const tracking = getCRATracking();

  const craItemIndex = tracking.findIndex(
    (item: ICRAItem) => item.month === month && item.year === year
  );

  if (craItemIndex === -1) {
    throw new Error("Aucun suivi trouvé pour ce mois");
  }

  tracking.splice(craItemIndex, 1);

  await config.update(
    "tracking",
    tracking,
    vscode.ConfigurationTarget.Workspace
  );
};

export const markTicketAsCompleted = async (
  ticket: string,
  month: number,
  year: number
): Promise<void> => {
  const config = vscode.workspace.getConfiguration("cra-aubay");
  const tracking = getCRATracking();

  const craItem = tracking.find(
    (item: ICRAItem) => item.month === month && item.year === year
  );

  if (!craItem) {
    throw new Error("Aucun suivi trouvé pour ce mois");
  }

  const ticketItem = craItem.tickets.find(
    (t: ICRATicket) => t.ticket === ticket
  );
  if (!ticketItem) {
    throw new Error("Ce ticket n'est pas dans le suivi");
  }

  const currentPeriod = ticketItem.periods.find(
    (p: ICRATicketPeriod) => p.endDate === null
  );
  if (!currentPeriod) {
    throw new Error("Ce ticket est déjà marqué comme terminé");
  }

  currentPeriod.endDate = new Date();
  ticketItem.timeSpentInDays = calculateTotalTimeSpentInDays(ticketItem);

  await config.update(
    "tracking",
    tracking,
    vscode.ConfigurationTarget.Workspace
  );
};

export const markTicketAsInProgress = async (
  ticket: string,
  month: number,
  year: number
): Promise<void> => {
  const config = vscode.workspace.getConfiguration("cra-aubay");
  const tracking = getCRATracking();

  const craItem = tracking.find(
    (item: ICRAItem) => item.month === month && item.year === year
  );

  if (!craItem) {
    throw new Error("Aucun suivi trouvé pour ce mois");
  }

  const ticketItem = craItem.tickets.find(
    (t: ICRATicket) => t.ticket === ticket
  );
  if (!ticketItem) {
    throw new Error("Ce ticket n'est pas dans le suivi");
  }

  const hasActivePeriod = ticketItem.periods.some(
    (p: ICRATicketPeriod) => p.endDate === null
  );
  if (hasActivePeriod) {
    throw new Error("Ce ticket est déjà en cours");
  }

  ticketItem.timeSpentInDays = calculateTotalTimeSpentInDays(ticketItem);

  ticketItem.periods.push({
    startDate: new Date(),
    endDate: null,
  });

  await config.update(
    "tracking",
    tracking,
    vscode.ConfigurationTarget.Workspace
  );
};

export const pauseAllActiveTickets = async (): Promise<void> => {
  const config = vscode.workspace.getConfiguration("cra-aubay");
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
        hasChanges = true;
      }
    }
  }

  if (hasChanges) {
    await config.update(
      "tracking",
      tracking,
      vscode.ConfigurationTarget.Workspace
    );
  }
};

export const startTicketTrackingIfExists = async (
  ticket: string,
  branchName: string
): Promise<boolean> => {
  const config = vscode.workspace.getConfiguration("cra-aubay");
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

  const jiraBaseUrl = getJiraBaseUrl();
  if (jiraBaseUrl && !ticketItem.jiraUrl.includes(`/${ticket}`)) {
    ticketItem.jiraUrl = `${jiraBaseUrl}/${ticket}`;
  }

  ticketItem.periods.push({
    startDate: now,
    endDate: null,
  });

  await config.update(
    "tracking",
    tracking,
    vscode.ConfigurationTarget.Workspace
  );

  return true;
};
