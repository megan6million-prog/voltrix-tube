export interface Content {
  id: string;
  title: string;
  description?: string;
  content_type: "video" | "short" | "movie" | "series_episode" | "clip";
  category?: string;
  tags?: string[];
  language: string;
  thumbnail_url?: string;
  duration_seconds?: number;
  visibility: string;
  monetization_type?: string;
  ppv_price_ugx?: number;
  rental_price_ugx?: number;
  purchase_price_ugx?: number;
  view_count: number;
  like_count: number;
  comment_count: number;
  processing_status: string;
  is_kids_safe: boolean;
  published_at?: string;
  created_at: string;
  channel?: Channel;
}

export interface Channel {
  id: string;
  handle: string;
  channel_name: string;
  description?: string;
  avatar_url?: string;
  banner_url?: string;
  subscriber_count: number;
  is_verified: boolean;
  is_monetized: boolean;
}

export interface User {
  id: string;
  username: string;
  phone_primary?: string;
  avatar_url?: string;
  bio?: string;
  role: string;
  country?: string;
  language?: string;
  is_verified?: boolean;
  created_at?: string;
}

export interface WalletBalance {
  balance_ugx: number;
  bonus_balance_ugx: number;
  lifetime_topup: number;
  lifetime_spent: number;
}

export interface WalletTransaction {
  id: string;
  type: string;
  amount_ugx: number;
  balance_after: number;
  description?: string;
  status: string;
  created_at: string;
}

export interface Notification {
  id: string;
  type: string;
  title?: string;
  body?: string;
  is_read: boolean;
  created_at: string;
}

export interface Livestream {
  id: string;
  title: string;
  stream_type: string;
  ivs_playback_url?: string;
  status: string;
  ppv_price_ugx?: number;
  viewer_count: number;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  error?: {
    code: string;
    message: string;
  };
}
