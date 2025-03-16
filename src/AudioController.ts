import { AudioPlayer, AudioPlayerState, AudioPlayerStatus, AudioResource, createAudioResource, VoiceConnection } from "@discordjs/voice";
import { ActivityType } from "discord.js";
import play from "play-dl";
import { AudioDetails } from "./AudioDetails";
import { DiscordClient } from "./DiscordClient";

export class AudioController {

    public constructor(voiceChannelId: string, voiceConnection: VoiceConnection, audioPlayer: AudioPlayer) {
        this.voiceChannelId = voiceChannelId;
        this.voiceConnection = voiceConnection;
        this.audioPlayer = audioPlayer;
    }

    public async onAudioStateChanged(client: DiscordClient, oldState: AudioPlayerState, newState: AudioPlayerState) {
        switch (newState.status) {
            case AudioPlayerStatus.Buffering:
                return; // don't log, or do anything

            case AudioPlayerStatus.Idle:
                // audio was playing
                if (this.currentAudio != null) {
                    // looping is enabled
                    if (this.loop) {
                        // add the audio to the queue again
                        this.audioQueue.push(this.currentAudio);
                    }

                    // whatever is playing will become the previous song before progressing to the next queue
                    this.previousAudio = this.currentAudio;
                }

                // go to the next audio if available
                if (this.audioQueue.length > 0) {
                    if (await this.playNextAudio()) return;
                }

                // nothing to play. reset activity
                client.bot.user?.setActivity();
                break;
            case AudioPlayerStatus.Playing:
                if (this.currentAudio) {
                    client.bot.user?.setActivity({
                        name: this.currentAudio.title,
                        type: ActivityType.Listening,
                        url: this.currentAudio.url.href
                    });
                    break;
                }
            // if no currentAudio is present, fall thru the switch statement and reset the activity
            case AudioPlayerStatus.Paused:
                client.bot.user?.setActivity();
                break;
        }

        // console.log(`new audio state '${newState.status}' 🎧`);
    }

    public setVolume(volume: number) {
        // clamp value between 0 and 100
        volume = Math.max(0, Math.min(100, volume));

        this.volume = volume;

        // scale between 0.0 and 1.0
        if (this.audioResource?.volume) {
            this.audioResource.volume.volume = volume / 100;
        }
    }

    public async playAudio(details: AudioDetails) {
        switch (details.url.hostname) {
            case "soundcloud.com":
            case "api.soundcloud.com":
            case "www.youtube.com":
                try {
                    const stream = await play.stream(details.url.href);
                    this.audioResource = createAudioResource(stream.stream, {
                        inputType: stream.type,
                        inlineVolume: true
                    });
                    this.setVolume(this.volume);
                    this.audioPlayer.play(this.audioResource);
                    this.currentAudio = details;
                    this.audioHistory.push(details);
                    return true;
                } catch (error: any) {
                    // e.g. YouTube prevents playback when using certain vpns
                    // utf encoding of apostrophe may vary
                    if (error.message.match(/Sign in to confirm you.re not a bot/)) {
                        // ignore the stacktrace and move on
                        console.warn(`${details.url.hostname} thinks im a bot 🤔`);
                    } else console.error(`Failed to stream audio`, error);
                    return false;
                }
                break;
            default:
                console.error("unhandled url 🤷", details.url.href);
                return false;

        }
    }

    public async playNextAudio() {
        const next = this.audioQueue.shift();
        if (!next) {
            if (this.audioPlayer) {
                this.audioPlayer.stop();
                this.audioResource = undefined;
            }
            return undefined;
        }

        switch (next.url.hostname) {
            case "soundcloud.com":
            case "api.soundcloud.com":
                if (!await this.playAudio(next)) {
                    // find a youtube alternative if soundcloud fails
                    let tracks = await play.search(next.title, {
                        limit: 1,
                        source: {
                            youtube: "video"
                        }
                    });

                    if (tracks) {
                        let track = tracks[0];
                        let details = new AudioDetails("YouTube", new URL(track.url), track.title ?? track.url, track.durationInSec);
                        this.playAudio(details);
                        console.log(`found an alternative for '${next.title}' 🥰`);
                    } else {
                        console.log(`i couldn't find an alternative for '${next.title}' 😞`);
                        this.playNextAudio();
                    }
                }
                break;
            case "www.youtube.com":
                if (!await this.playAudio(next)) {
                    // find a soundcloud alternative if youtube fails
                    let tracks = await play.search(next.title, {
                        limit: 1,
                        source: {
                            soundcloud: "tracks"
                        }
                    });

                    if (tracks) {
                        let track = tracks[0];
                        let details = new AudioDetails("SoundCloud", new URL(track.url), track.name ?? track.url, track.durationInSec);
                        this.playAudio(details);
                    } else {
                        console.log(`i couldn't find an alternative for '${next.title}' 😞`);
                        this.playNextAudio();
                    }
                }
                break;
        }
        return next;
    }

    public volume: number = 100;
    public autoplay: boolean = false;
    public loop: boolean = false;

    public voiceChannelId: string;

    public previousAudio: AudioDetails | undefined;
    public currentAudio: AudioDetails | undefined;

    public audioQueue: AudioDetails[] = [];
    public audioHistory: AudioDetails[] = [];

    public voiceConnection: VoiceConnection;
    public audioResource: AudioResource | undefined;
    public audioPlayer: AudioPlayer;
}