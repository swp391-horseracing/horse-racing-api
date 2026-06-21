import { WebSocket } from "ws";
import type { Role } from "../types/roles.js";

function topicMatches(sub: string, topic: string): boolean {
    if (sub === "*") return true;

    if (sub.endsWith(":*")) {
        const prefix = sub.slice(0, -2);
        return topic.startsWith(prefix + ":") || topic === prefix;
    }

    return sub === topic;
}

const clients = new Map<WebSocket, Express.User | null>();
const subscriptions = new Map<WebSocket, Set<string>>();

export function addClient(ws: WebSocket, user: Express.User | null): void {
    clients.set(ws, user);
    subscriptions.set(ws, new Set());
}

export function removeClient(ws: WebSocket): void {
    clients.delete(ws);
    subscriptions.delete(ws);
}

export function subscribeClient(ws: WebSocket, topics: string[]): void {
    const subs = subscriptions.get(ws);
    if (!subs) return;

    if (topics.length === 0 || topics.includes("*")) {
        subs.clear();
        subs.add("*");
        return;
    }

    subs.delete("*");

    for (const t of topics) {
        subs.add(t);
    }
}

export function unsubscribeClient(ws: WebSocket, topics: string[]): void {
    const subs = subscriptions.get(ws);
    if (!subs) return;

    if (topics.length === 0 || topics.includes("*")) {
        subs.clear();
        return;
    }

    for (const t of topics) {
        subs.delete(t);
    }
}

function send(ws: WebSocket, data: string): void {
    if (ws.readyState === WebSocket.OPEN) {
        ws.send(data);
    }
}

export function broadcast(message: object): void {
    const data = JSON.stringify(message);
    for (const ws of clients.keys()) {
        send(ws, data);
    }
}

export function broadcastToRole(message: object, role: Role): void {
    const data = JSON.stringify(message);
    for (const [ws, user] of clients) {
        if (user?.role === role) {
            send(ws, data);
        }
    }
}

export function broadcastToTopic(
    message: object,
    topic: string,
    role?: Role,
): void {
    const data = JSON.stringify(message);
    for (const [ws, user] of clients) {
        const subs = subscriptions.get(ws);
        if (!subs) continue;
        if (![...subs].some((s) => topicMatches(s, topic))) continue;
        if (role && user?.role !== role) continue;
        send(ws, data);
    }
}

export function getClientCount(): number {
    return clients.size;
}
