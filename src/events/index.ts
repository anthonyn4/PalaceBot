import { Message, User } from "discord.js";
import { addSpeechEvent, VoiceMessage } from "discord-speech-recognition";
import { VoiceEvent } from "./VoiceEvent";
import { ReadyEvent } from "./ReadyEvent";
import { MessageEvent } from "./MessageEvent";
import { DisconnectEvent } from "./DisconnectEvent";
import { DiscordClient } from "../DiscordClient";
import { InteractionCreateEvent } from "./InteractionCreateEvent";

export class EventManager {

    public static registerEvents(client: DiscordClient) {
        addSpeechEvent(client.bot, {
            profanityFilter: false,
            // duration is assumed to be in seconds (https://discordsr.netlify.app/classes/voicemessage)
            // reduce the minimum value so that short voice inputs can be processed
            minimalVoiceMessageDuration: 0.5,
            shouldProcessSpeech: (user: User) => {
                return !user.bot;
            }
        });

        client.bot.once("ready", () => new ReadyEvent(client).execute());
        client.bot.once("shardDisconnect", () => new DisconnectEvent(client).execute());
        client.bot.on("messageCreate", (message: Message) => new MessageEvent(client, message).execute());
        client.bot.on("speech", (message: VoiceMessage) => new VoiceEvent(client, message).execute());
        client.bot.on("interactionCreate", (ix) => new InteractionCreateEvent(client, ix).execute());
    }
}