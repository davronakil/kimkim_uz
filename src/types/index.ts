export type User = {
  id: string;
  telegram_id: string;
  telegram_chat_id: string | null;
  username: string | null;
  first_name: string;
  last_name: string | null;
  photo_url: string | null;
  language_code: string;
  payout_method: string | null;
  payout_details: string | null;
  payout_updated_at: string | null;
  created_at: string;
  updated_at: string;
};

export type EventMember = User & {
  role: "owner" | "member";
  rsvp_status: EventRsvpStatus | null;
};

export type EventRsvpStatus = "going" | "maybe" | "declined";
export type EventNotificationMode = "instant" | "digest" | "muted";

export type EventPaymentMode = "free" | "split" | "pay_yourself" | "paid";
export type EventVisibility = "private" | "public";

export type BusinessListingStatus = "pending" | "approved" | "rejected";

export type BusinessListing = {
  id: string;
  representative_user_id: string;
  name: string;
  description: string | null;
  category: string;
  phone: string | null;
  telegram_username: string | null;
  website_url: string | null;
  location_name: string | null;
  location_address: string | null;
  location_lat: number | null;
  location_lng: number | null;
  cover_image_key: string | null;
  status: BusinessListingStatus;
  rejection_reason: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  published_at: string | null;
  created_at: string;
  updated_at: string;
};

export type BusinessListingEntitlement = {
  user_id: string;
  included_slots: number;
  paid_slots: number;
  updated_at: string;
};

export type PlatformAdmin = {
  user_id: string;
  role: "admin" | "superadmin";
  granted_by: string | null;
  created_at: string;
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
  payment_mode: EventPaymentMode;
  ticket_price_cents: number | null;
  ticket_currency: string;
  invite_code: string | null;
  visibility: EventVisibility;
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
export type EventPaymentSource = "stripe" | "manual";

export type EventPayment = {
  id: string;
  event_id: string;
  user_id: string;
  stripe_checkout_session_id: string | null;
  stripe_payment_intent_id: string | null;
  amount_cents: number;
  currency: string;
  status: EventPaymentStatus;
  source: EventPaymentSource;
  marked_by_user_id: string | null;
  note: string | null;
  created_at: string;
  updated_at: string;
};

export type EventPaymentSummary = {
  user_id: string;
  amount_cents: number;
  currency: string;
  status: EventPaymentStatus;
  source: EventPaymentSource;
  note: string | null;
  updated_at: string;
};

export type CloudflareEnv = Cloudflare.Env & {
  SESSION_SECRET: string;
  TELEGRAM_BOT_TOKEN: string;
  TELEGRAM_BOT_USERNAME: string;
  CRON_SECRET?: string;
  STRIPE_SECRET_KEY?: string;
  STRIPE_WEBHOOK_SECRET?: string;
  BUSINESS_EXTRA_SLOT_PRICE_CENTS?: string;
  BUSINESS_EXTRA_SLOT_CURRENCY?: string;
  NEXT_PUBLIC_GOOGLE_MAPS_API_KEY?: string;
  NEXT_PUBLIC_APP_URL?: string;
};
