import type { Locale } from "@/i18n/config";

export type BotLocale = Locale;

export type TelegramUser = {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  language_code?: string;
};

export type TelegramChat = {
  id: number;
  type?: "private" | "group" | "supergroup" | "channel";
  title?: string;
};

export type TelegramLocation = {
  latitude: number;
  longitude: number;
};

export type TelegramVenue = {
  title: string;
  address?: string;
};

export type TelegramMessage = {
  chat: TelegramChat;
  message_id?: number;
  text?: string;
  from?: TelegramUser;
  location?: TelegramLocation;
  venue?: TelegramVenue;
  new_chat_members?: Array<{
    id: number;
    is_bot?: boolean;
    username?: string;
    first_name: string;
  }>;
};

export type TelegramCallbackQuery = {
  id: string;
  from: TelegramUser;
  message?: TelegramMessage & { message_id: number };
  data?: string;
};

export type TelegramUpdate = {
  message?: TelegramMessage;
  callback_query?: TelegramCallbackQuery;
};

export type BotSessionFlow = "create_event" | "log_expense";

export type CreateEventSessionData = {
  title?: string;
  startsAt?: string;
  description?: string | null;
  locationName?: string | null;
  locationLat?: number | null;
  locationLng?: number | null;
};

export type ExpenseSessionData = {
  eventId?: string;
};

export type BotSession = {
  chat_id: string;
  user_id: string;
  flow: BotSessionFlow | null;
  step: string | null;
  data: string;
  locale: BotLocale;
  updated_at: string;
};
