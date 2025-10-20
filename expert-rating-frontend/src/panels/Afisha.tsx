import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
    Panel, PanelHeader, Group, Spinner, Placeholder, Search,
    Button, Div
} from '@vkontakte/vkui';
import { Icon56NewsfeedOutline } from '@vkontakte/icons';
import { useApi } from '../hooks/useApi';
import { EventData, UserData } from '../types';
import { AfishaEventCard } from '../components/AfishaEventCard';
import { AfishaFilters } from '../components/AfishaFilters';
import debounce from 'lodash.debounce';
import { useRouteNavigator } from '@vkontakte/vk-mini-apps-router';

interface AfishaProps {
    id: string;
    user: UserData | null;
}

const PAGE_SIZE = 10;

export const Afisha = ({ id, user }: AfishaProps) => {
    const routeNavigator = useRouteNavigator();
    const { apiGet } = useApi();
    const observerRef = useRef<HTMLDivElement>(null);

    const [events, setEvents] = useState<EventData[]>([]);
    const [page, setPage] = useState(1);
    const [isLoading, setIsLoading] = useState(false);
    const [hasMore, setHasMore] = useState(true);
    const [totalEvents, setTotalEvents] = useState(0);

    const [searchQuery, setSearchQuery] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const [filters, setFilters] = useState({ region: '', category_id: '' });

    const [regions, setRegions] = useState<string[]>([]);
    const [categories, setCategories] = useState<any[]>([]);
    useEffect(() => {
        apiGet('/meta/regions').then(setRegions);
        apiGet('/meta/themes').then(setCategories);
    }, [apiGet]);

    const fetchEvents = useCallback(async (isNewSearch = false) => {
        if (isLoading) return;
        setIsLoading(true);

        const currentPage = isNewSearch ? 1 : page;

        const params = new URLSearchParams({
            page: String(currentPage),
            size: String(PAGE_SIZE),
        });
        if (debouncedSearch) params.append('search', debouncedSearch);
        if (filters.region) params.append('region', filters.region);
        if (filters.category_id) params.append('category_id', filters.category_id);

        try {
            const data = await apiGet(`/events/feed?${params.toString()}`);
            setEvents(prev => isNewSearch ? data.items : [...prev, ...data.items]);
            setTotalEvents(data.total_count);
            setHasMore(data.items.length === PAGE_SIZE && (currentPage * PAGE_SIZE) < data.total_count);
            if (isNewSearch) setPage(2); else setPage(p => p + 1);
        } catch (error) {
            console.error("Failed to fetch events feed:", error);
        } finally {
            setIsLoading(false);
        }
    }, [apiGet, isLoading, page, debouncedSearch, filters]);

    const debouncedSetSearch = useMemo(() => debounce(setDebouncedSearch, 500), []);
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
            { threshold: 1.0 }
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

    return (
        <Panel id={id}>
            <PanelHeader>Афиша</PanelHeader>
            <Group>
                <Search value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
                <AfishaFilters regions={regions} categories={categories} onFiltersChange={setFilters} />
            </Group>

            <div style={{ paddingBottom: '60px' }}>
                {events.map(event => (
                    <AfishaEventCard key={event.id} event={event} />
                ))}

                <div ref={observerRef} style={{ height: '1px' }} />

                {isLoading && <Spinner size="l" style={{ margin: '20px 0' }} />}

                {!isLoading && events.length === 0 && (
                    <Placeholder icon={<Icon56NewsfeedOutline />} title="Мероприятия не найдены">
                        Попробуйте изменить фильтры или поисковый запрос.
                    </Placeholder>
                )}
            </div>
        </Panel>
    );
};