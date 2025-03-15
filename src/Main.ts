import { Client, GatewayIntentBits, Partials } from 'discord.js';
import https from 'https';
import dotenv from 'dotenv';
import { Auth } from './Auth';
import { EventManager } from './events';
import { DiscordClient } from './DiscordClient';

console.log("warming up 🐌");

dotenv.config();

const request = https.request("https://www.youtube.com/watch?v=dQw4w9WgXcQ", (res) => {
    Auth.refresh(res.headers['set-cookie']!.join("")).then(() => {
        const client = new DiscordClient(new Client({
            intents: [
                GatewayIntentBits.Guilds,
                GatewayIntentBits.GuildMessages,
                GatewayIntentBits.GuildVoiceStates,
                GatewayIntentBits.MessageContent
            ],
            partials: [Partials.Channel],
        }));

        EventManager.registerEvents(client);
        client.bot.login(process.env.DISCORD_TOKEN);
    }).catch((error) => {
        console.error("Failed to initialize", error)
    });
});

request.end();