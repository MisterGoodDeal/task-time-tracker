import * as vscode from "vscode";

export interface TicketData {
  ticket: string;
  month: number;
  year: number;
  ticketProviderUrl?: string;
  branchName?: string;
}

export interface MonthAndYearData {
  month: number;
  year: number;
}

export interface TreeItemData extends vscode.TreeItem {
  itemId?: string;
  ticketData?: TicketData | MonthAndYearData;
}

export type CommandHandler = (item?: TreeItemData) => Promise<void> | void;
