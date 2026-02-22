/**
 * Telegram webhook kayıt scripti
 * Kullanım: node scripts/setup-telegram.js
 *
 * Vercel deploy URL'ini VERCEL_URL env'e koy veya aşağıda elle yaz.
 */

const TOKEN   = process.env.TELEGRAM_BOT_TOKEN;
const APP_URL = process.env.VERCEL_URL || 'https://YOUR-APP.vercel.app';

async function registerWebhook() {
  if (!TOKEN) {
    console.error('❌ TELEGRAM_BOT_TOKEN env eksik!');
    process.exit(1);
  }

  const webhookUrl = `${APP_URL}/api/telegram`;
  const apiUrl = `https://api.telegram.org/bot${TOKEN}/setWebhook`;

  const res = await fetch(apiUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      url:             webhookUrl,
      allowed_updates: ['message', 'edited_message'],
      drop_pending_updates: true,
    }),
  });

  const data = await res.json();

  if (data.ok) {
    console.log(`✅ Webhook kaydedildi: ${webhookUrl}`);
  } else {
    console.error('❌ Webhook kaydı başarısız:', data);
  }
}

registerWebhook();
