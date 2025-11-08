export interface ExpertInfo {
  vk_id: number;
  first_name: string;
  last_name: string;
  photo_url: string;
}

export interface Stats {
  expert?: number;
  community?: number;
  events_count?: number;
}

export interface MyVotesStats {
  trust?: number;
  distrust?: number;
}

export interface EventData {
  id: number;
  expert_id: number;
  status: "pending" | "approved" | "rejected";
  name: string;
  description?: string;
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

export interface UserVoteInfo {
  vote_type: "trust" | "distrust";
  comment?: string;
}

export interface UserData {
  vk_id: number;
  first_name: string;
  last_name: string;
  photo_url: string;
  is_admin: boolean;
  is_expert: boolean;
  status: "pending" | "approved" | "rejected" | null;
  topics?: string[];
  stats?: Stats;
  my_votes_stats?: MyVotesStats;
  tariff_plan?: string;
  show_community_rating: boolean;
  current_user_vote_info?: UserVoteInfo;
  regalia?: string;
  social_link?: string;
  allow_notifications: boolean;
  allow_expert_mailings: boolean;
  email?: string;
}
