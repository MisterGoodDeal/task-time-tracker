import * as vscode from "vscode";
import { exec } from "child_process";
import { promisify } from "util";
import { ICRAItem, ICRATicket } from "./types/cra.types";
import { getWorkStartHour, getWorkEndHour } from "./config";

const execAsync = promisify(exec);

export function getCRATracking(): ICRAItem[] {
  const config = vscode.workspace.getConfiguration("cra-aubay");
  const tracking = config.get<any[]>("tracking", []);

  return tracking.map((item: any) => ({
    month: item.month,
    year: item.year,
    tickets: item.tickets.map((ticket: any) => {
      // Migration depuis l'ancienne structure
      if (ticket.periods) {
        // Nouvelle structure avec périodes
        return {
          ...ticket,
          periods: ticket.periods.map((period: any) => ({
            startDate: new Date(period.startDate),
            endDate: period.endDate ? new Date(period.endDate) : null,
          })),
          author: ticket.author || "",
          branchName: ticket.branchName || "",
          timeSpentInDays: ticket.timeSpentInDays ?? null,
        };
      } else {
        // Ancienne structure : convertir en périodes
        const periods = [];
        if (ticket.startDate) {
          periods.push({
            startDate: new Date(ticket.startDate),
            endDate: ticket.endDate ? new Date(ticket.endDate) : null,
          });
        }
        return {
          jiraUrl: ticket.jiraUrl,
          ticket: ticket.ticket,
          branchName: ticket.branchName || "",
          periods: periods,
          author: ticket.author || "",
          timeSpentInDays: ticket.timeSpentInDays ?? null,
        };
      }
    }),
  }));
}

export function calculateTotalTimeSpentInDays(ticket: ICRATicket): number {
  if (ticket.periods.length === 0) {
    return 0;
  }

  const workStartHour = getWorkStartHour();
  const workEndHour = getWorkEndHour();

  // Convertir toutes les périodes en périodes avec endDate (utiliser maintenant pour les périodes en cours)
  const now = new Date();
  const periodsWithEnd: Array<{ startDate: Date; endDate: Date }> =
    ticket.periods.map((period) => ({
      startDate: period.startDate,
      endDate: period.endDate || now,
    }));

  // Trier les périodes par startDate
  periodsWithEnd.sort((a, b) => a.startDate.getTime() - b.startDate.getTime());

  // Fusionner les périodes qui sont dans la même journée de travail
  const mergedPeriods: Array<{ startDate: Date; endDate: Date }> = [];
  let currentPeriod: { startDate: Date; endDate: Date } | null = null;

  for (const period of periodsWithEnd) {
    if (!currentPeriod) {
      currentPeriod = { ...period };
    } else {
      // Normaliser les dates pour comparer seulement les jours
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

      // Si les périodes sont dans la même journée, fusionner
      if (currentStartDay.getTime() === periodStartDay.getTime()) {
        // Fusionner : prendre le startDate le plus ancien et endDate le plus récent
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
        // Journée différente : sauvegarder la période actuelle et commencer une nouvelle
        mergedPeriods.push(currentPeriod);
        currentPeriod = { ...period };
      }
    }
  }

  // Ajouter la dernière période
  if (currentPeriod) {
    mergedPeriods.push(currentPeriod);
  }

  // Calculer le temps total sur les périodes fusionnées
  let totalDays = 0;
  for (const period of mergedPeriods) {
    totalDays += calculateTimeSpentInDays(period.startDate, period.endDate);
  }

  return totalDays;
}

export function calculateTimeSpentInDays(
  startDate: Date,
  endDate: Date
): number {
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
}

async function getGitAuthor(): Promise<string> {
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
  } catch (error) {
    try {
      const { stdout: name } = await execAsync("git config user.name", {
        cwd: workspaceFolders[0].uri.fsPath,
      });
      return name.trim() || "Unknown";
    } catch {
      return "Unknown";
    }
  }
}

async function getCurrentBranch(): Promise<string> {
  const workspaceFolders = vscode.workspace.workspaceFolders;
  if (!workspaceFolders || workspaceFolders.length === 0) {
    return "Aucun workspace";
  }

  try {
    const { stdout } = await execAsync("git rev-parse --abbrev-ref HEAD", {
      cwd: workspaceFolders[0].uri.fsPath,
    });
    return stdout.trim() || "Aucune branche";
  } catch (error) {
    return "Non Git";
  }
}

