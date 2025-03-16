import { createAudioResource } from "@discordjs/voice";
import { VoiceMessage } from "discord-speech-recognition";
import { BaseEvent } from "./BaseEvent";
import { DiscordClient } from "../DiscordClient";
import { CommandExecutor } from "../commands";
import { createReadStream } from "fs";
import { join } from "path";

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

        let controller = this.client.voiceConnections.get(this.message.guild.id)
        if (!controller) {
            console.log("no audio controller found for voice controls 🤔");
            return;
        }

        const activationWord = process.env.CMD_VOICE_TRIGGER;
        let text = this.message.content?.toLowerCase();

        if (!text || !activationWord) return;
        if (!text.startsWith(activationWord)) {
            console.log(`i heard '${text}', must have been the wind 🤫`);
            return;
        }
        text = text.slice(activationWord.length).trim();
        if (!text) return; // voice activation with no command

        console.log(`received voice command '${text}' 🤖`);

        let delay = 0;
        if (controller.audioPlayer) {
            let path = join(__dirname, "../resources/pop.ogg");
            let sound = createAudioResource(createReadStream(path));
            // duration in milliseconds
            delay = sound.playbackDuration + 100;
            controller.audioPlayer.play(sound);
        }

        let runnable = () => CommandExecutor.process(this.client, this.message, text);
        if (delay) setTimeout(runnable, delay);
        else runnable();
    }

    private message: VoiceMessage;
}