/*
    Features to add:
    Run and control the bot from a single embed
    Slash commands
    Find a way to auto-refresh youtube cookie/bypass age-restricted content
*/

const {Events, Message, Guild} = require('discord.js');
const {getVoiceConnection} = require('@discordjs/voice');

const {
    prefix,
    token,
    geniusApiKey,
    keyword,
} = require('./config.json');


const { addSpeechEvent, SpeechEvents } = require("discord-speech-recognition");
const playDL = require('play-dl');
const { client } = require('./modules/client')
const { connect } = require('./modules/connect');
const { queue, skip, skipto, clear, stop, loopSong, showQueue, shuffle } = require('./modules/queue');
const { validateRequest, autoplay, seek, forward, pause, resume, replay, volume, lyrics} = require('./modules/song')

addSpeechEvent(client, {profanityFilter: false});


client.once('ready', () =>{
    console.log("PALACE BAY is online!");
});
client.once('reconnect', () =>{
    console.log("PALACE BAY is reconnecting...");
});
// client.on('disconnect', () =>{
//     console.log("PALACE BAY has disconnected.");
// });

playDL.getFreeClientID().then((clientID) => playDL.setToken({
    soundcloud : {
        client_id : clientID
    }
}))

// playDL.setToken({
//     youtube : {
//         cookie : ytcookie
//     }
// })

const messageHandler = (message) => {
    if (message.author.bot || !message.content.startsWith(prefix)) {
        return; //don't respond to self-messages
    }
    execute(message);
    //client.removeListener('messageCreate', messageHandler);
}
client.on(Events.MessageCreate, messageHandler);

const voiceHandler = (voice) => {
    if (!voice.content) {
        return; //if no speech detected, do nothing
    }   
    //console.log(`${voice.author.username} said ${voice.content}`);
    if (voice.content.toLowerCase().includes(keyword)){
        //console.log(voice.content);
        voice.content = `!${voice.content.toLowerCase().split(keyword)[1].trim()}`; //append '!' so everything else works
        console.log(`${voice.author.username} said '${voice.content}'`)
        execute(voice);
    }
}
client.on(SpeechEvents.speech, voiceHandler);

client.on('voiceStateUpdate', (oldState, newState) => {
    let clientId = getVoiceConnection(oldState.guild.id)?.joinConfig.channelId
    if(!queue.has(oldState.guild.id)) return;
    client.channels.fetch(clientId)
        .then((ch) => {
            if (ch.members.size == 1) {
                destroy(oldState.guild)
                console.log(`No active members, bot has disconnected from ${oldState.guild.name}`)
            }
        }).catch((e) => {
            console.error(`Some error in voiceStateUpdate has occurred. ${e}`)
        })
   //console.log(oldState.channel?.members.size)
   //console.log(newState.channel?.members.size)
});

process.on('warning', e => console.warn(e.stack));
require('events').EventEmitter.defaultMaxListeners = 100; //not recommended but discord-voice-recognition has issues 


/**
 * Executes a command based on user input.
 * @param {Message} message A Discord message object.
 */
function execute(message){
    //const serverQueue = queue.get(message.guild.id);

    const args = message.content.slice(prefix.length).split(' ');
    //console.log(args);
    let command = args[0].toLowerCase();
 
    if (command == 'help' || command == 'commands') {
        help(message);
    }

    if(!message.member.voice.channel){
        //return message.channel.send("❌ You have to be in a voice channel to use commands.");
        return;
    }
    if (command == 'run') {
        command = args.join(' ');
    } 
    if (command == 'put' && args[1].toLowerCase() == 'on') {
        command = 'put on';
    }
    message.content = message.content.replace(new RegExp(`\!${command}`, 'i'),'');
    switch(command){
        case 'join': case 'connect':
            connect(message);
            break;
        case 'p': case 'play': case 'put on':
            validateRequest(message);
            break;
        case 'autoplay':
            autoplay(message);
            break;
        case 'next': case 'remove': case 'skip':
            skip(message);
            break;
        case 'skipto':
            skipto(message);
            break;
        case 'vol': case 'volume':
            volume(message);
            break;
        case 'pause':
            pause(message);
            break;
        case 'unpause': case 'resume':
            resume(message);
            break;
        case 'again': case 'replay': case 'run that shit back':
            replay(message);
            break;
        case 'repeat': case 'loop':
            loopSong(message);
            break;
        case 'np': case 'q': case 'queue':
            showQueue(message);
            break;
        case 'clear':
            clear(message);
            break;
        case 'shuffle':
            shuffle(message);
            break;
        case 'seek':
            seek(message);
            break;
        case 'ff': case 'forward':
            forward(message);
            break;
        case 'lyrics':
            lyrics(message, geniusApiKey);
            break;
        case 'shut': case 'stop':    
            stop(message);
            break;
        case 'die': case 'kill': case 'disconnect': case 'kick': case 'leave':
            kick(message);
            break;
        case 'reboot':
            reboot(message);
            break;
        // case 'help': case 'commands':
        // //default:
        //    // message.channel.send("You need to enter a valid command!");
        //     help(message);
        //     break;
    }
}

/**
 * Restarts the bot. (The bot runs on a script that auto-starts when the bot stops running)
 * @param {Message} message A Discord message object
 * @returns 
 */
function reboot(message) {
    const serverQueue = queue.get(message.guild.id);

    if (!serverQueue) {
        return message.channel.send("❌ No bot to restart.");
    }
    console.log(`Rebooting the bot!`)
    process.exit(0); 
}

/**
 * Removes and cleans up the bot from the provided serverQueue.
 * @param {String} message A Discord message object.
 */
function kick(message){    
    const serverQueue = queue.get(message.guild.id);

    if (!serverQueue) {
        return message.channel.send("❌ No bot to kick.");
    }
    console.log(`Kicked the bot.`);
    serverQueue.connection.destroy();
    queue.delete(message.guild.id);
}

//TODO: Change into embed format
/**
 * Displays the list of commands.
 * @param {String} message  A Discord message object.
 */
function help(message){
    const commands = `
    !play -sc|-pl|-al query -- search for a song, playlist(-pl), or album(-al) on YouTube or SoundCloud(-sc)
    !play url -- plays a YouTube or SoundCloud URL 
    !related -- plays songs related to the current or previous song (only YouTube songs)

    !pause -- pause the bot
    !resume -- resume the bot
    !replay -- replays the last song
    !stop -- resets the bot
    !kick/leave -- bye bye bot ! 

    !skip number|word -- search for a song to skip/remove from the queue by number or word
    !skipto number|word -- search for a song to jump to in the queue by number or word
    !queue (n) -- shows (up to n) songs in the queue 
    !clear -- removes all songs in the queue  

    !shuffle -- shuffles the queue
    !loop -- repeats the queue 
    !seek mm:ss -- seek to a desired time in the current playing song
    !ff mm:ss -- fast forward a desired amount of time in the current playing song (default is 30 seconds)

    !vol 0-500 -- change the volume from 0-500%
    !lyrics -- shows the lyrics of the current playing song 
    
    To view these commands again, type !help or !commands
    `
    message.channel.send('```' + commands + '```');//.then(msg => setTimeout(() => msg.delete(), 30*1000));
}




/**
 * Destroys the queue and its voice connection.
 * @param {Guild} guild A Discord guild object.
 */
function destroy(guild){
    getVoiceConnection(guild.id).destroy();
    queue.delete(guild.id);
}

client.login(token);

