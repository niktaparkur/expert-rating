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
} from "@vkontakte/vkui";
import { Icon56UsersOutline } from "@vkontakte/icons";
import { useRouteNavigator } from "@vkontakte/vk-mini-apps-router";
import { useInfiniteQuery } from "@tanstack/react-query";
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
  const [regions, setRegions] = useState<string[]>([]);
  const [categories, setCategories] = useState<CategoryData[]>([]);

  useEffect(() => {
    apiGet<string[]>("/meta/regions").then(setRegions);
    apiGet<CategoryData[]>("/meta/themes").then(setCategories);
  }, [apiGet]);

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

    const data = await apiGet<any>(`/experts/top?${params.toString()}`);
    return data;
  };

  const { data, fetchNextPage, hasNextPage, isLoading, isFetchingNextPage } =
    useInfiniteQuery({
      queryKey: ["experts", debouncedSearch, filters],
      queryFn: fetchExperts,
      initialPageParam: 1,
      getNextPageParam: (lastPage, allPages) => {
        const currentPage = allPages.length;
        const totalCount = lastPage.total_count;
        return currentPage * PAGE_SIZE < totalCount
          ? currentPage + 1
          : undefined;
      },
    });

  useEffect(() => {
    if (inView && hasNextPage) {
      fetchNextPage();
    }
  }, [inView, hasNextPage, fetchNextPage]);

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

  return (
    <Panel id={id}>
      <PanelHeader>Рейтинг Экспертов</PanelHeader>
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
    </Panel>
  );
};
