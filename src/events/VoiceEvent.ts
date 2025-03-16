import { createAudioResource } from "@discordjs/voice";
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

        const activationWord = process.env.CMD_VOICE_TRIGGER;
        let text = this.message.content?.toLowerCase();

        if (!text || !activationWord) return;
        if (!text.startsWith(activationWord)) {
            console.log(`i heard '${text}', must have been the wind 🤫`);
            return;
        }
        text = text.slice(activationWord.length).trim();

        console.log(`received voice command '${text}' 🤖`);

        let controller = this.client.voiceConnections.get(this.message.guild.id)
        if (!controller) {
            console.log("no audio controller found for voice controls 🤔");
            return;
        }

        let delay = 0;
        if (controller.audioPlayer) {
            let sound = createAudioResource("./down.mp3", {
                inlineVolume: true
            });
            // duration in milliseconds
            delay = sound.playbackDuration + 100;
            // volume may be adjusted for audios.
            // reset here as it will be automatically adjusted later
            controller.setVolume(100);
            controller.audioPlayer.play(sound);
        }

        let runnable = () => CommandExecutor.process(this.client, this.message, text);
        if (delay) setTimeout(runnable, delay);
        else runnable();
    }

    private message: VoiceMessage;
}