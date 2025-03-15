import { ActivityType, ChatInputCommandInteraction, Guild, GuildMember, InteractionContextType, MessageFlags, SlashCommandBuilder, VoiceState } from "discord.js";
import { AudioPlayerState, AudioPlayerStatus, createAudioPlayer, joinVoiceChannel, NoSubscriberBehavior } from "@discordjs/voice";
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
                noSubscriber: NoSubscriberBehavior.Pause,
            }
        });

        const controller = new AudioController(voice.id, connection, player);

        player.on("stateChange", async (oldState: AudioPlayerState, newState: AudioPlayerState) => {
            switch (newState.status) {
                case AudioPlayerStatus.Buffering:
                    return; // don't log, or do anything

                case AudioPlayerStatus.Idle:
                    // audio was playing
                    if (controller.currentAudio != null) {
                        // looping is enabled
                        if (controller.loop) {
                            // add the audio to the queue again
                            controller.audioQueue.push(controller.currentAudio);
                        }

                        // whatever is playing will become the previous song before progressing to the next queue
                        controller.previousAudio = controller.currentAudio;
                    }

                    // go to the next audio if available
                    if (controller.audioQueue.length > 0) {
                        if (await controller.playNextAudio()) return;
                    }

                    // nothing to play. reset activity
                    this.client.bot.user?.setActivity();
                    break;
                case AudioPlayerStatus.Playing:
                    if (controller.currentAudio) {
                        this.client.bot.user?.setActivity({
                            name: controller.currentAudio.title,
                            type: ActivityType.Listening,
                            url: controller.currentAudio.url.href
                        });
                        break;
                    }
                // if no currentAudio is present, fall thru the switch statement and reset the activity
                case AudioPlayerStatus.Paused:
                    this.client.bot.user?.setActivity();
                    break;
            }
            console.log("new audio state 🎧", newState);

        });

        connection.subscribe(player);

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
            const embed = this.getDefaultEmbed();
            embed.setDescription("The bot is already in this voice channel");
            embed.setColor("#ED4245");
            ix.reply({
                embeds: [embed],
                flags: MessageFlags.Ephemeral
            });
            return;
        }

        this.onJoinVoiceChannel(voice, ix.guild!);
    }
}