import { ChatInputCommandInteraction, InteractionContextType, PermissionFlagsBits, SlashCommandBuilder } from "discord.js";
import { createAudioResource } from "@discordjs/voice";
import { join } from "path";
import { createReadStream } from "fs";
import { BaseCommand } from "./BaseCommand";

export class QuitCommand extends BaseCommand {
    public execute() {
        const guild = this.message!.guild;
        const voice = this.message!.member?.voice;
        if (!guild || !voice) return;

        let controller = this.client.voiceConnections.get(guild.id);
        if (!controller) return;
        if (voice.id != controller.voiceChannelId) return;

        let path = join(__dirname, "../resources/classic_hurt.ogg");
        let sound = createAudioResource(createReadStream(path));
        let delay = sound.playbackDuration + 200;
        controller.audioPlayer.play(sound);

        setTimeout(() => {
            this.client.bot.destroy();
        }, delay);
    }

    public static SlashCommand = new SlashCommandBuilder()
        .setName("quit")
        .setDescription("Terminates")
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .setContexts(InteractionContextType.Guild);

    public interact(ix: ChatInputCommandInteraction): void {
        this.client.bot.destroy();
    }
}