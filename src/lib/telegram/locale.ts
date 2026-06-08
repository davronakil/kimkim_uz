import type { Locale } from "@/i18n/config";
import { isLocale, resolveLocaleFromTelegramCode, resolveUserLocale } from "@/lib/locale";
import type { User } from "@/types";
import type { BotLocale, TelegramUser } from "@/lib/telegram/types";

export function resolveBotLocale(from?: TelegramUser, user?: User | null): BotLocale {
  return resolveUserLocale(user, from?.language_code);
}

export function parseLangCommand(text: string): BotLocale | null {
  const match = text.match(/^\/lang(?:@\w+)?\s+(en|uz|ru)\s*$/i);
  if (!match) return null;
  const code = match[1].toLowerCase();
  return isLocale(code) ? code : null;
}

export function mapTelegramToAppLocale(code?: string | null): BotLocale {
  return resolveLocaleFromTelegramCode(code);
}

export type JoinStartParam = {
  inviteCode: string;
  locale?: BotLocale;
};

export function parseJoinStartParam(startParam: string | null): JoinStartParam | null {
  if (!startParam) return null;

  const withLocale = startParam.match(/^(en|uz|ru)_join_(.+)$/i);
  if (withLocale) {
    const locale = withLocale[1].toLowerCase();
    if (isLocale(locale)) {
      return { locale, inviteCode: withLocale[2] };
    }
  }

  const legacy = startParam.match(/^join_(.+)$/i);
  if (legacy) {
    return { inviteCode: legacy[1] };
  }

  return null;
}

/** Read locale prefix from a KimKim web path, e.g. /ru/join/abc → ru */
export function parseLocaleFromAppPath(path: string): BotLocale | null {
  const match = path.match(/^\/(en|uz|ru)(?:\/|$)/i);
  if (!match) return null;
  const code = match[1].toLowerCase();
  return isLocale(code) ? code : null;
}
