import { WebSocket } from "ws";

const clients = new Set<WebSocket>();

export function addClient(ws: WebSocket): void {
    clients.add(ws);
}

export function removeClient(ws: WebSocket): void {
    clients.delete(ws);
}

export function broadcast(message: object): void {
    const data = JSON.stringify(message);
    for (const ws of clients) {
        if (ws.readyState === WebSocket.OPEN) {
            ws.send(data);
        }
    }
}

export function getClientCount(): number {
    return clients.size;
}
