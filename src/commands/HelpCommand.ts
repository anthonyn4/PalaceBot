import { ChatInputCommandInteraction, EmbedField, InteractionContextType, MessageFlags, SlashCommandBuilder } from "discord.js";
import { Commands } from "./";
import { BaseCommand } from "./BaseCommand";


export class HelpCommand extends BaseCommand {

    public execute(): void {
        this.sendEmbed(this.getHelpEmbed());
    }

    public getHelpEmbed() {
        const embed = this.getDefaultEmbed();
        embed.setDescription(`${Commands.length} commands\r\nActivation word: "${process.env.CMD_VOICE_TRIGGER}"`);

        let fields: EmbedField[] = [];
        Commands.forEach((cmd) => {
            let name = `${process.env.CMD_TEXT_PREFIX}${cmd.name}`;
            fields.push({ name: name, value: cmd.description, inline: false });
        });
        embed.addFields(fields);

        return embed;
    }

    public static SlashCommand = new SlashCommandBuilder()
        .setName("help")
        .setDescription("Displays a list of available commands.")
        .setContexts(InteractionContextType.Guild);

    public interact(ix: ChatInputCommandInteraction): void {
        ix.reply({
            embeds: [this.getHelpEmbed()],
            flags: MessageFlags.Ephemeral
        });
    }
}