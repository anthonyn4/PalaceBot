import { ChatInputCommandInteraction, GuildMember, InteractionContextType, MessageFlags, SlashCommandBuilder } from "discord.js";
import { BaseCommand } from "./BaseCommand";

export class SkipCommand extends BaseCommand {

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
        .setName("skip")
        .setDescription("Skips the currenet audio")
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

        controller.playNextAudio().then((details) => {
            let embed = this.getDefaultEmbed();
            if (details) {
                embed.setDescription(`Now playing '${details.title}' 🎶`);
            } else {
                embed.setDescription("No more songs to play 😔");
            }
            ix.reply({
                embeds: [embed],
                flags: MessageFlags.Ephemeral
            });
        });
    }
}