const {Client, GatewayIntentBits, Partials} = require('discord.js');


const client = new Client({ 
    intents: [   
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages, 
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.GuildMessageReactions,
        GatewayIntentBits.MessageContent
    ],
    partials: [Partials.Channel],
    allowedMentions: {repliedUser: false}
}); 

module.exports = {client}