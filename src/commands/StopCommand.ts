import { ChatInputCommandInteraction, GuildMember, InteractionContextType, SlashCommandBuilder } from "discord.js";
import { BaseCommand } from "./BaseCommand";

export class StopCommand extends BaseCommand {
    public execute() {
        const guild = this.message!.guild;
        const voice = this.message!.member?.voice;
        if (!guild || !voice) return;

        let controller = this.client.voiceConnections.get(guild.id);
        if (!controller) return;
        if (voice.id != controller.voiceChannelId) return;

        controller.playNextAudio();
    }

    public static SlashCommand = new SlashCommandBuilder()
        .setName("stop")
        .setDescription("Stops the current audio")
        .setContexts(InteractionContextType.Guild);

    public interact(ix: ChatInputCommandInteraction): void {
        if (!(ix.member instanceof GuildMember)) {
            ix.deferReply();
            return;
        }
        const voice = ix.member.voice;
        const controller = this.client.voiceConnections.get(ix.guildId!);
        if (!controller || controller.voiceChannelId != voice.channel?.id) {
            ix.deferReply();
            return;
        }

        controller.audioPlayer.stop();
    }
}