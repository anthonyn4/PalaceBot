import { Message, SharedSlashCommand, SlashCommandBuilder } from "discord.js";
import { VoiceMessage } from "discord-speech-recognition";
import { JoinCommand } from "./JoinCommand";
import { PlayCommand } from "./PlayCommand";
import { PauseCommand } from "./PauseCommand";
import { SkipCommand } from "./SkipCommand";
import { VolumeCommand } from "./VolumeCommand";
import { LoopCommand } from "./LoopCommand";
import { QuitCommand } from "./QuitCommand";
import { DisconnectCommand } from "./DisconnectCommand";
import { HistoryCommand } from "./HistoryCommand";
import { HelpCommand } from "./HelpCommand";

import { Pair } from "../util/Pair";
import { DiscordClient } from "../DiscordClient";
import { QueueCommand } from "./QueueCommand";

export const Commands: SharedSlashCommand[] = [
    HelpCommand.SlashCommand,
    DisconnectCommand.SlashCommand,
    HistoryCommand.SlashCommand,
    QueueCommand.SlashCommand,
    JoinCommand.SlashCommand,
    LoopCommand.LoopCommand_,
    LoopCommand.ReplayCommand,
    PauseCommand.SlashCommand,
    PlayCommand.SlashCommand,
    QuitCommand.SlashCommand,
    SkipCommand.SlashCommand,
    VolumeCommand.SlashCommand
];

export class CommandExecutor {

    public static getCommand(client: DiscordClient, commandName: string) {
        switch (commandName) {
            case "connect":
            case "come":
            case "cum":
            case "join":
            case "j":
                return new JoinCommand(client);
            case "play":
            case "p":
                return new PlayCommand(client);
            case "pause":
                return new PauseCommand(client);
            case "next":
            case "skip":
            case "thank you next":
                return new SkipCommand(client);
            case "louder":
            case "quieter":
            case "turn":
                return new VolumeCommand(client);
            case "volume":
                return new VolumeCommand(client);
            case "replay":
            case "loop":
            case "repeat":
                return new LoopCommand(client);
            case "quit":
            case "die":
            case "kill yourself":
            case "neck yourself":
            case "end yourself":
                return new QuitCommand(client);
            case "disconnect":
            case "ff":
                return new DisconnectCommand(client);
            case "history":
                return new HistoryCommand(client);
            case "help":
            case "commands":
                return new HelpCommand(client);
            default:
                return undefined;
        }
    }

    /**
     * 
     * @param client the Discord client instance
     * @param message the message object that triggered the command
     * @param text the command syntax excluding the trigger text prefix/ voice activation word
     */
    public static async process(client: DiscordClient, message: Message | VoiceMessage, text: string) {

        // no private messages
        if (message.channel.isDMBased()) return;

        const split = text.split(' ');
        const commandName = split[0];
        const args = split.slice(1);

        let command = this.getCommand(client, text);
        if (command) {
            command.message = message;
            command.args = args;
            command.execute();
            return;
        }
        switch (commandName) {
            case "connect":
            case "come":
            case "cum":
            case "join":
            case "j":
                new JoinCommand(client, message, args).execute();
                break;
            case "play":
            case "p":
                new PlayCommand(client, message, args).execute();
                break;
            case "pause":
                new PauseCommand(client, message, args).execute();
                break;
            case "next":
            case "skip":
                new SkipCommand(client, message, args).execute();
                break;
            case "louder":
            case "quieter":
            case "turn":
                new VolumeCommand(client, message, [commandName]).execute();
                break;
            case "volume":
                new VolumeCommand(client, message, args).execute();
                break;
            case "replay":
                new LoopCommand(client, message, ["once"]).execute();
            case "loop":
            case "repeat":
                new LoopCommand(client, message, args).execute();
                break;
            case "quit":
            case "die":
                new QuitCommand(client, message, args).execute();
                break;
            case "disconnect":
            case "ff":
                new DisconnectCommand(client, message, args).execute();
                break;
            case "history":
                new HistoryCommand(client, message, args).execute();
                break;
            case "help":
            case "commands":
                new HelpCommand(client, message, args).execute();
                break;
            default:
                console.log('command not found 💀');
                break;
        }
    }
}