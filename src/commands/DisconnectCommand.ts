import { ChatInputCommandInteraction, GuildMember, InteractionContextType, SlashCommandBuilder, VoiceState } from "discord.js";
import { BaseCommand } from "./BaseCommand";

export class DisconnectCommand extends BaseCommand {
    public execute() {
        const guild = this.message!.guild;
        const voice = this.message!.member?.voice;
        if (!guild || !voice) return;

        this.onDisconnect(guild.id, voice);
    }

    public onDisconnect(guildId: string, voice: VoiceState) {
        let controller = this.client.voiceConnections.get(guildId);
        if (!controller) return;
        if (voice.id != controller.voiceChannelId) return;

        if (controller.voiceConnection.disconnect()) {
            this.client.voiceConnections.delete(guildId);
        }
    }

    public static SlashCommand = new SlashCommandBuilder()
        .setName("disconnect")
        .setDescription("Disconnect from the voice channel")
        .setContexts(InteractionContextType.Guild);

    public interact(ix: ChatInputCommandInteraction): void {
        ix.deferReply();

        if (!(ix.member instanceof GuildMember)) return;
        const voice = ix.member.voice
        this.onDisconnect(ix.guildId!, voice);
    }
}