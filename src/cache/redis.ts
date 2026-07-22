import { Redis } from "ioredis";
import type { FeRaceSimulation } from "../race/simulator.js";
import config from "../config/config.js";

const SIMULATION_TTL = 3600;

let client: Redis | null = null;

function getClient(): Redis {
    if (!client) {
        client = new Redis(config().REDIS_URL, {
            maxRetriesPerRequest: 3,
            retryStrategy(times: number) {
                return Math.min(times * 200, 2000);
            },
            lazyConnect: true,
        });

        client.on("error", (err: Error) => {
            console.error("[redis] Connection error:", err);
        });

        client.on("end", () => {
            console.warn("[redis] Connection ended — reconnecting...");
            client!
                .connect()
                .catch((err) =>
                    console.error("[redis] Reconnect failed:", err),
                );
        });
    }
    return client;
}

export async function connectRedis(): Promise<void> {
    await getClient().connect();
    console.log("[redis] Connected");
}

export async function disconnectRedis(): Promise<void> {
    if (client) {
        await client.quit();
        client = null;
        console.log("[redis] Disconnected");
    }
}

export async function setSimulation(
    raceId: string,
    simulation: FeRaceSimulation,
): Promise<void> {
    await getClient().setex(
        `race:${raceId}:simulation`,
        SIMULATION_TTL,
        JSON.stringify(simulation),
    );
}

export async function getSimulation(
    raceId: string,
): Promise<FeRaceSimulation | null> {
    const raw = await getClient().get(`race:${raceId}:simulation`);
    if (!raw) return null;
    try {
        return JSON.parse(raw) as FeRaceSimulation;
    } catch {
        return null;
    }
}

export async function setCurrentTick(
    raceId: string,
    tickIndex: number,
): Promise<void> {
    await getClient().setex(
        `race:${raceId}:currentTick`,
        SIMULATION_TTL,
        tickIndex,
    );
}

export async function getCurrentTick(raceId: string): Promise<number> {
    const raw = await getClient().get(`race:${raceId}:currentTick`);
    if (raw === null) return 0;
    return Number(raw);
}

export async function delRaceKeys(raceId: string): Promise<void> {
    await getClient().del(
        `race:${raceId}:simulation`,
        `race:${raceId}:currentTick`,
    );
}
