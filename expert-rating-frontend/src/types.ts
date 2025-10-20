export interface ExpertInfo {
    vk_id: number;
    first_name: string;
    last_name: string;
    photo_url: string;
}

// Статистика эксперта (полученные голоса)
export interface Stats {
    expert?: number;
    community?: number;
    events_count?: number;
}
// Статистика пользователя (отданные голоса)
export interface MyVotesStats {
    trust?: number;
    distrust?: number;
}

// Тип для данных мероприятия
export interface EventData {
    id: number;
    expert_id: number;
    status: 'pending' | 'approved' | 'rejected';
    name: string;
    promo_word: string;
    event_date: string; // ISO-строка
    duration_minutes: number;
    event_link?: string;
    is_private: boolean;
    votes_count: number;
    trust_count: number;
    distrust_count: number;
    has_tariff_warning: boolean;
    expert_info?: ExpertInfo;
}

// Тип для данных пользователя
export interface UserData {
    vk_id: number;
    first_name: string;
    last_name: string;
    photo_url: string;
    is_admin: boolean;
    is_expert: boolean;
    status: 'pending' | 'approved' | 'rejected' | null;
    topics?: string[];
    stats?: Stats;
    my_votes_stats?: MyVotesStats;
    tariff_plan?: string;
    show_community_rating: boolean;
}