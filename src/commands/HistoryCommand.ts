import { ChatInputCommandInteraction, GuildMember, InteractionContextType, MessageFlags, SlashCommandBuilder } from "discord.js";
import { StringUtil } from "../util/StringUtil";
import { BaseCommand } from "./BaseCommand";
import { AudioController } from "src/AudioController";

export class HistoryCommand extends BaseCommand {
    public execute(): void {
        const guild = this.message!.guild;
        const voice = this.message!.member?.voice;
        if (!guild || !voice) return;

        let controller = this.client.voiceConnections.get(guild.id);
        if (!controller) return;
        if (voice.id != controller.voiceChannelId) return;

        this.sendEmbed(this.getHistoryEmbed(controller));
    }

    public getHistoryEmbed(controller: AudioController) {
        const embed = this.getDefaultEmbed();
        embed.setFooter({ text: `${controller.audioQueue.length} songs queued | ${controller.audioHistory.length} songs played | 🔁 ${controller.loop ? "ON" : "OFF"} | ⏩ ${controller.autoplay ? "ON" : "OFF"}` });

        let text = "";
        controller.audioHistory.forEach((details) => {
            text += `${StringUtil.formatSeconds(details.durationInSec)} ${details.title}`;
        });
        if (text.length == 0) text = "No songs have been played";
        embed.setDescription(text);
        return embed;
    }

    public static SlashCommand = new SlashCommandBuilder()
        .setName("history")
        .setDescription("View a list of audios played")
        .setContexts(InteractionContextType.Guild);

    public interact(ix: ChatInputCommandInteraction): void {
        if (!(ix.member instanceof GuildMember)) {
            ix.deferReply();
            return;
        }
        let controller = this.client.voiceConnections.get(ix.guildId!);
        if (!controller) {
            ix.deferReply();
            return;
        }
        if (ix.member.voice.id != controller.voiceChannelId) {
            ix.deferReply();
            return;
        }

        ix.reply({
            embeds: [this.getHistoryEmbed(controller)],
            flags: MessageFlags.Ephemeral
        })
    }
}