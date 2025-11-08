import React, { useState, useMemo, useEffect } from "react";
import {
  Panel,
  PanelHeader,
  Group,
  Header,
  CardGrid,
  Spinner,
  Placeholder,
  PullToRefresh,
  PanelHeaderButton,
} from "@vkontakte/vkui";
import { Icon56UsersOutline, Icon28RefreshOutline } from "@vkontakte/icons";
import { useRouteNavigator } from "@vkontakte/vk-mini-apps-router";
import { useInfiniteQuery } from "@tanstack/react-query";
import { useInView } from "react-intersection-observer";
import debounce from "lodash.debounce";

import { ExpertCard } from "../components/Expert/ExpertCard";
import { useApi } from "../hooks/useApi";
import { useUiStore } from "../store/uiStore";
import { useFiltersStore } from "../store/filtersStore";
import { SearchWithFilters } from "../components/Shared/SearchWithFilters";

interface HomeProps {
  id: string;
}

const PAGE_SIZE = 10;

export const Home = ({ id }: HomeProps) => {
  const routeNavigator = useRouteNavigator();
  const { apiGet } = useApi();
  const { ref, inView } = useInView({ threshold: 0.5 });
  const { setActiveModal } = useUiStore();
  const homeFilters = useFiltersStore((state) => state.homeFilters);

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

  const fetchExperts = async ({ pageParam = 1 }) => {
    const params = new URLSearchParams({
      page: String(pageParam),
      size: String(PAGE_SIZE),
    });
    if (debouncedSearch) params.append("search", debouncedSearch);
    if (homeFilters.region) params.append("region", homeFilters.region);
    if (homeFilters.category_id)
      params.append("category_id", homeFilters.category_id);

    return await apiGet<any>(`/experts/top?${params.toString()}`);
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
    queryKey: ["experts", debouncedSearch, homeFilters],
    queryFn: fetchExperts,
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

  const allExperts = useMemo(() => {
    return (
      data?.pages.flatMap((page, pageIndex) =>
        page.items.map((expert: any, itemIndex: number) => ({
          ...expert,
          topPosition: pageIndex * PAGE_SIZE + itemIndex + 1,
        })),
      ) || []
    );
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
        Рейтинг Экспертов
      </PanelHeader>
      <PullToRefresh onRefresh={onRefresh} isFetching={isFetching}>
        <Group>
          <SearchWithFilters
            searchQuery={searchQuery}
            onSearchChange={(e) => setSearchQuery(e.target.value)}
            onFiltersClick={() => setActiveModal("home-filters")}
            placeholder="Поиск по имени или направлению"
          />
        </Group>
        <Group header={<Header>Топ экспертов</Header>}>
          {isLoading && allExperts.length === 0 ? (
            <Spinner size="xl" style={{ margin: "20px 0" }} />
          ) : allExperts.length > 0 ? (
            <CardGrid
              size="l"
              style={{ padding: 0, margin: "0 8px", paddingBottom: "60px" }}
            >
              {allExperts.map((expert) => (
                <ExpertCard
                  key={expert.vk_id}
                  expert={expert}
                  topPosition={expert.topPosition}
                  onClick={() => routeNavigator.push(`/expert/${expert.vk_id}`)}
                />
              ))}
            </CardGrid>
          ) : (
            <Placeholder
              icon={<Icon56UsersOutline />}
              title="Эксперты не найдены"
            >
              Попробуйте изменить поисковый запрос или фильтры.
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
