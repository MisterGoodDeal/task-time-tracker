import {
  ICRATicket,
  ICRATicketPeriod,
  ICRATicketTimeSpent,
} from "../types/cra.types";
import {
  getWorkStartHour,
  getWorkEndHour,
  getTimeFormat,
  getTimeIncrement,
} from "../config";
import { t } from "./i18n.utils";

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
  const timeIncrement = getTimeIncrement();
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
      return timeIncrement;
    }

    const hoursWorked = effectiveEndHour - effectiveStartHour;
    const days = hoursWorked / workHoursPerDay;
    const multiplier = 1 / timeIncrement;
    return Math.max(timeIncrement, Math.ceil(days * multiplier) / multiplier);
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
        const multiplier = 1 / timeIncrement;
        totalDays += Math.max(
          timeIncrement,
          Math.ceil(days * multiplier) / multiplier
        );
      } else {
        totalDays += timeIncrement;
      }
    } else if (isStartDay) {
      const startHour = start.getHours() + start.getMinutes() / 60;
      const effectiveStartHour = Math.max(startHour, workStartHour);
      if (effectiveStartHour < workEndHour) {
        totalDays += timeIncrement;
      }
    } else if (isEndDay) {
      const endHour = end.getHours() + end.getMinutes() / 60;
      const effectiveEndHour = Math.min(endHour, workEndHour);
      if (effectiveEndHour > workStartHour) {
        totalDays += timeIncrement;
      }
    } else {
      totalDays += 1;
    }

    currentDay.setDate(currentDay.getDate() + 1);
  }

  return Math.max(timeIncrement, totalDays);
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

export const calculatePreciseTimeSpent = (
  ticket: ICRATicket
): ICRATicketTimeSpent => {
  if (ticket.periods.length === 0) {
    return {
      days: 0,
      hours: 0,
      minutes: 0,
      seconds: 0,
    };
  }

  const workStartHour = getWorkStartHour();
  const workEndHour = getWorkEndHour();
  const now = new Date();

  const periodsWithEnd: PeriodWithEnd[] = ticket.periods.map(
    (period: ICRATicketPeriod): PeriodWithEnd => {
      const start = new Date(period.startDate);
      const end = period.endDate ? new Date(period.endDate) : now;
      return {
        startDate: start,
        endDate: end,
      };
    }
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

  let totalMilliseconds = 0;

  for (const period of mergedPeriods) {
    const start = new Date(period.startDate);
    const end = new Date(period.endDate);

    const startDay = new Date(
      start.getFullYear(),
      start.getMonth(),
      start.getDate()
    );
    const endDay = new Date(end.getFullYear(), end.getMonth(), end.getDate());

    const currentDay = new Date(startDay);
    while (currentDay <= endDay) {
      const isStartDay = currentDay.getTime() === startDay.getTime();
      const isEndDay = currentDay.getTime() === endDay.getTime();

      const dayStart = new Date(currentDay);
      dayStart.setHours(workStartHour, 0, 0, 0);
      const dayEnd = new Date(currentDay);
      dayEnd.setHours(workEndHour, 0, 0, 0);

      let periodStart: Date;
      let periodEnd: Date;

      if (isStartDay && isEndDay) {
        periodStart = new Date(Math.max(start.getTime(), dayStart.getTime()));
        periodEnd = new Date(Math.min(end.getTime(), dayEnd.getTime()));
      } else if (isStartDay) {
        periodStart = new Date(Math.max(start.getTime(), dayStart.getTime()));
        periodEnd = dayEnd;
      } else if (isEndDay) {
        periodStart = dayStart;
        periodEnd = new Date(Math.min(end.getTime(), dayEnd.getTime()));
      } else {
        periodStart = dayStart;
        periodEnd = dayEnd;
      }

      if (periodStart < periodEnd) {
        totalMilliseconds += periodEnd.getTime() - periodStart.getTime();
      }

      currentDay.setDate(currentDay.getDate() + 1);
    }
  }

  const totalSeconds = Math.floor(totalMilliseconds / 1000);
  const days = Math.floor(totalSeconds / (24 * 3600));
  const hours = Math.floor((totalSeconds % (24 * 3600)) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  return {
    days,
    hours,
    minutes,
    seconds,
  };
};

export const formatPreciseTime = (timeSpent: ICRATicketTimeSpent): string => {
  const parts: string[] = [];
  if (timeSpent.days > 0) {
    parts.push(`${timeSpent.days}j`);
  }
  if (timeSpent.hours > 0) {
    parts.push(`${timeSpent.hours}h`);
  }
  if (timeSpent.minutes > 0) {
    parts.push(`${timeSpent.minutes}m`);
  }
  if (timeSpent.seconds > 0 && parts.length === 0) {
    parts.push(`${timeSpent.seconds}s`);
  }
  return parts.join(" ");
};

export const getMonthName = (month: number): string => {
  return t(`months.${month}`) || "";
};
