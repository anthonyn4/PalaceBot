import { DiscordClient } from "src/DiscordClient";

export abstract class BaseEvent {
    constructor(client: DiscordClient) {
        this.client = client;
    }

    public client: DiscordClient;
    public abstract execute(): void;
}