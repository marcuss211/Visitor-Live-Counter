import { useState, useEffect, useRef, useCallback } from "react";

interface ActiveUsersData {
  value: number;
  slotKey: number;
  serverTime: string;
  tz: string;
}

function formatNumber(value: number): string {
  return value.toLocaleString("tr-TR");
}

function useActiveUsers() {
  const [displayValue, setDisplayValue] = useState<string>("---");
  const [isGlowing, setIsGlowing] = useState(false);
  const eventSourceRef = useRef<EventSource | null>(null);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const glowTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastValueRef = useRef<number | null>(null);
  const lastSlotRef = useRef<number | null>(null);

  const handleNewData = useCallback((newData: ActiveUsersData) => {
    if (newData.slotKey === lastSlotRef.current) return;
    lastSlotRef.current = newData.slotKey;

    const prev = lastValueRef.current;
    lastValueRef.current = newData.value;

    setDisplayValue(formatNumber(newData.value));

    if (prev !== null && newData.value > prev) {
      if (!glowTimeoutRef.current) {
        setIsGlowing(true);
        glowTimeoutRef.current = setTimeout(() => {
          setIsGlowing(false);
          glowTimeoutRef.current = null;
        }, 1500);
      }
    }
  }, []);

  const fetchInitial = useCallback(async () => {
    try {
      const res = await fetch("/api/active-users");
      if (res.ok) {
        const json: ActiveUsersData = await res.json();
        handleNewData(json);
      }
    } catch {
    }
  }, [handleNewData]);

  const startPolling = useCallback(() => {
    if (pollingRef.current) clearInterval(pollingRef.current);
    pollingRef.current = setInterval(async () => {
      try {
        const res = await fetch("/api/active-users");
        if (res.ok) {
          const json: ActiveUsersData = await res.json();
          handleNewData(json);
        }
      } catch {
      }
    }, 1000);
  }, [handleNewData]);

  const connectSSE = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    const es = new EventSource("/events");
    eventSourceRef.current = es;

    es.onmessage = (event) => {
      try {
        const parsed: ActiveUsersData = JSON.parse(event.data);
        handleNewData(parsed);
      } catch {
      }
    };

    es.onerror = () => {
      es.close();
      eventSourceRef.current = null;
      startPolling();
      setTimeout(connectSSE, 5000);
    };

    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
  }, [handleNewData, startPolling]);

  useEffect(() => {
    fetchInitial();
    connectSSE();

    return () => {
      if (eventSourceRef.current) eventSourceRef.current.close();
      if (pollingRef.current) clearInterval(pollingRef.current);
      if (glowTimeoutRef.current) clearTimeout(glowTimeoutRef.current);
    };
  }, [fetchInitial, connectSSE]);

  return { displayValue, isGlowing };
}

export default function Home() {
  const { displayValue, isGlowing } = useActiveUsers();

  return (
    <div className="igaming-page" data-testid="page-home">
      <header className="igaming-header" data-testid="header-main">
        <div className="header-inner">
          <span className="header-logo" data-testid="text-logo">VEVOB</span>
          <span className="header-divider">|</span>
          <span className="header-subtitle">BAHİS</span>
        </div>
      </header>

      <div className="fake-slider" data-testid="section-slider">
        <div className="slider-overlay" />
        <div className="slider-content">
          <div className="slider-badge">CANLI</div>
          <h2 className="slider-title">Ana Slider / Carousel burada</h2>
          <p className="slider-desc">En iyi oranlar, en hızlı ödemeler</p>
        </div>
      </div>

      <div
        className="live-users"
        data-testid="section-live-users"
      >
        <span className="pulse-dot" data-testid="indicator-pulse" />
        <span className="live-users-label">Şu anda sitede aktif:</span>
        <span
          className={`number ${isGlowing ? "glow-green" : ""}`}
          data-testid="text-active-count"
        >
          {displayValue}
        </span>
        <span className="live-users-label">kullanıcı</span>
        <span className={`live-users-glow-ring ${isGlowing ? "live-users-glow-ring--active" : ""}`} />
      </div>

      <div className="fake-promo" data-testid="section-promo">
        <div className="promo-grid">
          <div className="promo-card promo-card--spin">
            <div className="promo-icon-wrapper">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
            </div>
            <div className="promo-card-text">
              <span className="promo-card-title">1000 Free Spin</span>
              <span className="promo-card-desc">Yeni üyelere özel</span>
            </div>
          </div>
          <div className="promo-card promo-card--tournament">
            <div className="promo-icon-wrapper">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"/></svg>
            </div>
            <div className="promo-card-text">
              <span className="promo-card-title">Turnuva</span>
              <span className="promo-card-desc">Haftalık 100.000 TL</span>
            </div>
          </div>
          <div className="promo-card promo-card--bonus">
            <div className="promo-icon-wrapper">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>
            </div>
            <div className="promo-card-text">
              <span className="promo-card-title">Hoşgeldin Bonusu</span>
              <span className="promo-card-desc">%100 ilk yatırım</span>
            </div>
          </div>
        </div>
      </div>

      <footer className="igaming-footer" data-testid="footer-main">
        <span className="footer-text">18+ | Sorumlu oyun</span>
      </footer>
    </div>
  );
}
