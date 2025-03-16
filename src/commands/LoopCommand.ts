import { ChatInputCommandInteraction, GuildMember, InteractionContextType, MessageFlags, SlashCommandBuilder } from "discord.js";
import { BaseCommand } from "./BaseCommand";
import { AudioController } from "src/AudioController";

export class LoopCommand extends BaseCommand {
    public execute() {
        const guild = this.message!.guild;
        const voice = this.message!.member?.voice;
        if (!guild || !voice) return;

        let controller = this.client.voiceConnections.get(guild.id);
        if (!controller) return;
        if (voice.id != controller.voiceChannelId) return;

        this.sendEmbed(this.onToggleLoopAudio(controller, this.args.length == 1 && this.args[1] == "once"));
    }

    public onToggleLoopAudio(controller: AudioController, once: boolean) {
        controller.loop = !controller.loop;

        const embed = this.getDefaultEmbed();
        embed.setFooter({ text: `${controller.audioQueue.length} songs queued | ${controller.audioHistory.length} songs played | 🔁 ${controller.loop ? "ON" : "OFF"} | ⏩ ${controller.autoplay ? "ON" : "OFF"}` });

        if (once && controller.currentAudio) {
            controller.audioQueue.push(controller.currentAudio);

            embed.setDescription(`🔁 '${controller.currentAudio.title}' will be replayed`);
            return embed;
        }

        embed.setDescription(`🔁 '${controller.currentAudio?.title}' is ${controller.loop ? "now looping" : "no longer looping"}`);
        return embed;
    }

    public static LoopCommand_ = new SlashCommandBuilder()
        .setName("loop")
        .setDescription("Infinitely loops the current audio")
        .setContexts(InteractionContextType.Guild);

    public static ReplayCommand = new SlashCommandBuilder()
        .setName("replay")
        .setDescription("Re-adds the current audio to the queue")
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
        const embed = this.onToggleLoopAudio(controller, ix.commandName == "replay");
        ix.reply({
            embeds: [embed],
            flags: MessageFlags.Ephemeral
        });
    }
}