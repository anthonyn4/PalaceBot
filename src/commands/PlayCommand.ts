import { ChatInputCommandInteraction, GuildMember, InteractionContextType, managerToFetchingStrategyOptions, Message, MessageFlags, SlashCommandBuilder, SlashCommandStringOption } from "discord.js";
import { BaseCommand } from "./BaseCommand";
import { JoinCommand } from "./JoinCommand";
import { StringUtil } from "../util/StringUtil";
import { AudioDetails } from "../AudioDetails";
import { AudioController } from "../AudioController";
import play, { SoundCloudTrack } from 'play-dl';

export class PlayCommand extends BaseCommand {

    /**
     * searches for the audio or playlist on the specified streaming service
     * 
     * @param query audio search query
     * @param searchOptions type of search which can be unique to certain streaming services
     * @returns the first track found
     */
    public async getAudioTrack(query: string, searchOptions: {
        youtube?: 'video' | 'playlist' | 'channel';
        spotify?: 'album' | 'playlist' | 'track';
        soundcloud?: 'tracks' | 'playlists' | 'albums';
        deezer?: 'track' | 'playlist' | 'album';
    }) {
        const track = await play.search(query, {
            limit: 1,
            source: searchOptions
        });
        return track;
    }

    /**
     * attempts to play the audio resource and sends a resulting response back to discord
     * 
     * @param controller the audio controller which belongs to the guild the event is triggered in
     * @param url the url of the audio
     * @param details front-end details of the audio
     * @returns true if the audio is queued or initialzed
     */
    public async playAudio(controller: AudioController, url: URL, details?: AudioDetails) {
        let embed = this.getDefaultEmbed();

        if (!details) {
            switch (url.hostname) {
                case "soundcloud.com":
                case "api.soundcloud.com":
                    let sc = await play.soundcloud(url.href);
                    details = new AudioDetails("SoundCloud", url, sc.name, sc.durationInSec);
                    break;
                case "www.youtube.com":
                    let yo = (await play.video_basic_info(url.href)).video_details;
                    details = new AudioDetails("YouTube", url, yo.title ?? yo.url, yo.durationInSec);
                    break;
                default:
                    embed = this.getErrorEmbed();
                    return embed.setDescription("The provided link is unsupported. Please only use YouTube and SoundCloud links.");
            }
        }

        // embed.setURL(url.href);

        // audio resource exists and hasn't ended (being paused does not mean ended)
        if (controller.audioResource && !controller.audioResource.ended) {
            controller.audioQueue.push(details);
            embed.setFooter({ text: `${controller.audioQueue.length} songs queued | ${controller.audioHistory.length} songs played | 🔁 ${controller.loop ? "ON" : "OFF"} | ⏩ ${controller.autoplay ? "ON" : "OFF"}` });

            embed.setTitle(`🎶 Found on ${details.source}`);
            embed.setDescription(`[${details.title}](${details.url}) added to the queue ⏳`);
            embed.setAuthor({ name: StringUtil.formatSeconds(details.durationInSec) });
        }

        embed.setFooter({ text: `${controller.audioQueue.length} songs queued | ${controller.audioHistory.length} songs played | 🔁 ${controller.loop ? "ON" : "OFF"} | ⏩ ${controller.autoplay ? "ON" : "OFF"}` });
        if (await controller.playAudio(details)) {
            embed.setTitle(`🎶 Playing from ${details.source}`);
            embed.setDescription(`Now playing [${details.title}](${details.url}) 🎶`);
            embed.setAuthor({ name: StringUtil.formatSeconds(details.durationInSec) });
        }

        return embed;
    }

    public execute() {
        const guild = this.message!.guild;
        const voice = this.message!.member?.voice;
        if (!guild || !voice) return;

        let controller = this.client.voiceConnections.get(guild.id);
        // not in a voice channel
        if (!controller) {
            // join the current voice channel
            new JoinCommand(this.client, this.message, []).execute();
            controller = this.client.voiceConnections.get(guild.id);
            // still not in a voice channel
            if (!controller) return;
        }

        if (voice.id != controller.voiceChannelId) return;

        let query = this.args.join(" ");
        this.onPlayAudio(controller, query);
    }

    public async onPlayAudio(controller: AudioController, query: string) {
        let embed = this.getDefaultEmbed();

        if (query.length == 0) {
            embed.setDescription("Audio resumed");
            controller.audioPlayer.unpause();
            return embed;
        }

        // a direct link to the audio is provided. in this case, only a link shold be provided
        //  therefore only one argument should be available. links should not contain any spaces
        if (this.args[0].startsWith("http")) {
            try {
                // play audio via url, details will be retrieved later
                const url = new URL(this.args[0]);
                return await this.playAudio(controller, url);
            } catch (error: any) {
                console.error('Failed to play audio', error);

                embed = this.getErrorEmbed();
                embed.setDescription(`An error occurred while processing the link.\r\n\`\`\`${error.message}\`\`\``);
                return embed;
            }
        }

        console.log(`looking for '${query}' on YouTube 🔎`);
        let res = await this.getAudioTrack(query, { youtube: "video" })
        if (res) {
            let first = res[0];
            let url = new URL(first.url);
            let details = new AudioDetails("YouTube", url, first.title ?? url.href, first.durationInSec);
            if (embed = await this.playAudio(controller, url, details)) {
                return embed;
            }
        }

        console.log(`failed... looking for '${query}' on SoundCloud 🔎`);
        res = await this.getAudioTrack(query, { soundcloud: "tracks" });
        let first = res[0];
        if (first instanceof SoundCloudTrack) {
            let url = new URL(first.url);
            let details = new AudioDetails("SoundCloud", url, first.name, first.durationInSec);
            embed = await this.playAudio(controller, url, details);
            return embed;
        }

        console.log(`failed... '${query}' could not be found 😞`);
        embed = this.getErrorEmbed();
        embed.setDescription(`Failed to find anything named '${query}'`);
        return embed;
    }

    public static SlashCommand = new SlashCommandBuilder()
        .setName("play")
        .setDescription("Plays/ queues a new audio or resumes the current audio")
        .addStringOption((opt) => {
            return opt
                .setName("audio")
                .setDescription("URL or name of audio to play")
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
        let query = ix.options.getString("audio", false);
        this.onPlayAudio(controller, query ?? "").then((response) => {
            if (response) {
                ix.reply({
                    embeds: [response],
                    flags: MessageFlags.Ephemeral
                });
            } else {
                ix.deferReply();
            }
        });
    }
}