import { createAudioResource } from '@discordjs/voice';
import { REST, Routes } from 'discord.js';
import { createReadStream } from 'fs';
import { join } from 'path';
import dotenv from 'dotenv';

import { Commands } from "./commands";

dotenv.config();

const GUILD_ID: string = "246119981106987008";

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
                const data = await rest.put(
                    Routes.applicationCommands(process.env.DISCORD_APPLICATION_ID!),
                    { body: [] },
                );

                // update a single guild
                // const data = await rest.put(
                //     Routes.applicationGuildCommands(process.env.DISCORD_APPLICATION_ID!, GUILD_ID),
                //     { body: [] },
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

    public static getAudioSource() {
        let path = join("./resources/open.ogg");
        let resource = createAudioResource(createReadStream(path));
        console.log(resource, __dirname, path);
    }
}

Test.registerSlashCommands();
// Test.getAudioSource();