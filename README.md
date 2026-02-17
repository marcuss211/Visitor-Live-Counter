Live Active Users Counter

iGaming temalı, gerçek zamanlı aktif kullanıcı sayacı. Tüm bağlı istemcilerde senkronize çalışır. Server-Sent Events (SSE) ile saniyede 1 güncelleme gönderir, bağlantı koparsa otomatik olarak polling moduna geçer.

---

## İçindekiler

1. [Genel Bakış](#genel-bakış)
2. [Özellikler](#özellikler)
3. [Mimari](#mimari)
4. [Kurulum](#kurulum)
5. [Çalıştırma](#çalıştırma)
6. [API Referansı](#api-referansı)
7. [Sayı Hesaplama Algoritması](#sayı-hesaplama-algoritması)
8. [Frontend Bileşenleri](#frontend-bileşenleri)
9. [CSS Yapısı ve Responsive Tasarım](#css-yapısı-ve-responsive-tasarım)
10. [Performans Optimizasyonları](#performans-optimizasyonları)
11. [Erişilebilirlik](#erişilebilirlik)
12. [Kendi Projenize Entegrasyon](#kendi-projenize-entegrasyon)
13. [Ortam Değişkenleri](#ortam-değişkenleri)
14. [Proje Dosya Yapısı](#proje-dosya-yapısı)
15. [SSS (Sık Sorulan Sorular)](#sss-sık-sorulan-sorular)
16. [Lisans](#lisans)

---

## Genel Bakış

Bu proje, bir iGaming (online bahis) sitesi için tasarlanmış **canlı aktif kullanıcı sayacı** bileşenidir. Sayaç, İstanbul zaman dilimine göre deterministik olarak hesaplanan kullanıcı sayısını gösterir. Veritabanı gerektirmez; tüm sayılar sunucu saatinden türetilir.

**Demo Akışı:**
```
Kullanıcı sayfayı açar
  → Tarayıcı SSE bağlantısı kurar (/events)
    → Sunucu her saniye yeni sayıyı hesaplar
      → Tüm bağlı istemcilere aynı anda yayınlar
        → Sayaç güncellenir, artış varsa yeşil glow efekti tetiklenir
```

---

## Özellikler

| Özellik | Açıklama |
|---------|----------|
| **Gerçek Zamanlı Güncelleme** | SSE ile saniyede 1 güncelleme, tüm istemciler aynı sayıyı görür |
| **Otomatik Fallback** | SSE bağlantısı koparsa 1 saniye aralıklarla polling'e geçer, 5 saniye sonra SSE'yi tekrar dener |
| **Deterministik Hesaplama** | Aynı zaman diliminde her sunucu aynı sayıyı üretir, veritabanı gerekmez |
| **İstanbul Saat Dilimi** | Saat aralıklarına göre farklı kullanıcı yoğunlukları (03:00-06:00 en düşük, 20:00-23:00 en yüksek) |
| **Hafta Sonu Artışı** | Cumartesi ve Pazar günleri tüm değerler %20 artar |
| **Trigonometrik Dalgalanma** | `sin()` ve `cos()` ile doğal görünümlü dalgalanma |
| **Türkçe Sayı Formatı** | `tr-TR` locale ile noktalı format (örn: 4.250) |
| **Yeşil Glow Efekti** | Sayı arttığında 1.5 saniye boyunca yeşil parıltı, throttle ile titreme önlenir |
| **Mobile-First Responsive** | 320px'den 1280px+'ya kadar `clamp()` ile akıcı ölçekleme |
| **iPhone Safe Area** | Çentik (notch) ve Dynamic Island desteği |
| **Rate Limiting** | IP başına dakikada 60 istek sınırı |
| **Reduced Motion** | `prefers-reduced-motion` medya sorgusunu destekler |

---

## Mimari

```
┌─────────────────────────────────────────────────┐
│                    TARAYICI                       │
│                                                   │
│  useActiveUsers() hook                            │
│    ├─ EventSource("/events")  ← SSE bağlantısı   │
│    ├─ fetch("/api/active-users") ← Fallback       │
│    ├─ slotKey karşılaştırması (dedup)             │
│    └─ glow throttle (1.5s)                        │
│                                                   │
│  Home bileşeni                                    │
│    ├─ Header (VEVOB | BAHİS)                     │
│    ├─ Slider/Hero                                 │
│    ├─ Live Users Pill  ← Sayaç burada            │
│    ├─ Promo Cards (3 adet)                        │
│    └─ Footer                                      │
└───────────────────┬─────────────────────────────┘
                    │ SSE / HTTP
┌───────────────────▼─────────────────────────────┐
│                    SUNUCU                         │
│                                                   │
│  Express.js                                       │
│    ├─ GET /events          → SSE stream           │
│    ├─ GET /api/active-users → JSON snapshot       │
│    └─ GET /health          → Sağlık kontrolü      │
│                                                   │
│  activeUsers.ts (Motor)                           │
│    ├─ getIstanbulTime()    → Saat/dakika/saniye   │
│    ├─ getHourRange()       → min/max/base aralığı │
│    ├─ computeActiveUsers() → Deterministik sayı   │
│    ├─ slotStore (Map)      → Son 10 slot cache    │
│    ├─ sseClients (Set)     → Bağlı istemciler     │
│    └─ setInterval(1000ms)  → Broadcast döngüsü    │
│                                                   │
│  Rate Limiter                                     │
│    └─ IP başına 60 req/dakika                     │
└─────────────────────────────────────────────────┘
```

### Teknoloji Yığını

| Katman | Teknoloji |
|--------|-----------|
| Frontend | React 18, TypeScript, Vite |
| Backend | Express 5, TypeScript, Node.js |
| Gerçek Zamanlı | Server-Sent Events (SSE) |
| Stil | Vanilla CSS (custom iGaming dark theme) |
| Build | esbuild (production), Vite (development) |

---

## Kurulum

### Gereksinimler

- Node.js 20+
- npm 9+

### Adımlar

```bash
# 1. Repoyu klonlayın
git clone https://github.com/KULLANICI_ADINIZ/vevob-bahis-live-counter.git
cd vevob-bahis-live-counter

# 2. Bağımlılıkları yükleyin
npm install

# 3. Geliştirme sunucusunu başlatın
npm run dev
```

Uygulama varsayılan olarak `http://localhost:5000` adresinde çalışır.

### Production Build

```bash
# Build oluştur
npm run build

# Production modda çalıştır
npm start
```

---

## Çalıştırma

### Geliştirme Modu

```bash
npm run dev
```

- Hot Module Replacement (HMR) aktif
- Vite dev server frontend'i, Express backend'i aynı portta (5000) sunar
- Dosya değişikliklerinde otomatik yenileme

### Production Modu

```bash
npm run build && npm start
```

- Frontend statik dosyalar olarak `dist/public` klasörüne derlenir
- Express bu dosyaları statik olarak sunar
- `NODE_ENV=production` otomatik ayarlanır

---

## API Referansı

### `GET /api/active-users`

Mevcut aktif kullanıcı sayısını JSON olarak döndürür.

**Yanıt:**
```json
{
  "value": 4250,
  "slotKey": 1770825000,
  "serverTime": "2026-02-11T18:50:00.000Z",
  "tz": "Europe/Istanbul"
}
```

| Alan | Tip | Açıklama |
|------|-----|----------|
| `value` | number | Hesaplanan aktif kullanıcı sayısı (900-5800 arası, hafta sonu 1080-6960) |
| `slotKey` | number | 1 saniyelik zaman dilimi kimliği (`Math.floor(Date.now() / 1000)`) |
| `serverTime` | string | İstanbul saat dilimindeki sunucu zamanı (ISO 8601) |
| `tz` | string | Zaman dilimi tanımlayıcısı, her zaman `"Europe/Istanbul"` |

**Rate Limit:** IP başına dakikada 60 istek. Aşıldığında `429 Too Many Requests` döner.

---

### `GET /events`

Server-Sent Events (SSE) akışı. Her saniye yeni veri gönderir.

**Bağlantı:**
```javascript
const es = new EventSource("/events");
es.onmessage = (event) => {
  const data = JSON.parse(event.data);
  console.log("Aktif kullanıcı:", data.value);
};
```

**SSE Mesaj Formatı:**
```
data: {"value":4250,"slotKey":1770825000,"serverTime":"2026-02-11T18:50:00.000Z","tz":"Europe/Istanbul"}
```

**Özellikler:**
- 30 saniyede bir `:ping` keep-alive mesajı gönderir
- `X-Accel-Buffering: no` header'ı ile Nginx proxy uyumlu
- İstemci bağlantıyı kapattığında otomatik temizleme

---

### `GET /health`

Sunucu sağlık kontrolü.

**Yanıt:**
```json
{
  "status": "ok",
  "uptime": 3600.5,
  "sseClients": 42
}
```

---

## Sayı Hesaplama Algoritması

Aktif kullanıcı sayısı tamamen deterministiktir. Aynı zaman diliminde çalışan her sunucu aynı sayıyı üretir.

### Saat Aralıkları (İstanbul Saati)

| Saat Aralığı | Min | Max | Base | Açıklama |
|-------------|-----|-----|------|----------|
| 00:00 - 03:00 | 2.800 | 4.200 | 3.500 | Gece kuşları |
| 03:00 - 06:00 | 900 | 1.800 | 1.350 | En düşük trafik |
| 06:00 - 09:00 | 1.300 | 2.200 | 1.750 | Sabah uyanış |
| 09:00 - 12:00 | 1.900 | 3.000 | 2.450 | Sabah trafiği |
| 12:00 - 15:00 | 2.400 | 3.500 | 2.950 | Öğlen molası |
| 15:00 - 18:00 | 3.000 | 4.200 | 3.600 | Öğleden sonra |
| 18:00 - 20:00 | 3.800 | 5.000 | 4.400 | Akşam yoğunluğu |
| 20:00 - 23:00 | 4.500 | 5.800 | 5.150 | Pik saat (en yüksek) |
| 23:00 - 00:00 | 3.400 | 4.600 | 4.000 | Gece geçişi |

### Hafta Sonu Artışı

Cumartesi ve Pazar günlerinde tüm `min`, `max` ve `base` değerleri **%20 artırılır**:

```typescript
if (isWeekend) {
  min = Math.round(min * 1.2);   // 900 → 1080
  max = Math.round(max * 1.2);   // 5800 → 6960
  base = Math.round(base * 1.2); // 5150 → 6180
}
```

### Trigonometrik Dalgalanma

Sayının doğal görünmesi için iki sinüzoidal dalga eklenir:

```typescript
const fluctuation =
  Math.sin((hour * 60 + minute) * 0.07) * 250 +   // Yavaş dalga (±250)
  Math.cos((minute * 60 + second) * 0.03) * 150;   // Hızlı dalga (±150)
```

- **Yavaş dalga:** Saat ve dakikaya bağlı, geniş salınım
- **Hızlı dalga:** Dakika ve saniyeye bağlı, saniye bazında mikro hareket

Sonuç `min`-`max` aralığına ve minimum 900'e clamp edilir.

### Slot Sistemi

Her 1 saniye bir "slot" oluşturur:

```typescript
const SLOT_LENGTH_MS = 1000;
slotKey = Math.floor(Date.now() / SLOT_LENGTH_MS);
```

- Aynı slot içinde aynı değer döner (cache'lenir)
- Son 10 slot bellekte tutulur, eskiler temizlenir
- İstemci tarafında `slotKey` karşılaştırması ile tekrarlı güncellemeler atlanır

---

## Frontend Bileşenleri

### `useActiveUsers()` Hook

Tüm gerçek zamanlı mantığı kapsüller:

```typescript
const { displayValue, isGlowing } = useActiveUsers();
// displayValue: "4.250" (Türkçe formatlı string)
// isGlowing: true/false (yeşil glow aktif mi)
```

**İç Yapısı:**

| Ref | Amaç |
|-----|-------|
| `eventSourceRef` | SSE bağlantısı referansı |
| `pollingRef` | Fallback polling interval ID |
| `glowTimeoutRef` | Glow throttle timer (1.5s) |
| `lastValueRef` | Önceki sayı (glow karşılaştırması için) |
| `lastSlotRef` | Önceki slot key (dedup için) |

**Bağlantı Akışı:**

```
1. fetchInitial()   → İlk değeri /api/active-users'dan al
2. connectSSE()     → /events SSE akışını başlat
3. SSE hata verirse → startPolling() + 5s sonra tekrar SSE dene
4. Bileşen unmount  → Tüm bağlantıları ve timer'ları temizle
```

### Glow Throttle Mantığı

Sayı arttığında yeşil glow tetiklenir, ancak titreme (flicker) önlenir:

```
Sayı arttı mı?  ─── Hayır ─── Glow tetiklenme
      │
     Evet
      │
glowTimeout aktif mi? ─── Evet ─── Atla (throttle)
      │
    Hayır
      │
Glow'u AÇ → 1.5s sonra KAPAT → Timer'ı null yap
```

### Sayfa Yapısı

```
<div class="igaming-page">
  ├─ <header class="igaming-header">     → VEVOB | BAHİS logosu
  ├─ <div class="fake-slider">           → Mor gradient hero alanı
  ├─ <div class="live-users">            → Aktif kullanıcı pill'i
  │    ├─ <span class="pulse-dot">       → Yeşil yanıp sönen nokta
  │    ├─ <span class="live-users-label">→ "Şu anda sitede aktif:"
  │    ├─ <span class="number">          → Sayı (örn: 4.250)
  │    ├─ <span class="live-users-label">→ "kullanıcı"
  │    └─ <span class="live-users-glow-ring"> → Glow overlay
  ├─ <div class="fake-promo">            → Promo kartları (3 adet)
  └─ <footer class="igaming-footer">     → 18+ uyarısı
```

---

## CSS Yapısı ve Responsive Tasarım

### Renk Paleti

| Değişken | Renk | Kullanım |
|----------|------|----------|
| `#0d0d0d` | Koyu siyah | Sayfa arka planı |
| `#000000` | Saf siyah | Header arka planı |
| `#111111` | Koyugri | Promo bölümü arka planı |
| `#ffd700` | Altın | Logo, pill kenarlığı, vurgular |
| `#ffff00` | Sarı | Sayaç numarası |
| `#00ff9d` | Neon yeşil | Pulse dot, glow efekti |
| `#ff003c` | Kırmızı | "CANLI" badge |
| `#8888ff` | Mavi-mor | Bonus ikonu |

### Responsive Breakpoints

| Breakpoint | Hedef Cihaz | Değişiklikler |
|-----------|-------------|---------------|
| `< 390px` | Küçük telefonlar (iPhone SE) | Minimum boyutlar, tek sütun promo |
| `390px+` | Standart telefonlar | Header ve slider büyüme |
| `480px+` | Büyük telefonlar | Promo kartları 2 sütun grid |
| `768px+` | Tabletler | Promo kartları 3 sütun, hover efektleri |
| `1024px+` | Desktop | Tam boyut header, büyük slider |
| `1280px+` | Geniş desktop | Maksimum slider yüksekliği |

### `clamp()` Kullanımı

Breakpoint'ler arası geçişlerde ani sıçramalar yerine akıcı ölçekleme:

```css
/* Pill kenar boşluğu: 10px (320px) → 24px (1280px+) */
margin: clamp(10px, 3vw, 24px) auto;

/* Font boyutu: 0.6875rem (320px) → 1.0625rem (1280px+) */
font-size: clamp(0.6875rem, 2.8vw, 1.0625rem);

/* Pulse dot: 6px (320px) → 10px (1280px+) */
width: clamp(6px, 2vw, 10px);
```

### Safe Area (iPhone Çentik/Dynamic Island)

```css
@supports (padding-top: env(safe-area-inset-top)) {
  .igaming-header {
    padding-top: env(safe-area-inset-top);
  }
  .igaming-footer {
    padding-bottom: calc(16px + env(safe-area-inset-bottom));
  }
}
```

Pill'in sağ/sol kenarlarının çentiğe girmesini önler:

```css
.live-users {
  max-width: calc(100vw - 1.5rem - env(safe-area-inset-left, 0px) - env(safe-area-inset-right, 0px));
  padding-left: max(clamp(10px, 3.5vw, 36px), env(safe-area-inset-left, 0px));
  padding-right: max(clamp(10px, 3.5vw, 36px), env(safe-area-inset-right, 0px));
}
```

---

## Performans Optimizasyonları

### 1. Layout Shift (CLS) Önleme

**Problem:** Farklı rakamlar farklı genişliklere sahip (örn: "1" dar, "8" geniş). Sayı değiştiğinde pill genişliği micro-shift yapıyor.

**Çözüm:**
```css
.live-users .number {
  font-variant-numeric: tabular-nums;  /* Tüm rakamlar eşit genişlik */
  min-width: clamp(36px, 10vw, 60px); /* Minimum genişlik garantisi */
  text-align: center;
}
```

### 2. Repaint İzolasyonu

**Problem:** Sayı her saniye değiştiğinde, tarayıcı tüm sayfayı yeniden boyamaya çalışıyor.

**Çözüm:**
```css
.live-users {
  contain: layout style paint;  /* Repaints sadece pill içinde kalır */
  isolation: isolate;           /* Stacking context izolasyonu */
}
```

### 3. Glow Efekti - box-shadow Yerine Opacity

**Problem:** `box-shadow` animasyonu her frame'de GPU'da pahalı repaint tetikliyor, özellikle mobil GPU'larda.

**Çözüm:** Ayrı bir overlay element (`live-users-glow-ring`) kullanılır, sadece `opacity` geçişi yapılır:

```css
.live-users-glow-ring {
  position: absolute;
  inset: -1px;
  opacity: 0;                    /* Varsayılan: görünmez */
  transition: opacity 0.4s ease; /* Sadece opacity animasyonu */
  will-change: opacity;          /* GPU layer hint */
}

.live-users-glow-ring--active {
  opacity: 1;  /* Glow aktif */
}
```

### 4. backdrop-filter Kaldırma

`backdrop-filter: blur()` mobil GPU'larda çok pahalı. Pill'den tamamen kaldırıldı.

### 5. Glow Throttle

```typescript
// Glow zaten aktifken tekrar tetiklenmez
if (!glowTimeoutRef.current) {
  setIsGlowing(true);
  glowTimeoutRef.current = setTimeout(() => {
    setIsGlowing(false);
    glowTimeoutRef.current = null;
  }, 1500);
}
```

### 6. SlotKey Dedup

```typescript
// Aynı slot için tekrarlı SSE mesajlarını atla
if (newData.slotKey === lastSlotRef.current) return;
```

### 7. Pulse Dot Optimizasyonu

```css
.pulse-dot {
  will-change: opacity;  /* Compositor layer'a taşı */
  /* Sadece opacity animasyonu - layout tetiklemez */
  animation: blink 1.6s infinite;
}
```

---

## Erişilebilirlik

### Reduced Motion Desteği

Kullanıcı sistem ayarlarından animasyonları kapatmışsa:

```css
@media (prefers-reduced-motion: reduce) {
  .live-users .pulse-dot {
    animation: none;    /* Yanıp sönme kapatılır */
    opacity: 1;         /* Sürekli görünür */
  }
  .live-users-glow-ring {
    transition: none;   /* Glow geçişi anında olur */
  }
  .glow-green {
    text-shadow: none;  /* Yeşil parıltı kapatılır */
  }
}
```

---

## Kendi Projenize Entegrasyon

### Yöntem 1: iframe ile Gömme

En basit yöntem. Sayacı herhangi bir sayfaya iframe olarak ekleyin:

```html
<iframe
  src="https://your-deployed-url.replit.app"
  width="100%"
  height="600"
  frameborder="0"
  style="border: none;"
></iframe>
```

### Yöntem 2: Sadece Sayacı API ile Kullanma

Kendi frontend'inizden sadece sayıyı çekin:

```javascript
// SSE ile gerçek zamanlı
const es = new EventSource("https://your-deployed-url.replit.app/events");
es.onmessage = (event) => {
  const { value } = JSON.parse(event.data);
  document.getElementById("counter").textContent =
    value.toLocaleString("tr-TR");
};

// veya tek seferlik fetch
const res = await fetch("https://your-deployed-url.replit.app/api/active-users");
const { value } = await res.json();
```

### Yöntem 3: React Bileşeni Olarak

`useActiveUsers` hook'unu kendi projenize kopyalayın:

```tsx
// home.tsx dosyasından useActiveUsers hook'unu alın
// API URL'lerini kendi sunucunuza göre güncelleyin:
//   "/events" → "https://your-server.com/events"
//   "/api/active-users" → "https://your-server.com/api/active-users"

function MyComponent() {
  const { displayValue, isGlowing } = useActiveUsers();
  return <span className={isGlowing ? "glow" : ""}>{displayValue}</span>;
}
```

---

## Ortam Değişkenleri

| Değişken | Zorunlu | Varsayılan | Açıklama |
|----------|---------|------------|----------|
| `NODE_ENV` | Hayır | `development` | `production` olarak ayarlandığında build dosyaları sunulur |
| `PORT` | Hayır | `5000` | Sunucu portu |
| `SESSION_SECRET` | Hayır | - | Express session gizli anahtarı (bu proje için kullanılmaz) |

---

## Proje Dosya Yapısı

```
├── client/
│   └── src/
│       ├── pages/
│       │   ├── home.tsx          # Ana sayfa bileşeni + useActiveUsers hook
│       │   └── igaming.css       # Tüm stiller (dark theme, responsive, glow)
│       ├── App.tsx               # Router yapılandırması
│       └── main.tsx              # React entry point
│
├── server/
│   ├── index.ts                  # Express sunucu başlatma
│   ├── routes.ts                 # API rotaları + SSE endpoint + rate limiter
│   ├── activeUsers.ts            # Sayı hesaplama motoru + SSE broadcast
│   └── vite.ts                   # Vite dev server entegrasyonu
│
├── shared/
│   └── schema.ts                 # Paylaşılan tip tanımları
│
├── package.json
├── tsconfig.json
├── vite.config.ts
└── README.md                     # Bu dosya
```

### Kritik Dosyalar

| Dosya | Satır | Rol |
|-------|-------|-----|
| `server/activeUsers.ts` | ~193 | Tüm sayı hesaplama mantığı, slot sistemi, SSE broadcast |
| `client/src/pages/home.tsx` | ~186 | React bileşeni, SSE istemci, glow mantığı |
| `client/src/pages/igaming.css` | ~565 | Tüm stiller, responsive breakpoints, animasyonlar |
| `server/routes.ts` | ~91 | Express rotaları, rate limiter |

---

## SSS (Sık Sorulan Sorular)

### S: Sayılar gerçek kullanıcı verisi mi?
**C:** Hayır. Sayılar İstanbul saat dilimine göre deterministik olarak hesaplanır. Gerçek kullanıcı sayısı ile ilgisi yoktur. Saat aralıklarına göre gerçekçi görünecek değerler üretir.

### S: Birden fazla sunucu çalıştırsam sayılar farklı olur mu?
**C:** Hayır. Hesaplama tamamen sunucu saatine dayalıdır. Sunucu saatleri senkronize olduğu sürece (NTP) tüm sunucular aynı sayıyı üretir.

### S: Kaç istemci aynı anda bağlanabilir?
**C:** Node.js event loop kapasitesine bağlıdır. SSE bağlantıları hafif olduğundan, tek bir Node.js process'i binlerce eşzamanlı bağlantıyı rahatlıkla yönetebilir.

### S: Rate limit'e takılırsam ne olur?
**C:** HTTP 429 yanıtı alırsınız. SSE bağlantısı zaten kurulduktan sonra rate limit etkilemez; sadece yeni bağlantı denemeleri sınırlanır.

### S: Sayı aralıklarını nasıl değiştiririm?
**C:** `server/activeUsers.ts` dosyasındaki `HOUR_RANGES` dizisini düzenleyin:
```typescript
{ start: 20, end: 23, range: { min: 4500, max: 5800, base: 5150 } }
//                              ↑         ↑          ↑
//                          minimum    maximum    ortalama
```

### S: Hafta sonu artış oranını nasıl değiştiririm?
**C:** `server/activeUsers.ts` dosyasında `1.2` çarpanını değiştirin:
```typescript
if (isWeekend) {
  min = Math.round(min * 1.5);  // %50 artış için 1.5 yapın
}
```

### S: Güncelleme sıklığını nasıl değiştiririm?
**C:** `server/activeUsers.ts` dosyasında `SLOT_LENGTH_MS` sabitini değiştirin:
```typescript
const SLOT_LENGTH_MS = 5000;  // 5 saniyede bir güncelleme
```
Frontend polling aralığını da `home.tsx` dosyasındaki `setInterval` değerinden güncelleyin.

### S: CORS sorunuyla karşılaşırsam?
**C:** Farklı domain'den erişiyorsanız, `server/routes.ts` dosyasına CORS header'ları ekleyin:
```typescript
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  next();
});
```

---

## Lisans

MIT
