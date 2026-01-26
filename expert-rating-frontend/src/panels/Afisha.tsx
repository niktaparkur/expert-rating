import React, { useState, useMemo, useEffect } from "react";
import {
  Panel,
  PanelHeader,
  Group,
  Spinner,
  Placeholder,
  PullToRefresh,
  PanelHeaderButton,
  SimpleCell,
} from "@vkontakte/vkui";
import {
  Icon28CalendarOutline,
  Icon28RefreshOutline,
  Icon56NewsfeedOutline,
} from "@vkontakte/icons";
import { useInfiniteQuery } from "@tanstack/react-query";
import { useInView } from "react-intersection-observer";
import debounce from "lodash.debounce";
import { format } from "date-fns";
import { ru } from "date-fns/locale";

import { useApi } from "../hooks/useApi";
import { EventData } from "../types";
import { useFiltersStore } from "../store/filtersStore";
import { SearchWithFilters } from "../components/Shared/SearchWithFilters";
import { useUiStore } from "../store/uiStore";
import { Option } from "../components/Shared/SelectModal";

interface AfishaProps {
  id: string;
  onEventClick: (event: EventData) => void;
  openSelectModal: (
    title: string,
    options: Option[],
    selected: string | number | null,
    onSelect: (val: any) => void,
    searchable?: boolean,
    fallbackModal?: string | null,
  ) => void;
}

const PAGE_SIZE = 10;

export const Afisha = ({ id, onEventClick, openSelectModal }: AfishaProps) => {
  const { apiGet } = useApi();
  const { ref, inView } = useInView({ threshold: 0.5 });
  const { setActiveModal } = useUiStore();
  const afishaFilters = useFiltersStore((state) => state.afishaFilters);

  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

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
    if (afishaFilters.region) params.append("region", afishaFilters.region);
    if (afishaFilters.category_id)
      params.append("category_id", afishaFilters.category_id);
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
    queryKey: ["eventsFeed", debouncedSearch, afishaFilters],
    queryFn: fetchEvents,
    initialPageParam: 1,
    getNextPageParam: (lastPage, allPages) => {
      if (!lastPage || lastPage.items.length === 0) return undefined;
      const totalCount = lastPage.total_count;
      const loadedCount = allPages.length * PAGE_SIZE;
      return loadedCount < totalCount ? allPages.length + 1 : undefined;
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

  const onRefresh = async () => {
    await refetch();
  };

  return (
    <Panel id={id}>
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
          <SearchWithFilters
            searchQuery={searchQuery}
            onSearchChange={(e) => setSearchQuery(e.target.value)}
            onFiltersClick={() => setActiveModal("afisha-filters")}
            placeholder="Поиск по мероприятиям"
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
                  onClick={() => onEventClick(event)}
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
