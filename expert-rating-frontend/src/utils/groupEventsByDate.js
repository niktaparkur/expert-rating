import { isToday, differenceInDays, parseISO, startOfToday } from "date-fns";

/**
 * Группирует мероприятия по временным категориям.
 * @param {import("../types").EventData[]} events - Массив объектов мероприятий, которые еще не закончились.
 * @returns {{today: import("../types").EventData[], tomorrow: import("../types").EventData[], next7Days: import("../types").EventData[], later: import("../types").EventData[]}}
 */
export const groupPlannedEvents = (events) => {
  const groups = {
    today: [],
    tomorrow: [],
    next7Days: [],
    later: [],
  };

  const today = startOfToday();

  events.forEach((event) => {
    const eventDate = parseISO(event.event_date);

    // Вычисляем разницу в календарных днях
    const diffDays = differenceInDays(eventDate, today);

    // 1. Сначала проверяем, идет ли событие уже сейчас (live) или начнется сегодня.
    // Если разница дней отрицательная, значит, оно началось в прошлом, но раз оно в списке planned,
    // значит, оно еще не закончилось.
    if (diffDays < 0 || isToday(eventDate)) {
      groups.today.push(event);
    }
    // 2. Затем проверяем будущие события.
    else if (diffDays === 1) {
      groups.tomorrow.push(event);
    } else if (diffDays <= 7) {
      groups.next7Days.push(event);
    } else {
      // Все, что осталось - это события, которые начнутся более чем через 7 дней.
      groups.later.push(event);
    }
  });

  // Сортируем каждую группу по возрастанию даты
  for (const key in groups) {
    if (Array.isArray(groups[key])) {
      groups[key].sort(
        (a, b) =>
          parseISO(a.event_date).getTime() - parseISO(b.event_date).getTime(),
      );
    }
  }

  return groups;
};
