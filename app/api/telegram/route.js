/**
 * POST /api/telegram
 * Telegram Bot webhook handler
 *
 * Komutlar:
 *   /tft <GameName#TAG>   → sync + hızlı rapor
 *   /report <GameName#TAG> → detaylı analiz
 *   /sync <GameName#TAG>  → sadece sync
 *   /help                 → komut listesi
 */

import { NextResponse } from 'next/server';
import { getFullProfile, getMatchDetails, getMatchIds, PLATFORM_TO_REGION } from '@/lib/riot';
import { upsertPlayer, getExistingMatchIds, saveMatch, getPlayerParticipants, getPlayerStats } from '@/lib/db';
import { analyzePlayer } from '@/lib/analysis';

const TELEGRAM_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_API   = `https://api.telegram.org/bot${TELEGRAM_TOKEN}`;
const DEFAULT_PLATFORM = process.env.DEFAULT_PLATFORM || 'tr1';

// ── Telegram mesaj gönder ─────────────────────────────────
async function sendMessage(chatId, text, parseMode = 'HTML') {
  await fetch(`${TELEGRAM_API}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id:    chatId,
      text,
      parse_mode: parseMode,
    }),
  });
}

// ── Riot ID parse: "GameName#TAG" → { gameName, tagLine } ─
function parseRiotId(str) {
  if (!str) return null;
  const parts = str.split('#');
  if (parts.length < 2) return null;
  return { gameName: parts[0].trim(), tagLine: parts[1].trim() };
}

// ── Rapor formatla ────────────────────────────────────────
function formatQuickReport(stats, analysis) {
  if (!analysis) return '❌ Yeterli maç verisi yok.';

  const { summary, scores, coachCards, errorPatterns } = analysis;
  const rankStr = stats?.rank_tier
    ? `${stats.rank_tier} ${stats.rank_division} (${stats.lp} LP)`
    : 'Unranked';

  let msg = `
🎮 <b>${stats?.game_name || '?'}#${stats?.tag_line || '?'}</b>
📊 Rank: ${rankStr}

📈 <b>Son ${summary.totalGames} Maç</b>
• Ort. Placement: <b>${summary.avgPlacement}</b>
• Top4: <b>%${summary.top4Pct}</b> | Win: <b>%${summary.winPct}</b>

⚡ Skorlar:
• Tempo: ${scores.tempo}/100
• Econ:  ${scores.econ}/100
• Synergy: ${scores.synergy}/100

`.trim();

  if (coachCards.length) {
    msg += `\n\n🃏 <b>Koç Kartları:</b>`;
    for (const card of coachCards) {
      msg += `\n\n${card.title}\n${card.body}`;
    }
  }

  if (errorPatterns.length) {
    msg += `\n\n⚠️ <b>Dikkat:</b> ${errorPatterns[0].message}`;
  }

  return msg;
}

// ── Webhook handler ───────────────────────────────────────
export async function POST(req) {
  try {
    const update = await req.json();
    const message = update.message || update.edited_message;
    if (!message?.text) return NextResponse.json({ ok: true });

    const chatId = message.chat.id;
    const text   = message.text.trim();
    const [rawCmd, ...argParts] = text.split(' ');
    const cmd  = rawCmd.toLowerCase().replace('@', '').split('@')[0]; // /tft@botname → /tft
    const args = argParts.join(' ').trim();

    // ── /help ─────────────────────────────────────────────
    if (cmd === '/help' || cmd === '/start') {
      await sendMessage(chatId, `
🤖 <b>TFT Coach Bot</b>

Komutlar:
/tft <code>GameName#TAG</code> — Hızlı rapor (sync + özet)
/report <code>GameName#TAG</code> — Detaylı analiz
/sync <code>GameName#TAG</code> — Sadece maç verisi çek
/help — Bu mesaj

Örnek: <code>/tft Faker#KR1</code>
      `.trim());
      return NextResponse.json({ ok: true });
    }

    // ── /sync veya /tft veya /report ─────────────────────
    if (['/tft', '/report', '/sync'].includes(cmd)) {
      const parsed = parseRiotId(args);
      if (!parsed) {
        await sendMessage(chatId, '❌ Format: <code>/tft GameName#TAG</code>');
        return NextResponse.json({ ok: true });
      }

      await sendMessage(chatId, `⏳ <b>${parsed.gameName}#${parsed.tagLine}</b> için veri çekiliyor...`);

      // Profil + sync
      const platform = DEFAULT_PLATFORM;
      const region   = PLATFORM_TO_REGION[platform] || 'europe';

      const profile = await getFullProfile(parsed.gameName, parsed.tagLine, platform);
      if (!profile) {
        await sendMessage(chatId, `❌ Oyuncu bulunamadı: <b>${parsed.gameName}#${parsed.tagLine}</b>`);
        return NextResponse.json({ ok: true });
      }

      await upsertPlayer(profile);

      // Yeni maçları çek
      const allIds      = profile.recentMatchIds || [];
      const existingSet = await getExistingMatchIds(allIds);
      const newIds      = allIds.filter((id) => !existingSet.has(id));

      let synced = 0;
      if (newIds.length) {
        const details = await getMatchDetails(newIds.slice(0, 10), region); // max 10 Telegram'da
        for (const matchJson of details) {
          try {
            await saveMatch(matchJson);
            synced++;
          } catch (_) {}
        }
      }

      if (cmd === '/sync') {
        await sendMessage(chatId, `✅ Sync tamamlandı. ${synced} yeni maç kaydedildi.`);
        return NextResponse.json({ ok: true });
      }

      // Rapor oluştur
      const [participants, stats] = await Promise.all([
        getPlayerParticipants(profile.puuid, 20),
        getPlayerStats(profile.puuid),
      ]);

      const analysis = analyzePlayer(participants);
      const reportMsg = formatQuickReport(stats || {
        game_name: profile.gameName,
        tag_line:  profile.tagLine,
        rank_tier: profile.rank?.tier,
        rank_division: profile.rank?.division,
        lp: profile.rank?.lp,
      }, analysis);

      await sendMessage(chatId, reportMsg);
      return NextResponse.json({ ok: true });
    }

    // Bilinmeyen komut
    return NextResponse.json({ ok: true });

  } catch (err) {
    console.error('[telegram] Hata:', err);
    return NextResponse.json({ ok: true }); // Telegram'a her zaman 200 dön
  }
}
