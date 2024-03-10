/*
    Features to add:
    Autoplay related songs
    Run and control the bot from a single embed
    Slash commands
    Find a way to auto-refresh youtube cookie/bypass age-restricted content
    Separate functions into modules
*/
//connection to discord
//const Discord = require('discord.js');

const {Events, Message, Guild} = require('discord.js');
const {getVoiceConnection} = require('@discordjs/voice');

const {
    prefix,
    token,
    geniusApiKey,
    keyword,
} = require('./config.json');


//instance of the bot

const { addSpeechEvent, SpeechEvents } = require("discord-speech-recognition");
const playDL = require('play-dl');
const { getLyrics } = require('genius-lyrics-api');
const { client } = require('./modules/client')
const { splitText } = require('./modules/utils');
const { connect } = require('./modules/connect');
const { validateRequest } = require('./modules/validate');
const { queue, skip, skipto, clear, loopSong, showQueue, shuffle } = require('./modules/queue');
const { pause, resume, replay, forward, volume} = require('./modules/song')

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

process.setMaxListeners(0); //not recommended but discord-voice-recognition has issues 
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

process.on('warning', e => console.warn(e.stack));


/**
 * Executes a command based on user input.
 * @param {Message} message A Discord message object.
 */
function execute(message){
    //const serverQueue = queue.get(message.guild.id);

    const args = message.content.slice(prefix.length).split(' ');
    //console.log(args);
    let command = args[0].toLowerCase();
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
            lyrics(message);
            break;
        case 'shut': case 'stop':    
            stop(message);
            break;
        case 'die': case 'kill': case 'disconnect': case 'kick': case 'leave':
            kick(message);
            break;
        case 'help': case 'commands':
        //default:
           // message.channel.send("You need to enter a valid command!");
            help(message);
            break;
    }
}


/**
 * Removes and cleans up the bot from the provided serverQueue
 * @param {String} message A Discord message object.
 */
function kick(message){    
    const serverQueue = queue.get(message.guild.id);

    if(!message.member.voice.channel){
        return message.channel.send("❌ You have to be in a voice channel to kick the bot");
    }
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

    !pause -- pause the bot
    !resume -- resume the bot
    !replay -- replays the last song
    !stop -- resets the bot
    !kick/leave -- bye bye bot ! 

    !skip number|word -- search for a song to skip/remove from the queue by number or word
    !skipto number|word -- search for a song to jump to in the queue by number or word
    !queue n -- shows (up to n) songs in the queue 
    !clear -- removes all songs in the queue  

    !shuffle -- shuffles the queue
    !loop -- repeats the queue 
    !seek mm:ss -- seek to a desired time in the current playing song
    !ff mm:ss -- fast forward an certain amount of time in the current playing song (default is 30 seconds)

    !vol 0-500 -- change the volume from 0-500%
    !lyrics -- shows the lyrics of the current playing song 
    
    To view these commands again, type !help or !commands
    `
    message.channel.send('```' + commands + '```');//.then(msg => setTimeout(() => msg.delete(), 30*1000));
}


/**
 * Displays lyrics for the current playing song.
 * @param {Message} message A Discord message object.
 * @returns 
 */
async function lyrics(message){
    const serverQueue = queue.get(message.guild.id);

    if(!message.member.voice.channel){
        return message.channel.send("❌ You have to be in a voice channel to skip.");
    }
    if (!serverQueue || serverQueue.songs.length == 0) {
        return message.channel.send("❌ No song to get lyrics for.");
    }
    const {title, duration, artist} = serverQueue.songs[0];
    const options = {
        apiKey: geniusApiKey,
        title: title,
        artist: ' ',
        optimizeQuery: true
    };
    console.log(`Finding lyrics for ${options.title}`);
    const searchMsg = await message.channel.send(`Finding lyrics for \*\*${title}\*\* 🔎`);
    getLyrics(options)
            .then((lyrics) => { 
                let song = serverQueue.songs[0];
                searchMsg.delete();
                if (!lyrics) { 
                    console.log(`No lyrics found.`);
                    return message.channel.send(`❌ No lyrics found for \*\*${title}\*\*`)
                }
                console.log(`Found lyrics for ${serverQueue.songs[0].title}.`);
                let strings = splitText(lyrics);
                let startTime = song.seek ?? 0;
                let currentTime = song.duration - Math.floor((serverQueue.resource.playbackDuration + (startTime*1000))/1000); //calculate remaining time in the song
                //console.log(currentTime)
                for (string of strings) {
                    message.channel.send(string).then(string => setTimeout(() => string.delete(), currentTime*1000));
                }
                //return message.channel.send(lyrics)
            })
            .catch((e) => console.error(e));
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

