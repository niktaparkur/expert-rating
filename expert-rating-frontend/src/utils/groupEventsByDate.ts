import { isToday, differenceInDays, parseISO, startOfToday } from "date-fns";

import { EventData } from "../types";

interface GroupedEvents {
  today: EventData[];
  tomorrow: EventData[];
  next7Days: EventData[];
  later: EventData[];
}

/**
 * @param {EventData[]} events
 * @returns {GroupedEvents}
 */
export const groupPlannedEvents = (events: EventData[]): GroupedEvents => {
  const groups: GroupedEvents = {
    today: [],
    tomorrow: [],
    next7Days: [],
    later: [],
  };

  const today = startOfToday();

  events.forEach((event) => {
    const eventDate = parseISO(event.event_date);

    const diffDays = differenceInDays(eventDate, today);

    if (diffDays < 0 || isToday(eventDate)) {
      groups.today.push(event);
    } else if (diffDays === 1) {
      groups.tomorrow.push(event);
    } else if (diffDays <= 7) {
      groups.next7Days.push(event);
    } else {
      groups.later.push(event);
    }
  });

  for (const key in groups) {
    const groupKey = key as keyof GroupedEvents;
    groups[groupKey].sort(
      (a, b) =>
        parseISO(a.event_date).getTime() - parseISO(b.event_date).getTime(),
    );
  }

  return groups;
};
