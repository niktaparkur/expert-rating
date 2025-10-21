import React, {
  useState,
  useEffect,
  useMemo,
  useCallback,
  useRef,
} from "react";
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
import { ExpertCard } from "../components/ExpertCard";
import { useApi } from "../hooks/useApi";
import { UserData } from "../types";
import debounce from "lodash.debounce";
import { AfishaFilters } from "../components/AfishaFilters";

interface HomeProps {
  id: string;
  user: UserData | null;
}

const PAGE_SIZE = 10;

export const Home = ({ id, user }: HomeProps) => {
  const routeNavigator = useRouteNavigator();
  const { apiGet } = useApi();
  const observerRef = useRef<HTMLDivElement>(null);

  const [experts, setExperts] = useState<any[]>([]);
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  const [filters, setFilters] = useState({ region: "", category_id: "" });
  const [regions, setRegions] = useState<string[]>([]);
  const [categories, setCategories] = useState<any[]>([]);

  useEffect(() => {
    apiGet("/meta/regions").then(setRegions);
    apiGet("/meta/themes").then(setCategories);
  }, [apiGet]);

  const fetchExperts = useCallback(
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
        const data = await apiGet(`/experts/top?${params.toString()}`);
        const expertsWithPosition = data.items.map(
          (expert: any, index: number) => ({
            ...expert,
            topPosition: (currentPage - 1) * PAGE_SIZE + index + 1,
          }),
        );
        setExperts((prev) =>
          isNewSearch ? expertsWithPosition : [...prev, ...expertsWithPosition],
        );
        setHasMore(currentPage * PAGE_SIZE < data.total_count);
        setPage(isNewSearch ? 2 : (p) => p + 1);
      } catch (error) {
        console.error("Failed to fetch experts:", error);
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
    setExperts([]);
    setPage(1);
    setHasMore(true);
    fetchExperts(true);
  }, [debouncedSearch, filters]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !isLoading) {
          fetchExperts();
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
  }, [hasMore, isLoading, fetchExperts]);

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
        {experts.length > 0 && (
          <CardGrid
            size="l"
            style={{ padding: 0, margin: "0 8px", paddingBottom: "60px" }}
          >
            {experts.map((expert) => (
              <ExpertCard
                key={expert.vk_id}
                expert={expert}
                topPosition={expert.topPosition}
                onClick={() => routeNavigator.push(`/expert/${expert.vk_id}`)}
              />
            ))}
          </CardGrid>
        )}

        <div ref={observerRef} style={{ height: "1px" }} />

        {isLoading && <Spinner size="l" style={{ margin: "20px 0" }} />}

        {!isLoading && experts.length === 0 && (
          <Placeholder
            icon={<Icon56UsersOutline />}
            title="Эксперты не найдены"
          >
            Попробуйте изменить поисковый запрос или фильтры.
          </Placeholder>
        )}
      </Group>
    </Panel>
  );
};
