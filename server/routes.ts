import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { getCurrentData, addSSEClient, getSSEClientCount, initActiveUsersEngine } from "./activeUsers";
import path from "path";
import fs from "fs";

const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_WINDOW = 60000;
const RATE_LIMIT_MAX = 60;

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);

  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW });
    return true;
  }

  if (entry.count >= RATE_LIMIT_MAX) {
    return false;
  }

  entry.count++;
  return true;
}

setInterval(() => {
  const now = Date.now();
  Array.from(rateLimitMap.entries()).forEach(([ip, entry]) => {
    if (now > entry.resetAt) {
      rateLimitMap.delete(ip);
    }
  });
}, 60000);

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {

  initActiveUsersEngine();

  app.get("/health", (_req: Request, res: Response) => {
    res.status(200).json({
      status: "ok",
      uptime: process.uptime(),
      sseClients: getSSEClientCount(),
    });
  });

  app.get("/api/active-users", (req: Request, res: Response) => {
    const ip = req.ip || req.socket.remoteAddress || "unknown";
    if (!checkRateLimit(ip)) {
      return res.status(429).json({ error: "Too many requests" });
    }

    const data = getCurrentData();
    res.json(data);
  });

  const docFileName = "VEVOB_Bahis_Sistem_Dokumani.html";
  function findDocPath(): string | undefined {
    const candidates = [
      path.resolve(process.cwd(), "public", docFileName),
      path.resolve(import.meta.dirname, "public", docFileName),
    ];
    return candidates.find((p) => fs.existsSync(p));
  }

  app.get("/dokuman", (_req: Request, res: Response) => {
    const filePath = findDocPath();
    if (filePath) {
      res.sendFile(filePath);
    } else {
      res.status(404).send("Doküman bulunamadı");
    }
  });

  app.get("/dokuman/indir", (_req: Request, res: Response) => {
    const filePath = findDocPath();
    if (filePath) {
      res.download(filePath, docFileName);
    } else {
      res.status(404).send("Doküman bulunamadı");
    }
  });

  app.get("/events", (req: Request, res: Response) => {
    const ip = req.ip || req.socket.remoteAddress || "unknown";
    if (!checkRateLimit(ip)) {
      return res.status(429).json({ error: "Too many requests" });
    }

    res.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    });

    res.write(":ok\n\n");

    addSSEClient(res);

    const keepAlive = setInterval(() => {
      try {
        res.write(":ping\n\n");
      } catch {
        clearInterval(keepAlive);
      }
    }, 30000);

    req.on("close", () => {
      clearInterval(keepAlive);
    });
  });

  return httpServer;
}
