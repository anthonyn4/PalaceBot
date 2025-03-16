import { Message, User } from "discord.js";
import { addSpeechEvent, resolveSpeechWithWitai, SpeechOptions, VoiceMessage } from "discord-speech-recognition";
import { VoiceEvent } from "./VoiceEvent";
import { ReadyEvent } from "./ReadyEvent";
import { MessageEvent } from "./MessageEvent";
import { ShutDownEvent } from "./ShutDownEvent";
import { DiscordClient } from "../DiscordClient";
import { InteractionCreateEvent } from "./InteractionCreateEvent";

export class EventManager {

    public static registerEvents(client: DiscordClient) {

        const WITAI_TOKEN = process.env.WITAI_SERVER_TOKEN;

        const speechOptions: SpeechOptions = {
            profanityFilter: false,
            // duration is assumed to be in seconds (https://discordsr.netlify.app/classes/voicemessage)
            // reduce the minimum value so that short voice inputs can be processed
            minimalVoiceMessageDuration: 0,
            shouldProcessSpeech: (user: User) => {
                return !user.bot;
            }
        };

        if (WITAI_TOKEN) {
            speechOptions.speechRecognition = (audioBuffer, options) => {
                return resolveSpeechWithWitai(audioBuffer, {
                    key: "VZXRGXJ5QIZSZE6GZ5I44W2YU5OJYB42"
                });
            };
        }

        addSpeechEvent(client.bot, speechOptions);

        client.bot.once("ready", () => new ReadyEvent(client).execute());
        client.bot.once("shardDisconnect", () => new ShutDownEvent(client).execute());
        client.bot.on("messageCreate", (message: Message) => new MessageEvent(client, message).execute());
        client.bot.on("speech", (message: VoiceMessage) => new VoiceEvent(client, message).execute());
        client.bot.on("interactionCreate", (ix) => new InteractionCreateEvent(client, ix).execute());
    }
}