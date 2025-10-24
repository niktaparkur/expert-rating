import React, { useState, useMemo, useEffect } from "react";
import {
  Panel,
  PanelHeader,
  Group,
  Header,
  CardGrid,
  Spinner,
  Search,
  Placeholder,
  PullToRefresh,
  PanelHeaderButton,
} from "@vkontakte/vkui";
import { Icon56UsersOutline, Icon28RefreshOutline } from "@vkontakte/icons";
import { useRouteNavigator } from "@vkontakte/vk-mini-apps-router";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { useInView } from "react-intersection-observer";
import debounce from "lodash.debounce";

import { ExpertCard } from "../components/Expert/ExpertCard";
import { AfishaFilters } from "../components/Afisha/AfishaFilters";
import { useApi } from "../hooks/useApi";

interface HomeProps {
  id: string;
}

interface CategoryData {
  id: number;
  name: string;
  items: { id: number; name: string }[];
}

const PAGE_SIZE = 10;

export const Home = ({ id }: HomeProps) => {
  const routeNavigator = useRouteNavigator();
  const { apiGet } = useApi();
  const { ref, inView } = useInView({ threshold: 0.5 });

  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [filters, setFilters] = useState({ region: "", category_id: "" });

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

  const fetchExperts = async ({ pageParam = 1 }) => {
    const params = new URLSearchParams({
      page: String(pageParam),
      size: String(PAGE_SIZE),
    });
    if (debouncedSearch) params.append("search", debouncedSearch);
    if (filters.region) params.append("region", filters.region);
    if (filters.category_id) params.append("category_id", filters.category_id);

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
    queryKey: ["experts", debouncedSearch, filters],
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
          <Search
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Поиск по имени или направлению"
          />
          <AfishaFilters
            regions={regions}
            categories={categories}
            onFiltersChange={setFilters}
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
