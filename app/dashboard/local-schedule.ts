import type { ScheduleWeeklyClass } from "@/lib/schedule";
import {
  WEEKDAYS,
  weeklySlotToLocal,
  type LocalWeeklyTime,
  type Weekday,
} from "@/lib/time-zone";

// A weekly class at its local weekday and time. Minutes count from the start
// of its local day, so a class running past midnight ends after 1440 and
// stays on its start day
export type LocalClass = {
  weeklyClass: ScheduleWeeklyClass;
  local: LocalWeeklyTime;
  startMinutes: number;
  endMinutes: number;
  // Side-by-side columns where two classes overlap (only possible in the
  // week of an autumn clock change)
  lane: number;
  lanes: number;
};

export type LocalDay = { day: Weekday; classes: LocalClass[] };

export type LocalSchedule = {
  days: LocalDay[];
  // Whole hours the week grid shows: firstHour up to (not including) lastHour
  firstHour: number;
  lastHour: number;
};

function assignLanes(classes: LocalClass[]) {
  let cluster: LocalClass[] = [];
  let clusterEnd = -1;
  const close = () => {
    cluster.forEach((item, index) => {
      item.lane = index;
      item.lanes = cluster.length;
    });
  };
  for (const item of classes) {
    if (item.startMinutes >= clusterEnd) {
      close();
      cluster = [];
    }
    cluster.push(item);
    clusterEnd = Math.max(clusterEnd, item.endMinutes);
  }
  close();
}

// Sorted and grouped by local weekday (Monday first) and local time, not the
// backend's UTC order: a class can land on another weekday locally
export function toLocalSchedule(
  weeklyClasses: ScheduleWeeklyClass[],
  timeZone: string,
  now: Date,
): LocalSchedule {
  const items: LocalClass[] = weeklyClasses.map((weeklyClass) => {
    const local = weeklySlotToLocal(weeklyClass, timeZone, now);
    const startMinutes = local.hour * 60 + local.minute;
    return {
      weeklyClass,
      local,
      startMinutes,
      endMinutes: startMinutes + weeklyClass.duration,
      lane: 0,
      lanes: 1,
    };
  });

  const days = WEEKDAYS.map((day) => ({
    day,
    classes: items
      .filter((item) => item.local.day === day)
      .sort((a, b) => a.startMinutes - b.startMinutes),
  })).filter(({ classes }) => classes.length > 0);

  days.forEach(({ classes }) => assignLanes(classes));

  const firstHour = Math.floor(
    Math.min(...items.map((item) => item.startMinutes)) / 60,
  );
  const lastHour = Math.ceil(
    Math.max(...items.map((item) => item.endMinutes)) / 60,
  );

  return { days, firstHour, lastHour };
}
