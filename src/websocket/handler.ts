import { WebSocketServer, WebSocket } from "ws";
import { IncomingMessage } from "http";
import { URL } from "url";
import jwt from "jsonwebtoken";
import config from "../config/config.js";
import { eventBus } from "./eventBus.js";
import {
    addClient,
    removeClient,
    subscribeClient,
    unsubscribeClient,
    broadcastToTopic,
} from "./broadcast.js";
import { Role } from "../types/roles.js";

const HEARTBEAT_INTERVAL = 15_000;

function authenticateToken(token: string): Express.User | null {
    try {
        const decoded = jwt.verify(token, config().JWT_SECRET);
        if (
            typeof decoded === "object" &&
            typeof decoded.id === "string" &&
            typeof decoded.role === "string" &&
            typeof decoded.tokenVersion === "number"
        ) {
            return decoded as Express.User;
        }
        return null;
    } catch {
        return null;
    }
}

export function setupWebSocket(wss: WebSocketServer): void {
    eventBus.on("race:status_changed", (event) => {
        broadcastToTopic(event, `race:${event.data.raceId}`);
    });

    eventBus.on("race:result_updated", (event) => {
        broadcastToTopic(event, `race:${event.data.raceId}`, Role.ADMIN);
    });

    eventBus.on("race:result_published", (event) => {
        broadcastToTopic(event, `race:${event.data.raceId}`);
    });

    eventBus.on("tournament:status_changed", (event) => {
        broadcastToTopic(event, `tournament:${event.data.tournamentId}`);
    });

    wss.on("connection", (ws: WebSocket, req: IncomingMessage) => {
        const url = new URL(
            req.url ?? "/",
            `http://${req.headers.host ?? "localhost"}`,
        );
        const token = url.searchParams.get("token");

        const user = token ? authenticateToken(token) : null;

        ws.send(
            JSON.stringify({
                type: "connection:ack",
                data: { userId: user?.id ?? null, role: user?.role ?? null },
            }),
        );

        addClient(ws, user);

        ws.on("message", (data) => {
            try {
                const msg = JSON.parse(data.toString());
                switch (msg.type) {
                    case "ping":
                        ws.send(JSON.stringify({ type: "pong" }));
                        break;
                    case "subscribe":
                        subscribeClient(ws, msg.topics);
                        break;
                    case "unsubscribe":
                        unsubscribeClient(ws, msg.topics);
                        break;
                }
            } catch {
                // ignore malformed messages
            }
        });

        let alive = true;
        const heartbeat = setInterval(() => {
            if (!alive) {
                ws.terminate();
                return;
            }
            alive = false;
            ws.ping();
        }, HEARTBEAT_INTERVAL);

        ws.on("pong", () => {
            alive = true;
        });

        ws.on("close", () => {
            clearInterval(heartbeat);
            removeClient(ws);
        });

        ws.on("error", () => {
            clearInterval(heartbeat);
            removeClient(ws);
        });
    });
}
