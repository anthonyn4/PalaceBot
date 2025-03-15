import { REST, Routes } from 'discord.js';
import { Commands } from "./commands";
import dotenv from 'dotenv';

dotenv.config();

const GUILD_ID: string = "";

export class Test {

    public static async registerSlashCommands() {
        let commands = [...Commands].map((cmd) => {
            console.log(`processing command '${cmd.name}'`);
            return cmd.toJSON();
        });

        const rest = new REST().setToken(process.env.DISCORD_TOKEN!);
        await (async () => {
            try {
                // update globally
                // The put method is used to fully refresh all commands in the guild with the current set
                // const data = await rest.put(
                //     Routes.applicationCommands(process.env.DISCORD_APPLICATION_ID!),
                //     { body: commands },
                // );

                // update a single guild
                // const data = await rest.put(
                //     Routes.applicationGuildCommands(process.env.DISCORD_APPLICATION_ID!, GUILD_ID),
                //     { body: commands },
                // );

                if (data instanceof Array) {
                    console.log(`registered ${data.length} commands ☝🤓`);
                } else {
                    console.log(data);
                }
            } catch (error) {
                // And of course, make sure you catch and log any errors!
                console.log(error);
            }
        })();
    }
}

Test.registerSlashCommands();