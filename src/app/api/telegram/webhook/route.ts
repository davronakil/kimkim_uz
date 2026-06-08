import { NextRequest, NextResponse } from "next/server";
import { getEventByInviteCode } from "@/lib/db/queries";
import {
  buildAppUrl,
  parseJoinInviteCode,
  parseStartParam,
  sendTelegramMessage,
} from "@/lib/telegram/bot";
import { linkTelegramChat } from "@/lib/telegram/chat";

type TelegramUpdate = {
  message?: {
    chat: { id: number };
    text?: string;
    from?: {
      id: number;
      first_name: string;
      last_name?: string;
      username?: string;
      language_code?: string;
    };
  };
};

export async function POST(request: NextRequest) {
  let update: TelegramUpdate;
  try {
    update = await request.json();
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const message = update.message;
  if (!message?.text || !message.chat?.id) {
    return NextResponse.json({ ok: true });
  }

  const startParam = parseStartParam(message.text);
  const inviteCode = parseJoinInviteCode(startParam);
  const locale = message.from?.language_code === "uz" ? "uz" : "en";

  try {
    if (message.from) {
      await linkTelegramChat(message.from, message.chat.id);
    }
    if (inviteCode) {
      const event = await getEventByInviteCode(inviteCode);
      if (!event) {
        await sendTelegramMessage(
          message.chat.id,
          locale === "uz"
            ? "Bu link topilmadi yoki eskirgan."
            : "This invite link was not found or has expired.",
        );
        return NextResponse.json({ ok: true });
      }

      const joinUrl = buildAppUrl(`/${locale}/join/${inviteCode}`);
      await sendTelegramMessage(
        message.chat.id,
        locale === "uz"
          ? `Sizni <b>${event.title}</b> eventiga chaqirishdi. Qo'shilish uchun tugmani bosing.`
          : `You're invited to <b>${event.title}</b>. Tap below to join.`,
        {
          parse_mode: "HTML",
          reply_markup: {
            inline_keyboard: [[{ text: locale === "uz" ? "Qo'shilish" : "Join event", url: joinUrl }]],
          },
        },
      );
      return NextResponse.json({ ok: true });
    }

    if (message.text.startsWith("/start")) {
      const homeUrl = buildAppUrl(`/${locale}`);
      await sendTelegramMessage(
        message.chat.id,
        locale === "uz"
          ? "KimKim.uz — event qil, pulni bo'lish. Endi izoh, xarajat va eslatmalar shu yerga keladi."
          : "KimKim.uz — plan events and split expenses with friends. You'll get updates here for comments, expenses, and event reminders.",
        {
          reply_markup: {
            inline_keyboard: [[{ text: locale === "uz" ? "Saytni ochish" : "Open KimKim.uz", url: homeUrl }]],
          },
        },
      );
    }
  } catch (error) {
    console.error("Telegram webhook error:", error);
  }

  return NextResponse.json({ ok: true });
}

export async function GET() {
  return NextResponse.json({ ok: true, service: "kimkim-telegram-webhook" });
}
