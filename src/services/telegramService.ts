/**
 * telegramService — envía mensajes al chat de admin vía Bot API.
 * Fire-and-forget: nunca lanza excepciones para no bloquear el flujo principal.
 */

const BOT_TOKEN = process.env.TELEGRAM_NOTIF_BOT_TOKEN;
const ADMIN_CHAT_ID = process.env.TELEGRAM_ADMIN_CHAT_ID;

export async function sendTelegramMessage(text: string): Promise<void> {
  if (!BOT_TOKEN || !ADMIN_CHAT_ID) return;
  try {
    await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: ADMIN_CHAT_ID,
        text,
        parse_mode: 'HTML',
      }),
    });
  } catch {
    // silent — nunca bloquear el flujo principal
  }
}
