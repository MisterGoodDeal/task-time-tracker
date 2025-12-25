import { ICRATicket, ICRATicketPeriod } from "../types/cra.types";
import { getWorkStartHour, getWorkEndHour, getTimeFormat } from "../config";

interface PeriodWithEnd {
  startDate: Date;
  endDate: Date;
}

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

export const calculateTotalTimeSpentInDays = (ticket: ICRATicket): number => {
  if (ticket.periods.length === 0) {
    return 0;
  }

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

export const formatHour = (
  hour: number,
  timeFormat?: "24h" | "12h"
): string => {
  const format = timeFormat || getTimeFormat();

  if (format === "12h") {
    if (hour === 0) {
      return "12 AM";
    } else if (hour < 12) {
      return `${hour} AM`;
    } else if (hour === 12) {
      return "12 PM";
    } else {
      return `${hour - 12} PM`;
    }
  }
  return `${hour}h`;
};
