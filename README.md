# ♟️ TFT Coach — Kişisel TFT Koçluk Uygulaması

Next.js 14 + Supabase + Vercel + Telegram Bot

---

## Kurulum (5 Adım)

### 1. Supabase
1. [supabase.com](https://supabase.com) → Yeni proje oluştur
2. SQL Editor → `supabase/schema.sql` içeriğini çalıştır
3. Settings → API → URL ve anahtarları kopyala

### 2. .env.local
```bash
cp .env.example .env.local
# Değerleri doldur:
# RIOT_API_KEY, NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
# TELEGRAM_BOT_TOKEN, DEFAULT_PLATFORM
```

### 3. Yerel Çalıştırma
```bash
npm install
npm run dev
# → http://localhost:3000
```

### 4. Vercel Deploy
```bash
# Vercel CLI ile:
vercel
# Environment variables'ları Vercel dashboard'dan da ekleyebilirsin
```

### 5. Telegram Webhook
```bash
# Deploy sonrası:
VERCEL_URL=https://your-app.vercel.app npm run setup-telegram
```

---

## API Endpoints

| Endpoint | Method | Açıklama |
|---|---|---|
| `/api/tft/sync` | POST | Riot API'dan maç verisi çek, DB'ye kaydet |
| `/api/tft/report?puuid=...` | GET | Koçluk raporu döner |
| `/api/tft/cron` | GET | Tüm oyuncuları toplu sync (Vercel Cron) |
| `/api/telegram` | POST | Telegram bot webhook |

### /api/tft/sync Body
```json
{
  "gameName": "NickAdi",
  "tagLine": "TR1",
  "platform": "tr1",
  "count": 20
}
```

---

## Telegram Komutları

```
/tft GameName#TAG     → Sync + hızlı rapor
/report GameName#TAG  → Detaylı analiz
/sync GameName#TAG    → Sadece maç verisi çek
/help                 → Komut listesi
```

---

## Rate Limit Stratejisi

- **Dev Key**: 20 req/s | 100 req/2min
- Token bucket ile otomatik throttle (`lib/riot.js`)
- 429 gelince `Retry-After` header'ına göre bekle
- In-memory cache (5 dk TTL) — tekrar istekleri engeller
- Cron: 6 saatte bir, max 10 yeni maç/oyuncu

---

## Metrikler

| Metrik | Açıklama | Formül |
|---|---|---|
| **Tempo** | Level hızı | level/9 × 60% + last_round/28 × 40% |
| **Econ** | Gold verimliliği | (100 - gold_left×4) × 80% + top4 bonus |
| **Synergy** | Trait aktivasyonu | Her aktif trait'in tier'ı × 15 |

---

## Proje Yapısı

```
tft-coach/
├── app/
│   ├── page.jsx              # Ana dashboard
│   ├── layout.jsx
│   └── api/
│       ├── tft/sync/         # Maç senkronizasyonu
│       ├── tft/report/       # Koçluk raporu
│       ├── tft/cron/         # Otomatik sync
│       └── telegram/         # Bot webhook
├── lib/
│   ├── riot.js               # Riot API client
│   ├── db.js                 # Supabase client
│   └── analysis.js           # Analiz motoru
├── supabase/
│   └── schema.sql            # DB şeması
├── scripts/
│   └── setup-telegram.js     # Webhook kayıt
└── .env.example
```
