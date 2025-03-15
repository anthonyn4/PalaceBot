declare type AudioSource = "YouTube" | "SoundCloud";

export class AudioDetails {

    constructor(source: AudioSource, url: URL, title: string, durationInSec: number) {
        this.source = source;
        this.url = url;
        this.title = title;
        this.durationInSec = durationInSec;
    }

    public source: AudioSource;
    public url: URL;
    public title: string;
    public durationInSec: number;
}