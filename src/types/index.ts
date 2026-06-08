export type User = {
  id: string;
  telegram_id: string;
  telegram_chat_id: string | null;
  username: string | null;
  first_name: string;
  last_name: string | null;
  photo_url: string | null;
  language_code: string;
  created_at: string;
  updated_at: string;
};

export type EventMember = User & {
  role: "owner" | "member";
};

export type EventPaymentMode = "free" | "split" | "pay_yourself" | "paid";

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
  payment_mode: EventPaymentMode;
  ticket_price_cents: number | null;
  ticket_currency: string;
  invite_code: string | null;
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

export type EventPaymentStatus = "pending" | "completed" | "failed";

export type EventPayment = {
  id: string;
  event_id: string;
  user_id: string;
  stripe_checkout_session_id: string;
  stripe_payment_intent_id: string | null;
  amount_cents: number;
  currency: string;
  status: EventPaymentStatus;
  created_at: string;
  updated_at: string;
};

export type CloudflareEnv = Cloudflare.Env & {
  SESSION_SECRET: string;
  TELEGRAM_BOT_TOKEN: string;
  TELEGRAM_BOT_USERNAME: string;
  CRON_SECRET?: string;
  STRIPE_SECRET_KEY?: string;
  STRIPE_WEBHOOK_SECRET?: string;
  NEXT_PUBLIC_GOOGLE_MAPS_API_KEY?: string;
  NEXT_PUBLIC_APP_URL?: string;
};
