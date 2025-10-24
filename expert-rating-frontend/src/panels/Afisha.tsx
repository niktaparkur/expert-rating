import React, {
  useState,
  useEffect,
  useCallback,
  useRef,
  useMemo,
} from "react";
import {
  Panel,
  PanelHeader,
  Group,
  Spinner,
  Placeholder,
  Search,
  SimpleCell,
  ModalRoot,
} from "@vkontakte/vkui";
import { Icon28CalendarOutline, Icon56NewsfeedOutline } from "@vkontakte/icons";
import { useApi } from "../hooks/useApi";
import { EventData } from "../types";
import { AfishaFilters } from "../components/Afisha/AfishaFilters";
import { AfishaEventModal } from "../components/Afisha/AfishaEventModal";
import debounce from "lodash.debounce";
import { format } from "date-fns";
import { ru } from "date-fns/locale";

interface AfishaProps {
  id: string;
}

interface CategoryData {
  id: number;
  name: string;
  items: { id: number; name: string }[];
}

const PAGE_SIZE = 10;

export const Afisha = ({ id }: AfishaProps) => {
  const { apiGet } = useApi();
  const observerRef = useRef<HTMLDivElement>(null);

  const [events, setEvents] = useState<EventData[]>([]);
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [filters, setFilters] = useState({ region: "", category_id: "" });

  const [activeModal, setActiveModal] = useState<string | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<EventData | null>(null);

  const [regions, setRegions] = useState<string[]>([]);
  const [categories, setCategories] = useState<CategoryData[]>([]);

  useEffect(() => {
    apiGet<string[]>("/meta/regions").then(setRegions);
    apiGet<CategoryData[]>("/meta/themes").then(setCategories);
  }, [apiGet]);

  const fetchEvents = useCallback(
    async (isNewSearch = false) => {
      if (isLoading) return;
      setIsLoading(true);
      const currentPage = isNewSearch ? 1 : page;
      const params = new URLSearchParams({
        page: String(currentPage),
        size: String(PAGE_SIZE),
      });
      if (debouncedSearch) params.append("search", debouncedSearch);
      if (filters.region) params.append("region", filters.region);
      if (filters.category_id)
        params.append("category_id", filters.category_id);

      try {
        const data = await apiGet<any>(`/events/feed?${params.toString()}`);
        setEvents((prev) =>
          isNewSearch ? data.items : [...prev, ...data.items],
        );
        setHasMore(currentPage * PAGE_SIZE < data.total_count);
        if (isNewSearch) setPage(2);
        else setPage((p) => p + 1);
      } catch (error) {
        console.error("Failed to fetch events feed:", error);
      } finally {
        setIsLoading(false);
      }
    },
    [apiGet, isLoading, page, debouncedSearch, filters],
  );

  const debouncedSetSearch = useMemo(
    () => debounce(setDebouncedSearch, 500),
    [],
  );

  useEffect(() => {
    debouncedSetSearch(searchQuery);
    return () => debouncedSetSearch.cancel();
  }, [searchQuery, debouncedSetSearch]);

  useEffect(() => {
    setEvents([]);
    setPage(1);
    setHasMore(true);
    fetchEvents(true);
  }, [debouncedSearch, filters]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !isLoading) {
          fetchEvents();
        }
      },
      { threshold: 1.0 },
    );

    const currentObserverRef = observerRef.current;
    if (currentObserverRef) {
      observer.observe(currentObserverRef);
    }

    return () => {
      if (currentObserverRef) {
        observer.unobserve(currentObserverRef);
      }
    };
  }, [hasMore, isLoading, fetchEvents]);

  const handleEventClick = (event: EventData) => {
    setSelectedEvent(event);
    setActiveModal("afisha-event-details");
  };

  const modal = (
    <ModalRoot activeModal={activeModal} onClose={() => setActiveModal(null)}>
      <AfishaEventModal
        id="afisha-event-details"
        event={selectedEvent}
        onClose={() => setActiveModal(null)}
      />
    </ModalRoot>
  );

  return (
    <Panel id={id}>
      {modal}
      <PanelHeader>Афиша</PanelHeader>
      <Group>
        <Search
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Поиск по мероприятиям"
        />
        <AfishaFilters
          regions={regions}
          categories={categories}
          onFiltersChange={setFilters}
        />
      </Group>

      <Group style={{ paddingBottom: "60px" }}>
        {events.map((event) => {
          const isoDateString = event.event_date.endsWith("Z")
            ? event.event_date
            : event.event_date + "Z";
          const eventDate = new Date(isoDateString);
          const dateString = format(eventDate, "d MMMM, HH:mm", { locale: ru });

          return (
            <SimpleCell
              key={event.id}
              before={<Icon28CalendarOutline />}
              subtitle={dateString}
              onClick={() => handleEventClick(event)}
              hoverMode="background"
              activeMode="background"
              multiline
            >
              {event.name}
            </SimpleCell>
          );
        })}

        <div ref={observerRef} style={{ height: "1px" }} />
        {isLoading && <Spinner size="l" style={{ margin: "20px 0" }} />}
        {!isLoading && events.length === 0 && (
          <Placeholder
            icon={<Icon56NewsfeedOutline />}
            title="Мероприятия не найдены"
          >
            Попробуйте изменить фильтры или поисковый запрос.
          </Placeholder>
        )}
      </Group>
    </Panel>
  );
};
