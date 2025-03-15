import { Message } from "discord.js";
import { BaseEvent } from "./BaseEvent";
import { CommandExecutor } from "../commands"
import { DiscordClient } from "../DiscordClient";

export class MessageEvent extends BaseEvent {

    constructor(client: DiscordClient, message: Message) {
        super(client);
        this.message = message;
    }

    public execute() {
        if (this.message.author.bot) return;
        if (!this.message.content) return;

        let text: string = this.message.content;
        if (!process.env.CMD_TEXT_PREFIX || !text.startsWith(process.env.CMD_TEXT_PREFIX)) return;
        text = text.slice(process.env.CMD_TEXT_PREFIX.length);

        CommandExecutor.process(this.client, this.message, text);
    }

    private message: Message;
}