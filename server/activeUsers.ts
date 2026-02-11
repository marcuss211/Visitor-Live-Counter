import type { Response } from "express";
import { log } from "./index";

const SLOT_LENGTH_MS = 45000;

interface HourRange {
  min: number;
  max: number;
  base: number;
}

const HOUR_RANGES: Array<{ start: number; end: number; range: HourRange }> = [
  { start: 0, end: 3, range: { min: 2800, max: 4200, base: 3500 } },
  { start: 3, end: 6, range: { min: 900, max: 1800, base: 1350 } },
  { start: 6, end: 9, range: { min: 1300, max: 2200, base: 1750 } },
  { start: 9, end: 12, range: { min: 1900, max: 3000, base: 2450 } },
  { start: 12, end: 15, range: { min: 2400, max: 3500, base: 2950 } },
  { start: 15, end: 18, range: { min: 3000, max: 4200, base: 3600 } },
  { start: 18, end: 20, range: { min: 3800, max: 5000, base: 4400 } },
  { start: 20, end: 23, range: { min: 4500, max: 5800, base: 5150 } },
  { start: 23, end: 24, range: { min: 3400, max: 4600, base: 4000 } },
];

function getIstanbulTime(): { hour: number; minute: number; second: number; weekday: number } {
  const now = new Date();
  const istanbulStr = now.toLocaleString("en-US", { timeZone: "Europe/Istanbul" });
  const istanbulDate = new Date(istanbulStr);

  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: "Europe/Istanbul",
    hour: "numeric",
    minute: "numeric",
    second: "numeric",
    hour12: false,
    weekday: "short",
  });

  const parts = formatter.formatToParts(now);
  const hour = parseInt(parts.find((p) => p.type === "hour")?.value || "0");
  const minute = parseInt(parts.find((p) => p.type === "minute")?.value || "0");
  const second = parseInt(parts.find((p) => p.type === "second")?.value || "0");
  const weekdayStr = parts.find((p) => p.type === "weekday")?.value || "Mon";

  const weekdayMap: Record<string, number> = {
    Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6,
  };
  const weekday = weekdayMap[weekdayStr] ?? 1;

  return { hour, minute, second, weekday };
}

function getHourRange(hour: number): HourRange {
  for (const entry of HOUR_RANGES) {
    if (hour >= entry.start && hour < entry.end) {
      return { ...entry.range };
    }
  }
  return { min: 2800, max: 4200, base: 3500 };
}

function computeActiveUsers(): number {
  const { hour, minute, second, weekday } = getIstanbulTime();
  const range = getHourRange(hour);

  let { min, max, base } = range;

  const isWeekend = weekday === 0 || weekday === 6;
  if (isWeekend) {
    min = Math.round(min * 1.2);
    max = Math.round(max * 1.2);
    base = Math.round(base * 1.2);
  }

  const fluctuation =
    Math.sin((hour * 60 + minute) * 0.07) * 250 +
    Math.cos((minute * 60 + second) * 0.03) * 150;

  let displayed = Math.round(base + fluctuation);
  displayed = Math.max(min, Math.min(max, displayed));
  displayed = Math.max(900, displayed);

  return displayed;
}

function getCurrentSlotKey(): number {
  return Math.floor(Date.now() / SLOT_LENGTH_MS);
}

function getIstanbulISO(): string {
  const now = new Date();
  const istanbulStr = now.toLocaleString("en-US", { timeZone: "Europe/Istanbul" });
  const istanbulDate = new Date(istanbulStr);
  return istanbulDate.toISOString();
}

interface SlotData {
  value: number;
  slotKey: number;
  serverTime: string;
  tz: string;
}

const slotStore = new Map<number, SlotData>();
const sseClients = new Set<Response>();

let lastSlotKey = -1;

function getOrComputeSlotData(slotKey?: number): SlotData {
  const key = slotKey ?? getCurrentSlotKey();

  if (slotStore.has(key)) {
    return slotStore.get(key)!;
  }

  const value = computeActiveUsers();
  const data: SlotData = {
    value,
    slotKey: key,
    serverTime: getIstanbulISO(),
    tz: "Europe/Istanbul",
  };

  slotStore.set(key, data);

  const keysToKeep = 10;
  if (slotStore.size > keysToKeep * 2) {
    const sortedKeys = Array.from(slotStore.keys()).sort((a, b) => a - b);
    const toRemove = sortedKeys.slice(0, sortedKeys.length - keysToKeep);
    for (const k of toRemove) {
      slotStore.delete(k);
    }
  }

  return data;
}

function broadcastToClients(data: SlotData): void {
  const payload = `data: ${JSON.stringify(data)}\n\n`;
  let activeCount = 0;

  Array.from(sseClients).forEach((client) => {
    try {
      client.write(payload);
      activeCount++;
    } catch {
      sseClients.delete(client);
    }
  });

  log(`Slot ${data.slotKey} | Value: ${data.value} | Broadcast to ${activeCount} clients`, "active-users");
}

function startSlotTimer(): void {
  const currentSlot = getCurrentSlotKey();
  const data = getOrComputeSlotData(currentSlot);
  lastSlotKey = currentSlot;
  log(`Initial slot ${currentSlot} | Value: ${data.value}`, "active-users");

  const tick = () => {
    const nowSlot = getCurrentSlotKey();
    if (nowSlot !== lastSlotKey) {
      lastSlotKey = nowSlot;
      const slotData = getOrComputeSlotData(nowSlot);
      broadcastToClients(slotData);
    }
  };

  setInterval(tick, 1000);
}

export function getCurrentData(): SlotData {
  return getOrComputeSlotData(getCurrentSlotKey());
}

export function addSSEClient(res: Response): void {
  sseClients.add(res);

  res.on("close", () => {
    sseClients.delete(res);
  });

  const current = getCurrentData();
  res.write(`data: ${JSON.stringify(current)}\n\n`);
}

export function getSSEClientCount(): number {
  return sseClients.size;
}

export function initActiveUsersEngine(): void {
  startSlotTimer();
}
