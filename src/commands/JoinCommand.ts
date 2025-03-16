import { ChatInputCommandInteraction, Guild, GuildMember, InteractionContextType, MessageFlags, SlashCommandBuilder, VoiceState } from "discord.js";
import { createAudioPlayer, createAudioResource, joinVoiceChannel, NoSubscriberBehavior } from "@discordjs/voice";
import { createReadStream } from "fs";
import { join } from "path";
import { BaseCommand } from "./BaseCommand";
import { AudioController } from "../AudioController";

export class JoinCommand extends BaseCommand {
    public execute() {
        const guild = this.message!.guild;
        const voice = this.message!.member?.voice;
        if (!guild || !voice) return;

        let existing: AudioController | undefined = this.client.voiceConnections.get(guild.id);
        if (existing) {
            if (existing.voiceChannelId == voice.id) {
                // already in the voice channnel
                return;
            }
        }

        this.onJoinVoiceChannel(voice, guild);
    }

    public onJoinVoiceChannel(voice: VoiceState, guild: Guild) {
        const connection = joinVoiceChannel({
            channelId: voice.channelId!,
            guildId: guild.id,
            adapterCreator: guild.voiceAdapterCreator,
            selfMute: false,
            selfDeaf: false
        });

        const player = createAudioPlayer({
            behaviors: {
                noSubscriber: NoSubscriberBehavior.Pause, // default pause
                maxMissedFrames: 0 // default 5
            },
        });
        const controller = new AudioController(voice.id, connection, player);

        player.on("stateChange", async (oldState, newState) => controller.onAudioStateChanged(this.client, oldState, newState));
        connection.subscribe(player);

        // play a sound to indicate the bot is ready
        let resource = createAudioResource(createReadStream(join(__dirname, "../resources/open.ogg")));
        player.play(resource);

        this.client.voiceConnections.set(guild.id, controller);
    }

    public static SlashCommand = new SlashCommandBuilder()
        .setName("join")
        .setDescription("Join your voice channel")
        .setContexts(InteractionContextType.Guild);

    public interact(ix: ChatInputCommandInteraction): void {
        if (!(ix.member instanceof GuildMember)) {
            ix.deferReply();
            return;
        }
        const voice = ix.member.voice;
        const controller = this.client.voiceConnections.get(ix.guildId!);
        if (!controller) {
            ix.deferReply();
            return;
        }
        if (voice.channel?.id == controller.voiceChannelId) {
            const embed = this.getErrorEmbed();
            embed.setDescription("The bot is already in this voice channel");
            ix.reply({
                embeds: [embed],
                flags: MessageFlags.Ephemeral
            });
            return;
        }

        this.onJoinVoiceChannel(voice, ix.guild!);
    }
}