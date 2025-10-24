import React, { useState, useMemo, useEffect } from "react";
import {
  Panel,
  PanelHeader,
  Group,
  Spinner,
  Placeholder,
  Search,
  ModalRoot,
  PullToRefresh,
  PanelHeaderButton,
  SimpleCell,
} from "@vkontakte/vkui";
import {
  Icon28CalendarOutline,
  Icon28RefreshOutline,
  Icon56NewsfeedOutline,
} from "@vkontakte/icons";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { useInView } from "react-intersection-observer";
import debounce from "lodash.debounce";
import { useApi } from "../hooks/useApi";
import { EventData } from "../types";
import { AfishaFilters } from "../components/Afisha/AfishaFilters";
import { AfishaEventModal } from "../components/Afisha/AfishaEventModal";
import { usePlatform } from "@vkontakte/vkui";
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
  const { ref, inView } = useInView({ threshold: 0.5 });
  const platform = usePlatform();

  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [filters, setFilters] = useState({ region: "", category_id: "" });

  const [activeModal, setActiveModal] = useState<string | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<EventData | null>(null);

  const { data: regions = [] } = useQuery({
    queryKey: ["metaRegions"],
    queryFn: () => apiGet<string[]>("/meta/regions"),
  });
  const { data: categories = [] } = useQuery({
    queryKey: ["metaThemes"],
    queryFn: () => apiGet<CategoryData[]>("/meta/themes"),
  });

  const debouncedSetSearch = useMemo(
    () => debounce(setDebouncedSearch, 500),
    [],
  );
  useEffect(() => {
    debouncedSetSearch(searchQuery);
    return () => debouncedSetSearch.cancel();
  }, [searchQuery, debouncedSetSearch]);

  const fetchEvents = async ({ pageParam = 1 }) => {
    const params = new URLSearchParams({
      page: String(pageParam),
      size: String(PAGE_SIZE),
    });
    if (debouncedSearch) params.append("search", debouncedSearch);
    if (filters.region) params.append("region", filters.region);
    if (filters.category_id) params.append("category_id", filters.category_id);
    return await apiGet<any>(`/events/feed?${params.toString()}`);
  };

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isLoading,
    isFetchingNextPage,
    isFetching,
    refetch,
  } = useInfiniteQuery({
    queryKey: ["eventsFeed", debouncedSearch, filters],
    queryFn: fetchEvents,
    initialPageParam: 1,
    getNextPageParam: (lastPage, allPages) => {
      const currentPage = allPages.length;
      const totalCount = lastPage.total_count;
      return currentPage * PAGE_SIZE < totalCount ? currentPage + 1 : undefined;
    },
  });

  useEffect(() => {
    if (inView && hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [inView, hasNextPage, fetchNextPage, isFetchingNextPage]);

  const allEvents = useMemo(() => {
    return data?.pages.flatMap((page) => page.items) || [];
  }, [data]);

  const handleEventClick = (event: EventData) => {
    setSelectedEvent(event);
    setActiveModal("afisha-event-details");
  };

  const onRefresh = async () => {
    await refetch();
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
      <PanelHeader
        after={
          <PanelHeaderButton
            onClick={() => onRefresh()}
            aria-label="Обновить"
            className="hide-on-mobile"
          >
            <Icon28RefreshOutline />
          </PanelHeaderButton>
        }
      >
        Афиша
      </PanelHeader>

      <PullToRefresh onRefresh={onRefresh} isFetching={isFetching}>
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
          {isLoading && allEvents.length === 0 ? (
            <Spinner size="xl" />
          ) : allEvents.length > 0 ? (
            allEvents.map((event) => {
              const isoDateString = event.event_date.endsWith("Z")
                ? event.event_date
                : event.event_date + "Z";
              const eventDate = new Date(isoDateString);
              const dateString = format(eventDate, "d MMMM, HH:mm", {
                locale: ru,
              });

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
            })
          ) : (
            <Placeholder
              icon={<Icon56NewsfeedOutline />}
              title="Мероприятия не найдены"
            >
              Попробуйте изменить фильтры или поисковый запрос.
            </Placeholder>
          )}

          <div ref={ref} style={{ height: "1px" }} />

          {isFetchingNextPage && (
            <Spinner size="l" style={{ margin: "20px 0" }} />
          )}
        </Group>
      </PullToRefresh>
    </Panel>
  );
};
