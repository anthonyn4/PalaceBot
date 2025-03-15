import { VoiceMessage } from "discord-speech-recognition";
import { BaseEvent } from "./BaseEvent";
import { DiscordClient } from "../DiscordClient";
import { CommandExecutor } from "../commands";

export class VoiceEvent extends BaseEvent {

    constructor(client: DiscordClient, message: VoiceMessage) {
        super(client);
        this.message = message;
    }

    public execute() {

        if (this.message.error) {
            if (this.message.error.message.match(/Google speech api error/)) return;
            console.error(`voice processing error [${this.message.error.name}]`, this.message.error);
            return;
        }

        let text = this.message.content;
        if (!text || !process.env.CMD_VOICE_TRIGGER || !text.startsWith(process.env.CMD_VOICE_TRIGGER)) return;
        text = text.slice(process.env.CMD_VOICE_TRIGGER.length).toLowerCase().trim();

        console.log(`received voice command ${text} 🤖`);

        CommandExecutor.process(this.client, this.message, text);
    }

    private message: VoiceMessage;
}