import { ChatInputCommandInteraction } from "discord.js";
import { createAudioResource } from "@discordjs/voice";
import { join } from "path";
import { createReadStream } from "fs";

import { AudioController } from "../AudioController";
import { BaseCommand } from "./BaseCommand";

export class ResponseCommand extends BaseCommand {
    public execute(): void {
        const guild = this.message!.guild;
        const voice = this.message!.member?.voice;
        if (!guild || !voice) return;

        if (this.message!.member?.voice != voice) return;

        const controller = this.client.voiceConnections.get(guild.id);
        if (!controller) return;

        const loop = this.args.length == 2 && this.args[1] == "loop";
        controller.loop = loop;

        switch (this.args[0]) {
            case "bark":
                if (loop) {
                    this.loop(controller, () => this.bark(controller), 1500);
                } else {
                    this.growl(controller);
                    setTimeout(() => this.bark(controller), 1000);
                }
                break;
        }
    }

    public loop(controller: AudioController, action: any, delay: number) {
        action();

        if (controller.loop) setTimeout(() => this.loop(controller, action, delay), delay);
    }

    public growl(controller: AudioController) {
        let audioFile = "growl" + (Math.floor(Math.random() * 3 + 1)) + ".ogg";
        let path = join(__dirname, "../resources/wolf/", audioFile);
        let resource = createAudioResource(createReadStream(path));
        controller.audioPlayer.play(resource);
    }

    public bark(controller: AudioController) {
        let audioFile = "bark" + (Math.floor(Math.random() * 3 + 1)) + ".ogg";
        let path = join(__dirname, "../resources/wolf/", audioFile);
        let resource = createAudioResource(createReadStream(path));
        controller.audioPlayer.play(resource);
    }

    public interact(ix: ChatInputCommandInteraction): void {
        // don't do anything
    }
}