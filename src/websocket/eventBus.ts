import { EventEmitter } from "events";
import type { FeTickSnapshot, FeFinalPlacement } from "../race/simulator.js";

type BaseEvent<T extends string, D extends Record<string, unknown>> = {
    type: T;
    data: D;
};

export type RaceStatusChangedEvent = BaseEvent<
    "race:status_changed",
    {
        raceId: string;
        status: string;
        previousStatus: string;
        timestamp: string;
    }
>;

export type RaceResultUpdatedEvent = BaseEvent<
    "race:result_updated",
    {
        raceId: string;
        resultId: string;
        timestamp: string;
    }
>;

export type RaceResultPublishedEvent = BaseEvent<
    "race:result_published",
    {
        raceId: string;
        resultId: string;
        timestamp: string;
    }
>;

export type TournamentStatusChangedEvent = BaseEvent<
    "tournament:status_changed",
    {
        tournamentId: string;
        status: string;
        previousStatus: string;
        timestamp: string;
    }
>;

export type RaceTickEvent = BaseEvent<
    "race:tick",
    {
        raceId: string;
        tick: FeTickSnapshot;
    }
>;

export type RaceFinishEvent = BaseEvent<
    "race:finish",
    {
        raceId: string;
        finalResults: FeFinalPlacement[];
    }
>;

export type AppEvent =
    | RaceStatusChangedEvent
    | RaceResultUpdatedEvent
    | RaceResultPublishedEvent
    | TournamentStatusChangedEvent
    | RaceTickEvent
    | RaceFinishEvent;

type EventMap = {
    "race:status_changed": RaceStatusChangedEvent;
    "race:result_updated": RaceResultUpdatedEvent;
    "race:result_published": RaceResultPublishedEvent;
    "tournament:status_changed": TournamentStatusChangedEvent;
    "race:tick": RaceTickEvent;
    "race:finish": RaceFinishEvent;
};

class EventBus {
    private emitter = new EventEmitter();

    emit<T extends AppEvent["type"]>(
        event: Extract<AppEvent, { type: T }>,
    ): void {
        this.emitter.emit(event.type, event);
    }

    on<T extends EventMap[keyof EventMap]["type"]>(
        type: T,
        listener: (
            event: Extract<EventMap[keyof EventMap], { type: T }>,
        ) => void,
    ): () => void {
        this.emitter.on(type, listener);
        return () => {
            this.emitter.off(type, listener);
        };
    }

    removeAllListeners(): void {
        this.emitter.removeAllListeners();
    }
}

export const eventBus = new EventBus();
