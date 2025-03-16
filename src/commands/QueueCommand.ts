import { ChatInputCommandInteraction, EmbedField, GuildMember, InteractionContextType, MessageFlags, SlashCommandBuilder } from "discord.js";
import { StringUtil } from "../util/StringUtil";
import { BaseCommand } from "./BaseCommand";
import { AudioController } from "../AudioController";

export class QueueCommand extends BaseCommand {
    public execute() {
        const guild = this.message!.guild;
        const voice = this.message!.member?.voice;
        if (!guild || !voice) return;

        let controller = this.client.voiceConnections.get(guild.id);
        if (!controller) return;
        if (voice.id != controller.voiceChannelId) return;

        this.sendEmbed(this.onQueueHistory(controller));
    }

    public onQueueHistory(controller: AudioController) {
        const embed = this.getDefaultEmbed();
        embed.setAuthor({
            name: "Currently Queued"
        })
        embed.setFooter({ text: `${controller.audioQueue.length} songs queued | ${controller.audioHistory.length} songs played | 🔁 ${controller.loop ? "ON" : "OFF"} | ⏩ ${controller.autoplay ? "ON" : "OFF"}` });

        let fields: EmbedField[] = [];
        controller.audioQueue.forEach((details) => {
            fields.push({ name: details.title, value: StringUtil.formatSeconds(details.durationInSec), inline: false });
        });
        embed.addFields(fields);

        if (fields.length == 0) embed.setDescription("No songs have been queued");
        return embed;
    }

    public static SlashCommand = new SlashCommandBuilder()
        .setName("queue")
        .setDescription("View a list of audios queued")
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
        ix.reply({
            embeds: [this.onQueueHistory(controller)],
            flags: MessageFlags.Ephemeral
        });
    }
}