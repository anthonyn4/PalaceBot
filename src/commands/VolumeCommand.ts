import { ChatInputCommandInteraction, GuildMember, InteractionContextType, MessageFlags, SlashCommandBuilder } from "discord.js";
import { BaseCommand } from "./BaseCommand";
import { AudioController } from "../AudioController";

export class VolumeCommand extends BaseCommand {
    public execute() {
        const guild = this.message!.guild;
        const voice = this.message!.member?.voice;
        if (!guild || !voice) return;

        let controller = this.client.voiceConnections.get(guild.id);
        if (!controller) return;
        if (voice.id != controller.voiceChannelId) return;

        this.sendEmbed(this.onSetVolume(controller, this.args));
    }

    public onSetVolume(controller: AudioController, args: string[]) {
        let embed = this.getDefaultEmbed();

        let volume = controller.volume;
        if (args.length == 0) {
            embed.setDescription(`Current volume is ${controller.volume}%`);
        } else if (isNaN(parseInt(args[0]))) {
            switch (args[0]) {
                case "louder":
                    volume = volume + 10;
                    embed.setDescription(`Volume increased to ${controller.volume}%`);
                    break;
                case "quieter":
                    volume = volume - 10;
                    embed.setDescription(`Volume decreased to ${controller.volume}%`);
                    break;
                case "turn":
                    if (args.length > 1) {
                        let old = volume;
                        if (args[1] == "up") volume = 100;
                        else if (args[1] == "down") volume = 0;
                        else {
                            embed = this.getErrorEmbed();
                            embed.setDescription(`Invalid option '${args[1]}'`);
                            return embed;
                        }

                        embed.setDescription(`Volume ${volume >= old ? "increased" : "decreased"} to ${controller.volume}%`);
                    }
                    break;
                default:
                    embed = this.getErrorEmbed();
                    embed.setDescription("Please enter a value between 0 and 100");
                    return embed;
            }
        }

        volume = parseInt(args[0]);
        volume = Math.max(0, Math.min(100, volume));
        controller.setVolume(volume);
        embed.setDescription(`Volume set to ${volume}%`);
        return embed;
    }

    public static SlashCommand = new SlashCommandBuilder()
        .setName("volume")
        .setDescription("Adjusts the audio volume (0 to 100 inclusive)")
        .addStringOption((opt) => {
            return opt
                .setName("volume")
                .setDescription("Volume percentage to apply to audio")
                .setRequired(false);
        })
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

        let volume = ix.options.getString("volume", false);
        if (volume) {
            ix.reply({
                embeds: [this.onSetVolume(controller, [volume])],
                flags: MessageFlags.Ephemeral
            });
        } else {
            let embed = this.getDefaultEmbed();
            embed.setDescription(`The volume is currently at ${controller.volume}%`);
            ix.reply({
                embeds: [embed],
                flags: MessageFlags.Ephemeral
            });
        }
    }
}