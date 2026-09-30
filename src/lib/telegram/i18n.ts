import { localeLabel } from "@/lib/locale";
import type { BotLocale } from "@/lib/telegram/types";

const messages = {
  en: {
    welcome:
      "KimKim.uz — who's coming, where to meet, who owes what. /create to start, or type /help.",
    welcomeInvite: (title: string, spots?: string | null) =>
      spots
        ? `You're invited to <b>${title}</b>.\n${spots}\nTap below to RSVP.`
        : `You're invited to <b>${title}</b>. Tap below to RSVP.`,
    inviteNotFound: "This invite link was not found or has expired.",
    joinButton: "Join event",
    rsvpGoing: "I'm coming",
    rsvpMaybe: "Maybe",
    rsvpDeclined: "Can't make it",
    rsvpGoingConfirmed: "You're on the guest list!",
    rsvpAlreadyGoing: "You're already on the guest list.",
    rsvpMaybeConfirmed: "Got it — marked as maybe.",
    rsvpDeclinedConfirmed: "Got it — marked as can't make it.",
    eventFull: "This event is full.",
    rsvpGuestPrompt: (title: string) =>
      `Are you bringing anyone else to <b>${title}</b>?`,
    rsvpGuestOnlyMe: "Only me",
    rsvpGuestSaved: (count: number) =>
      count === 0
        ? "Saved: only you."
        : `Saved: you + ${count} ${count === 1 ? "guest" : "guests"}.`,
    openApp: "Open KimKim.uz",
    help: `<b>KimKim bot</b>

<b>Private chat</b>
/create — new event
/expense — log an expense
/events — upcoming events
/album — add photos, or save everyone else's
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
    loginReady: "You're signed in. Tap below to return to KimKim — we'll finish it on the site.",
    loginAlreadyUsed: "This sign-in was already finished. Open KimKim if you still need the site.",
    loginExpired: "That sign-in request expired. Go back to the site and tap Continue in Telegram again.",
    loginOpenSite: "Open KimKim",
    albumBtn: "Shared photos",
    albumNoEvents: "You're not in an event from the last few months. Join one, then send /album.",
    albumPickEvent: "Which event are these photos for?",
    albumPrompt: (title: string, count: number, limit: number) =>
      `Send photos for <b>${title}</b>.\n${count} of ${limit} in the album.\n\nSend one or several, then /done.`,
    albumSendMore: "Send a photo, or /done when you're finished.",
    albumNeedCommand: "To add photos, send /album and pick the event. Then send the pictures here.",
    albumAdded: (count: number, limit: number) =>
      `Added. The album is ${count} of ${limit}. Send more, or /done.`,
    albumFull: (limit: number) => `This album is full (${limit} photos).`,
    albumNotImage: "Send a photo — other files stay out of the album.",
    albumVideoLater: "Video is planned for a later plan. Send photos for now.",
    albumTooLarge: "That photo is too large. Send it as a photo, not as a file.",
    albumUnreadable: "I couldn't read that photo. Try sending it again as a photo.",
    albumNotMember: "You're not on the guest list for that event.",
    albumDone: (count: number) =>
      count === 1 ? "Saved 1 photo to the album." : `Saved ${count} photos to the album.`,
    albumDoneEmpty: "No new photos. The album is unchanged.",
    albumSaveOthers: "Save others' photos",
    albumSaveEmpty: "No one else has added photos yet.",
    albumSaveSending: (count: number) =>
      count === 1 ? "Sending 1 photo from other guests." : `Sending ${count} photos from other guests.`,
    albumSaveCaption: (title: string) => `Photos from other guests · ${title}`,
    albumSaveFailed: "I couldn't send those photos. Open the event and save them there.",
    albumNeedPrivate: "Open a private chat with me to add or save photos.",
    albumNotify: (name: string, title: string, count: number) =>
      count === 1
        ? `<b>${name}</b> added a photo to <b>${title}</b>.`
        : `<b>${name}</b> added ${count} photos to <b>${title}</b>.`,
  },
  uz: {
    welcome:
      "KimKim.uz — kim keladi, qayerda, pul kimda. /create bilan boshlang yoki /help.",
    welcomeInvite: (title: string, spots?: string | null) =>
      spots
        ? `Sizni <b>${title}</b> ga chaqirishdi.\n${spots}\nQo'shilish uchun tugmani bosing.`
        : `Sizni <b>${title}</b> ga chaqirishdi. Qo'shilish uchun tugmani bosing.`,
    inviteNotFound: "Bu link topilmadi yoki eskirgan.",
    joinButton: "Qo'shilish",
    rsvpGoing: "Kelaman",
    rsvpMaybe: "Balki",
    rsvpDeclined: "Kela olmiman",
    rsvpGoingConfirmed: "Ro'yxatga qo'shildingiz!",
    rsvpAlreadyGoing: "Siz allaqachon ro'yxatdasiz.",
    rsvpMaybeConfirmed: "Tushundik — balki deb belgilandi.",
    rsvpDeclinedConfirmed: "Tushundik — bora olmaysiz deb belgilandi.",
    eventFull: "Bu yig'ilish to'lib bo'ldi.",
    rsvpGuestPrompt: (title: string) =>
      `<b>${title}</b> ga yana kimnidir olib kelasizmi?`,
    rsvpGuestOnlyMe: "Faqat men",
    rsvpGuestSaved: (count: number) =>
      count === 0 ? "Saqlandi: faqat siz." : `Saqlandi: siz + ${count} mehmon.`,
    openApp: "Saytni ochish",
    help: `<b>KimKim bot</b>

<b>Shaxsiy chat</b>
/create — yangi event
/expense — xarajat qo'shish
/events — yaqin eventlar
/album — rasm qo'shish yoki boshqalarnikini saqlash
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
    shareInvite: "Taklifni ulashish",
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
    loginReady: "Kirdingiz. KimKim'ga qaytish uchun pastdagi tugmani bosing — saytda yakunlaymiz.",
    loginAlreadyUsed: "Bu kirish allaqachon yakunlangan. Kerak bo'lsa, KimKim'ni oching.",
    loginExpired: "Bu kirish so'rovi eskirgan. Saytga qaytib, Telegram orqali davom etishni bosing.",
    loginOpenSite: "KimKim'ni ochish",
    albumBtn: "Umumiy rasmlar",
    albumNoEvents: "So'nggi oylarda eventingiz yo'q. Qo'shiling, keyin /album yuboring.",
    albumPickEvent: "Rasmlar qaysi event uchun?",
    albumPrompt: (title: string, count: number, limit: number) =>
      `<b>${title}</b> uchun rasm yuboring.\nAlbomda ${count} / ${limit}.\n\nBir yoki bir nechta rasm yuboring, keyin /done.`,
    albumSendMore: "Rasm yuboring yoki tugatish uchun /done.",
    albumNeedCommand: "Rasm qo'shish uchun /album yuboring va eventni tanlang. Keyin rasmlarni shu yerga yuboring.",
    albumAdded: (count: number, limit: number) =>
      `Qo'shildi. Albom ${count} / ${limit}. Yana yuboring yoki /done.`,
    albumFull: (limit: number) => `Albom to'ldi (${limit} ta rasm).`,
    albumNotImage: "Rasm yuboring — boshqa fayllar albomga tushmaydi.",
    albumVideoLater: "Video keyinroq qo'shiladi. Hozircha rasm yuboring.",
    albumTooLarge: "Rasm juda katta. Uni fayl emas, oddiy rasm sifatida yuboring.",
    albumUnreadable: "Bu rasmni o'qib bo'lmadi. Qayta rasm qilib yuboring.",
    albumNotMember: "Siz bu event mehmonlari ro'yxatida emassiz.",
    albumDone: (count: number) =>
      count === 1 ? "1 ta rasm albomga saqlandi." : `${count} ta rasm albomga saqlandi.`,
    albumDoneEmpty: "Yangi rasm yo'q. Albom o'zgarmadi.",
    albumSaveOthers: "Boshqalarning rasmlari",
    albumSaveEmpty: "Hali boshqalar rasm qo'shmagan.",
    albumSaveSending: (count: number) =>
      count === 1
        ? "Boshqa mehmonlardan 1 ta rasm yuboryapman."
        : `Boshqa mehmonlardan ${count} ta rasm yuboryapman.`,
    albumSaveCaption: (title: string) => `Boshqa mehmonlar rasmlari · ${title}`,
    albumSaveFailed: "Rasmlarni yubora olmadim. Eventni ochib, u yerdan saqlang.",
    albumNeedPrivate: "Rasm qo'shish yoki saqlash uchun menga shaxsiy chatda yozing.",
    albumNotify: (name: string, title: string, count: number) =>
      count === 1
        ? `<b>${name}</b> <b>${title}</b> albomiga rasm qo'shdi.`
        : `<b>${name}</b> <b>${title}</b> albomiga ${count} ta rasm qo'shdi.`,
  },
  ru: {
    welcome:
      "KimKim.uz — кто придёт, где встречаемся, кто кому должен. /create чтобы начать, или /help.",
    welcomeInvite: (title: string, spots?: string | null) =>
      spots
        ? `Вас приглашают на <b>${title}</b>.\n${spots}\nНажмите ниже, чтобы подтвердить участие.`
        : `Вас приглашают на <b>${title}</b>. Нажмите ниже, чтобы подтвердить участие.`,
    inviteNotFound: "Ссылка не найдена или устарела.",
    joinButton: "Присоединиться",
    rsvpGoing: "Приду",
    rsvpMaybe: "Возможно",
    rsvpDeclined: "Не смогу",
    rsvpGoingConfirmed: "Вы в списке гостей!",
    rsvpAlreadyGoing: "Вы уже в списке гостей.",
    rsvpMaybeConfirmed: "Понятно — отметили как возможно.",
    rsvpDeclinedConfirmed: "Понятно — отметили, что не сможете прийти.",
    eventFull: "Мест больше нет.",
    rsvpGuestPrompt: (title: string) =>
      `Берёте кого-нибудь с собой на <b>${title}</b>?`,
    rsvpGuestOnlyMe: "Только я",
    rsvpGuestSaved: (count: number) =>
      count === 0 ? "Сохранено: только вы." : `Сохранено: вы + ${count}.`,
    openApp: "Открыть KimKim.uz",
    help: `<b>Бот KimKim</b>

<b>Личный чат</b>
/create — новое событие
/expense — записать расход
/events — ближайшие события
/album — добавить фото или сохранить чужие
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
    loginReady: "Вы вошли. Нажмите ниже, чтобы вернуться на KimKim — закончим вход на сайте.",
    loginAlreadyUsed: "Этот вход уже завершён. Откройте KimKim, если сайт ещё нужен.",
    loginExpired: "Запрос на вход устарел. Вернитесь на сайт и снова нажмите «Продолжить в Telegram».",
    loginOpenSite: "Открыть KimKim",
    albumBtn: "Общие фото",
    albumNoEvents: "Нет событий за последние месяцы. Сначала присоединитесь, затем отправьте /album.",
    albumPickEvent: "Для какого события эти фото?",
    albumPrompt: (title: string, count: number, limit: number) =>
      `Пришлите фото для <b>${title}</b>.\nВ альбоме ${count} из ${limit}.\n\nМожно несколько сразу, затем /done.`,
    albumSendMore: "Пришлите фото или /done, когда закончите.",
    albumNeedCommand: "Чтобы добавить фото, отправьте /album и выберите событие. Затем пришлите снимки сюда.",
    albumAdded: (count: number, limit: number) =>
      `Добавлено. В альбоме ${count} из ${limit}. Пришлите ещё или /done.`,
    albumFull: (limit: number) => `Альбом заполнен (${limit} фото).`,
    albumNotImage: "Пришлите фото — другие файлы в альбом не попадают.",
    albumVideoLater: "Видео появится в более позднем плане. Пока присылайте фото.",
    albumTooLarge: "Фото слишком большое. Отправьте его как фото, а не файлом.",
    albumUnreadable: "Не получилось прочитать это фото. Отправьте его ещё раз как фото.",
    albumNotMember: "Вас нет в списке гостей этого события.",
    albumDone: (count: number) =>
      count === 1 ? "1 фото сохранено в альбом." : `В альбом сохранено фото: ${count}.`,
    albumDoneEmpty: "Новых фото нет. Альбом без изменений.",
    albumSaveOthers: "Сохранить чужие фото",
    albumSaveEmpty: "Другие гости пока не добавили фото.",
    albumSaveSending: (count: number) =>
      count === 1 ? "Отправляю 1 фото от других гостей." : `Отправляю фото от других гостей: ${count}.`,
    albumSaveCaption: (title: string) => `Фото других гостей · ${title}`,
    albumSaveFailed: "Не удалось отправить фото. Откройте событие и сохраните их там.",
    albumNeedPrivate: "Чтобы добавить или сохранить фото, напишите мне в личном чате.",
    albumNotify: (name: string, title: string, count: number) =>
      count === 1
        ? `<b>${name}</b> добавил(а) фото в <b>${title}</b>.`
        : `<b>${name}</b> добавил(а) ${count} фото в <b>${title}</b>.`,
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
