import * as vscode from "vscode";
import { exec } from "child_process";
import { promisify } from "util";
import { ICRAItem, ICRATicket } from "./types/cra.types";

const execAsync = promisify(exec);

export function getCRATracking(): ICRAItem[] {
  const config = vscode.workspace.getConfiguration("cra-aubay");
  const tracking = config.get<any[]>("tracking", []);

  return tracking.map((item: any) => ({
    month: item.month,
    year: item.year,
    tickets: item.tickets.map((ticket: any) => ({
      ...ticket,
      startDate: new Date(ticket.startDate),
      endDate: ticket.endDate ? new Date(ticket.endDate) : null,
      author: ticket.author || "",
    })),
  }));
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

  let craItem = tracking.find(
    (item) => item.month === currentMonth && item.year === currentYear
  );

  const newTicket: ICRATicket = {
    jiraUrl,
    ticket,
    startDate: now,
    endDate: null,
    author,
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

  if (ticketItem.endDate) {
    throw new Error("Ce ticket est déjà marqué comme terminé");
  }

  ticketItem.endDate = new Date();

  await config.update(
    "tracking",
    tracking,
    vscode.ConfigurationTarget.Workspace
  );
}
