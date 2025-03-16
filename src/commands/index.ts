import { Message, SharedSlashCommand } from "discord.js";
import { VoiceMessage } from "discord-speech-recognition";
import { DiscordClient } from "../DiscordClient";
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
import { QueueCommand } from "./QueueCommand";
import { StopCommand } from "./StopCommand";
import { ResponseCommand } from "./ResponseCommand";

export const Commands: SharedSlashCommand[] = [
    HelpCommand.SlashCommand,
    DisconnectCommand.SlashCommand,
    HistoryCommand.SlashCommand,
    QueueCommand.SlashCommand,
    JoinCommand.SlashCommand,
    LoopCommand.LoopCommand_,
    LoopCommand.ReplayCommand,
    PauseCommand.SlashCommand,
    StopCommand.SlashCommand,
    PlayCommand.SlashCommand,
    QuitCommand.SlashCommand,
    SkipCommand.SlashCommand,
    VolumeCommand.SlashCommand
];

export class CommandExecutor {

    public static getCommand(client: DiscordClient, commandName: string) {
        switch (commandName) {
            case "keep barking":
            case "bark": {
                let command = new ResponseCommand(client);
                if (commandName.startsWith("keep")) {
                    command.args = ["bark", "loop"];
                } else {
                    command.args = ["bark"];
                }
                return command;
            }
            case "connect":
            case "come":
            case "cum":
            case "join": // slash command
            case "j":
                return new JoinCommand(client);
            case "chap": // misheard word
            case "chapley": // misheard word
            case "sharply": // misheard word
            case "playing": // mishead word
            case "played": // mishead word
            case "play": // slash command
            case "resume":
            case "p":
                return new PlayCommand(client);
            case "pause": // slash command
                return new PauseCommand(client);
            case "stop": // slash command
                return new StopCommand(client);
            case "next":
            case "skip": // slash command
            case "thank you next":
                return new SkipCommand(client);
            case "louder":
            case "quieter":
            case "turn":
            case "volume": // slash command
                return new VolumeCommand(client);
            case "replay": // slash command
            case "again": {
                let command = new LoopCommand(client);
                command.args = ["once"];
                return command;
            }
            case "loop": // slash command
            case "repeat":
                return new LoopCommand(client);
            case "quit":
            case "die":
            case "kill yourself":
            case "neck yourself":
            case "end yourself":
                return new QuitCommand(client);
            case "disconnect": // slash command
            case "ff":
                return new DisconnectCommand(client);
            case "history": // slash command
                return new HistoryCommand(client);
            case "queue": // slash command
                return new QueueCommand(client);
            case "help": // slash command
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

        // full text length commands such as phrases
        let command = this.getCommand(client, text);
        if (!command) {
            // single word commands
            command = this.getCommand(client, commandName);
            if (!command) {
                console.log('command not found 💀');
                return;
            }
        }

        command.message = message;
        if (command.args.length == 0) command.args = args;
        command.execute();
    }
}