export function isTicketTracked(ticket: string): boolean {
  const tracking = getCRATracking();
  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();

  const craItem = tracking.find(
    (item) => item.month === currentMonth && item.year === currentYear
  );

  if (!craItem) {
    return false;
  }

  return craItem.tickets.some((t) => t.ticket === ticket);
}

export async function addTicketToTracking(
  ticket: string,
  jiraUrl: string
): Promise<void> {
  const config = vscode.workspace.getConfiguration("cra-aubay");
  const tracking = getCRATracking();

  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();
  const author = await getGitAuthor();
  const branchName = await getCurrentBranch();

  let craItem = tracking.find(
    (item) => item.month === currentMonth && item.year === currentYear
  );

  const newTicket: ICRATicket = {
    jiraUrl,
    ticket,
    branchName,
    periods: [
      {
        startDate: now,
        endDate: null, // Période en cours
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
    const existingTicket = craItem.tickets.find((t) => t.ticket === ticket);
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
}

export async function removeTicketFromTracking(
  ticket: string,
  month?: number,
  year?: number
): Promise<void> {
  const config = vscode.workspace.getConfiguration("cra-aubay");
  const tracking = getCRATracking();

  const now = new Date();
  const targetMonth = month || now.getMonth() + 1;
  const targetYear = year || now.getFullYear();

  const craItem = tracking.find(
    (item) => item.month === targetMonth && item.year === targetYear
  );

  if (!craItem) {
    throw new Error("Aucun suivi trouvé pour ce mois");
  }

  const ticketIndex = craItem.tickets.findIndex((t) => t.ticket === ticket);
  if (ticketIndex === -1) {
    throw new Error("Ce ticket n'est pas dans le suivi");
  }

  craItem.tickets.splice(ticketIndex, 1);

  await config.update(
    "tracking",
    tracking,
    vscode.ConfigurationTarget.Workspace
  );
}

export async function deleteMonthTracking(
  month: number,
  year: number
): Promise<void> {
  const config = vscode.workspace.getConfiguration("cra-aubay");
  const tracking = getCRATracking();

  const craItemIndex = tracking.findIndex(
    (item) => item.month === month && item.year === year
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
}

export async function markTicketAsCompleted(
  ticket: string,
  month: number,
  year: number
): Promise<void> {
  const config = vscode.workspace.getConfiguration("cra-aubay");
  const tracking = getCRATracking();

  const craItem = tracking.find(
    (item) => item.month === month && item.year === year
  );

  if (!craItem) {
    throw new Error("Aucun suivi trouvé pour ce mois");
  }

  const ticketItem = craItem.tickets.find((t) => t.ticket === ticket);
  if (!ticketItem) {
    throw new Error("Ce ticket n'est pas dans le suivi");
  }

  // Trouver la période en cours (sans endDate)
  const currentPeriod = ticketItem.periods.find((p) => p.endDate === null);
  if (!currentPeriod) {
    throw new Error("Ce ticket est déjà marqué comme terminé");
  }

  // Terminer la période en cours
  currentPeriod.endDate = new Date();

  // Mettre à jour timeSpentInDays avec le temps total calculé à partir de toutes les périodes
  ticketItem.timeSpentInDays = calculateTotalTimeSpentInDays(ticketItem);

  await config.update(
    "tracking",
    tracking,
    vscode.ConfigurationTarget.Workspace
  );
}

export async function markTicketAsInProgress(
  ticket: string,
  month: number,
  year: number
): Promise<void> {
  const config = vscode.workspace.getConfiguration("cra-aubay");
  const tracking = getCRATracking();

  const craItem = tracking.find(
    (item) => item.month === month && item.year === year
  );

  if (!craItem) {
    throw new Error("Aucun suivi trouvé pour ce mois");
  }

  const ticketItem = craItem.tickets.find((t) => t.ticket === ticket);
  if (!ticketItem) {
    throw new Error("Ce ticket n'est pas dans le suivi");
  }

  // Vérifier qu'il n'y a pas déjà une période en cours
  const hasActivePeriod = ticketItem.periods.some((p) => p.endDate === null);
  if (hasActivePeriod) {
    throw new Error("Ce ticket est déjà en cours");
  }

  // Mettre à jour timeSpentInDays avec le temps total calculé jusqu'à maintenant
  // (avant de créer la nouvelle période)
  ticketItem.timeSpentInDays = calculateTotalTimeSpentInDays(ticketItem);

  // Créer une nouvelle période
  ticketItem.periods.push({
    startDate: new Date(),
    endDate: null, // Nouvelle période en cours
  });

  await config.update(
    "tracking",
    tracking,
    vscode.ConfigurationTarget.Workspace
  );
}
