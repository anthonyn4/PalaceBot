import { AudioPlayer, AudioResource, createAudioResource, VoiceConnection } from "@discordjs/voice";
import { AudioDetails } from "./AudioDetails";
import play from "play-dl";
import { LimitedCollection } from "discord.js";

export class AudioController {

    public constructor(voiceChannelId: string, voiceConnection: VoiceConnection, audioPlayer: AudioPlayer) {
        this.voiceChannelId = voiceChannelId;
        this.voiceConnection = voiceConnection;
        this.audioPlayer = audioPlayer;
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
        if (!next) return undefined;

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