import { Client } from "discord.js";
import { AudioController } from "./AudioController";

export class DiscordClient {

    constructor(client: Client) {
        this.bot = client;
    }

    public bot: Client;
    public voiceConnections: Map<string, AudioController> = new Map();
}