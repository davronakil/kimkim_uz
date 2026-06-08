export type User = {
  id: string;
  telegram_id: string;
  username: string | null;
  first_name: string;
  last_name: string | null;
  photo_url: string | null;
  language_code: string;
  created_at: string;
  updated_at: string;
};

export type Event = {
  id: string;
  creator_id: string;
  title: string;
  description: string | null;
  starts_at: string;
  ends_at: string | null;
  location_name: string | null;
  location_address: string | null;
  location_lat: number | null;
  location_lng: number | null;
  cover_image_key: string | null;
  telegram_chat_id: string | null;
  created_at: string;
  updated_at: string;
};

export type Comment = {
  id: string;
  event_id: string;
  parent_id: string | null;
  user_id: string;
  body: string;
  created_at: string;
  updated_at: string;
  user?: Pick<User, "id" | "first_name" | "last_name" | "username" | "photo_url">;
  replies?: Comment[];
};

export type Expense = {
  id: string;
  event_id: string;
  payer_id: string;
  amount_cents: number;
  currency: string;
  description: string;
  created_at: string;
  payer?: Pick<User, "id" | "first_name" | "last_name" | "username">;
  splits?: ExpenseSplit[];
};

export type ExpenseSplit = {
  expense_id: string;
  user_id: string;
  amount_cents: number;
  user?: Pick<User, "id" | "first_name" | "last_name" | "username">;
};

export type Settlement = {
  from_user_id: string;
  to_user_id: string;
  amount_cents: number;
  currency: string;
};

export type TelegramLoginPayload = {
  id: string;
  first_name: string;
  last_name?: string;
  username?: string;
  photo_url?: string;
  auth_date: string;
  hash: string;
};

export type CloudflareEnv = Cloudflare.Env & {
  SESSION_SECRET: string;
  TELEGRAM_BOT_TOKEN: string;
  TELEGRAM_BOT_USERNAME: string;
  NEXT_PUBLIC_GOOGLE_MAPS_API_KEY?: string;
  NEXT_PUBLIC_APP_URL?: string;
};
