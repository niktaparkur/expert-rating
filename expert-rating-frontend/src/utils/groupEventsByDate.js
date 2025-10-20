import { isToday, isYesterday, isFuture, differenceInDays, parseISO } from 'date-fns';

/**
 * @typedef {object} EventData
 * @property {string} event_date - Дата события в формате ISO (например, '2025-10-25T14:00:00Z')
 */

/**
 * Группирует мероприятия по временным категориям.
 * @param {EventData[]} events - Массив объектов мероприятий.
 * @returns {{today: EventData[], tomorrow: EventData[], next7Days: EventData[], later: EventData[]}}
 */
export const groupPlannedEvents = (events) => {
  const groups = {
    today: [],
    tomorrow: [],
    next7Days: [],
    later: [],
  };

  const now = new Date();

  events.forEach(event => {
    const eventDate = parseISO(event.event_date);
    if (!isFuture(eventDate) && !isToday(eventDate)) return; // Пропускаем прошедшие

    const diffDays = differenceInDays(eventDate, now);

    if (isToday(eventDate)) {
      groups.today.push(event);
    } else if (diffDays === 1) {
      groups.tomorrow.push(event);
    } else if (diffDays > 1 && diffDays <= 7) {
      groups.next7Days.push(event);
    } else {
      groups.later.push(event);
    }
  });

  // Сортируем каждую группу по возрастанию даты
  for (const key in groups) {
      groups[key].sort((a, b) => parseISO(a.event_date) - parseISO(b.event_date));
  }

  return groups;
};