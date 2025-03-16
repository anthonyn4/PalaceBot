import { ChatInputCommandInteraction, EmbedBuilder, Message } from "discord.js";
import { VoiceMessage } from "discord-speech-recognition";
import { DiscordClient } from "../DiscordClient";

export abstract class BaseCommand {

    constructor(client: DiscordClient, message?: Message | VoiceMessage, args?: string[]) {
        this.client = client;
        this.message = message;
        this.args = args || [];
    }

    public abstract execute(): void;

    public abstract interact(ix: ChatInputCommandInteraction): void;

    public getDefaultEmbed() {
        const embed = new EmbedBuilder();
        embed.setColor("#FFC137");
        return embed;
    }

    public getErrorEmbed() {
        const embed = new EmbedBuilder();
        embed.setColor("#ED4245");
        return embed;
    }

    public sendEmbed(embed: EmbedBuilder) {
        if (this.message instanceof Message) {
            this.message.reply({ embeds: [embed] });
        } else if (this.message instanceof VoiceMessage) {
            this.message.channel.send({ embeds: [embed] });
        }

        return undefined;
    }

    public deleteMessage() {
        if (this.message instanceof Message) {
            (this.message as Message).delete();
        }
    }

    protected client: DiscordClient;
    public message?: Message | VoiceMessage;
    public args: string[];
}