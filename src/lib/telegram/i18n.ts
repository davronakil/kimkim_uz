import { localeLabel } from "@/lib/locale";
import type { BotLocale } from "@/lib/telegram/types";

const messages = {
  en: {
    welcome:
      "KimKim.uz — plan events and split expenses. Use the commands below or just type naturally.",
    welcomeInvite: (title: string) =>
      `You're invited to <b>${title}</b>. Tap a button to RSVP.`,
    inviteNotFound: "This invite link was not found or has expired.",
    joinButton: "Join event",
    rsvpGoing: "I'm coming",
    rsvpDeclined: "Can't make it",
    rsvpGoingConfirmed: "You're on the guest list!",
    rsvpAlreadyGoing: "You're already on the guest list.",
    rsvpDeclinedConfirmed: "Got it — marked as can't make it.",
    openApp: "Open KimKim.uz",
    help: `<b>KimKim bot</b>

<b>Private chat</b>
/create — new event
/expense — log an expense
/events — upcoming events
/cancel — stop current flow
/lang en, /lang uz, or /lang ru

<b>In a group</b> (organizer only)
/link INVITE_CODE — connect group
/unlink — disconnect
/event — show linked event`,
    cancelled: "Cancelled. What would you like to do next?",
    unknown: 'Type /help for commands, or /create to start a new event.',
    langSet: (locale: BotLocale) => `Language set to ${localeLabel(locale)}.`,
    langUsage: "Choose a language below, or type /lang en, /lang uz, or /lang ru",
    chooseLanguage: "Choose your language:",
    createEventBtn: "Create event",
    createAskTitle: "What's the event called? (e.g. Gap circle, Wedding, Choyxona night)",
    createAskDatetime:
      "When does it start?\n\nExamples:\n• <code>tomorrow 19:00</code>\n• <code>15.06.2026 19:00</code>\n• <code>2026-06-15 19:00</code>",
    createAskDescription:
      'Any notes for guests? (dress code, etc.)\nSend <code>skip</code> to leave blank.',
    createAskLocation:
      'Where is it? Send a place name, share a location pin 📍, or <code>skip</code>.',
    createLocationTooShort: "Location needs at least 2 characters, or send skip.",
    createInvalidDatetime:
      "Couldn't read that date. Try: tomorrow 19:00, 15.06.2026 19:00, or 2026-06-15 19:00",
    createTitleTooShort: "Title needs at least 2 characters. Try again:",
    createSuccess: (title: string, when: string) =>
      `Done! <b>${title}</b> is on the calendar for ${when}.`,
    openEvent: "Open event",
    shareInvite: "Share invite",
    noEvents: "No upcoming events. Type /create to plan one.",
    eventsHeader: "<b>Your upcoming events</b>",
    eventLine: (title: string, when: string) => `• <b>${title}</b> — ${when}`,
    moreEvents: (count: number) => `…and ${count} more on kimkim.uz`,
    expenseAskAmount: (title: string) =>
      `Log expense for <b>${title}</b>.\n\nSend amount + description:\n<code>150000 choyxona bill</code>`,
    expenseInvalidFormat: "Use: AMOUNT description — e.g. <code>150000 choyxona</code>",
    expenseLogged: (description: string, amount: string, title: string) =>
      `Logged <b>${amount}</b> for "${description}" in <b>${title}</b> (split equally).`,
    expenseNoEvents: "You're not in any upcoming events. Join one first.",
    expenseNoMembers: "No members to split with yet.",
    expensePickEvent: "Which event is this expense for?",
    expensePickEventDone: "Now send amount + description.",
    expenseNotMember: "You're not a member of that event.",
  },
  uz: {
    welcome:
      "KimKim.uz — event qil, pulni bo'lish. Buyruqlar yoki oddiy matn bilan yozing.",
    welcomeInvite: (title: string) =>
      `Sizni <b>${title}</b> eventiga chaqirishdi. RSVP uchun tugmani bosing.`,
    inviteNotFound: "Bu link topilmadi yoki eskirgan.",
    joinButton: "Qo'shilish",
    rsvpGoing: "Kelaman",
    rsvpDeclined: "Bora olmayman",
    rsvpGoingConfirmed: "Ro'yxatga qo'shildingiz!",
    rsvpAlreadyGoing: "Siz allaqachon ro'yxatdasiz.",
    rsvpDeclinedConfirmed: "Tushundik — bora olmaysiz deb belgilandi.",
    openApp: "Saytni ochish",
    help: `<b>KimKim bot</b>

<b>Shaxsiy chat</b>
/create — yangi event
/expense — xarajat qo'shish
/events — yaqin eventlar
/cancel — bekor qilish
/lang uz, /lang en yoki /lang ru

<b>Guruhda</b> (faqat organizator)
/link INVITE_CODE — guruhni ulash
/unlink — uzish
/event — ulangan event`,
    cancelled: "Bekor qilindi. Keyin nima qilamiz?",
    unknown: '/help — buyruqlar, /create — yangi event.',
    langSet: (locale: BotLocale) => `Til: ${localeLabel(locale)}.`,
    langUsage: "Tilni tanlang yoki yozing: /lang uz, /lang en, /lang ru",
    chooseLanguage: "Tilingizni tanlang:",
    createEventBtn: "Event yaratish",
    createAskTitle: "Event nomi nima? (masalan: Gap, To'y, Choyxona)",
    createAskDatetime:
      "Qachon boshlanadi?\n\nMasalan:\n• <code>ertaga 19:00</code>\n• <code>15.06.2026 19:00</code>\n• <code>2026-06-15 19:00</code>",
    createAskDescription:
      "Mehmonlar uchun izoh? (dress code)\nBo'sh qoldirish uchun <code>skip</code> yozing.",
    createAskLocation:
      "Qayerda? Joy nomi, lokatsiya pin 📍 yuboring yoki <code>skip</code>.",
    createLocationTooShort: "Kamida 2 harf yoki skip yozing.",
    createInvalidDatetime:
      "Sana tushunilmadi. Urinib ko'ring: ertaga 19:00, 15.06.2026 19:00",
    createTitleTooShort: "Kamida 2 harf kerak. Yana yozing:",
    createSuccess: (title: string, when: string) =>
      `Tayyor! <b>${title}</b> — ${when}.`,
    openEvent: "Eventni ochish",
    shareInvite: "Invite share",
    noEvents: "Yaqin event yo'q. /create bilan yarating.",
    eventsHeader: "<b>Yaqin eventlar</b>",
    eventLine: (title: string, when: string) => `• <b>${title}</b> — ${when}`,
    moreEvents: (count: number) => `…yana ${count} ta kimkim.uz da`,
    expenseAskAmount: (title: string) =>
      `<b>${title}</b> uchun xarajat.\n\nSumma + izoh yuboring:\n<code>150000 choyxona</code>`,
    expenseInvalidFormat: "Format: SUMMA izoh — masalan <code>150000 choyxona</code>",
    expenseLogged: (description: string, amount: string, title: string) =>
      `<b>${title}</b> ga <b>${amount}</b> — "${description}" (teng bo'lish).`,
    expenseNoEvents: "Yaqin eventda emassiz. Avval qo'shiling.",
    expenseNoMembers: "Bo'linadigan a'zo yo'q.",
    expensePickEvent: "Qaysi event uchun?",
    expensePickEventDone: "Endi summa + izoh yuboring.",
    expenseNotMember: "Siz bu event a'zosi emassiz.",
  },
  ru: {
    welcome:
      "KimKim.uz — планируйте события и делите расходы. Команды ниже или просто напишите текстом.",
    welcomeInvite: (title: string) =>
      `Вас приглашают на <b>${title}</b>. Нажмите кнопку, чтобы ответить.`,
    inviteNotFound: "Ссылка не найдена или устарела.",
    joinButton: "Присоединиться",
    rsvpGoing: "Приду",
    rsvpDeclined: "Не смогу",
    rsvpGoingConfirmed: "Вы в списке гостей!",
    rsvpAlreadyGoing: "Вы уже в списке гостей.",
    rsvpDeclinedConfirmed: "Понятно — отметили, что не сможете прийти.",
    openApp: "Открыть KimKim.uz",
    help: `<b>Бот KimKim</b>

<b>Личный чат</b>
/create — новое событие
/expense — записать расход
/events — ближайшие события
/cancel — отменить текущее действие
/lang ru, /lang en или /lang uz

<b>В группе</b> (только организатор)
/link INVITE_CODE — привязать группу
/unlink — отвязать
/event — показать событие`,
    cancelled: "Отменено. Что дальше?",
    unknown: "Напишите /help для списка команд или /create для нового события.",
    langSet: (locale: BotLocale) => `Язык: ${localeLabel(locale)}.`,
    langUsage: "Выберите язык ниже или напишите: /lang ru, /lang en, /lang uz",
    chooseLanguage: "Выберите язык:",
    createEventBtn: "Создать событие",
    createAskTitle: "Как называется событие? (например: Гяп, Свадьба, Чайхана)",
    createAskDatetime:
      "Когда начинается?\n\nПримеры:\n• <code>завтра 19:00</code>\n• <code>15.06.2026 19:00</code>\n• <code>2026-06-15 19:00</code>",
    createAskDescription:
      "Заметки для гостей? (дресс-код и т.д.)\nНапишите <code>skip</code>, чтобы пропустить.",
    createAskLocation:
      "Где проходит? Название места, метка на карте 📍 или <code>skip</code>.",
    createLocationTooShort: "Нужно минимум 2 символа или напишите skip.",
    createInvalidDatetime:
      "Не удалось распознать дату. Попробуйте: завтра 19:00, 15.06.2026 19:00 или 2026-06-15 19:00",
    createTitleTooShort: "Нужно минимум 2 символа. Попробуйте снова:",
    createSuccess: (title: string, when: string) =>
      `Готово! <b>${title}</b> — ${when}.`,
    openEvent: "Открыть событие",
    shareInvite: "Поделиться приглашением",
    noEvents: "Нет ближайших событий. Напишите /create, чтобы создать.",
    eventsHeader: "<b>Ваши ближайшие события</b>",
    eventLine: (title: string, when: string) => `• <b>${title}</b> — ${when}`,
    moreEvents: (count: number) => `…и ещё ${count} на kimkim.uz`,
    expenseAskAmount: (title: string) =>
      `Расход для <b>${title}</b>.\n\nОтправьте сумму и описание:\n<code>150000 счёт в чайхане</code>`,
    expenseInvalidFormat: "Формат: СУММА описание — например <code>150000 чайхана</code>",
    expenseLogged: (description: string, amount: string, title: string) =>
      `Записано <b>${amount}</b> — «${description}» в <b>${title}</b> (поровну).`,
    expenseNoEvents: "Вы не участвуете в ближайших событиях. Сначала присоединитесь.",
    expenseNoMembers: "Пока нет участников для разделения.",
    expensePickEvent: "Для какого события этот расход?",
    expensePickEventDone: "Теперь отправьте сумму и описание.",
    expenseNotMember: "Вы не участник этого события.",
  },
} as const;

export function t(locale: BotLocale) {
  return messages[locale];
}

export function formatEventWhen(iso: string, locale: BotLocale) {
  const date = new Date(iso);
  return date.toLocaleString(
    locale === "uz" ? "uz-UZ" : locale === "ru" ? "ru-RU" : "en-US",
    {
      dateStyle: "medium",
      timeStyle: "short",
      timeZone: "Asia/Tashkent",
    },
  );
}
