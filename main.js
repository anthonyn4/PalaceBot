/*
    Features to add:
    Remove individual songs from queue ✅
    Autoplay related songs
    Seek to a given time ✅
    YouTube playlist support ✅
    YouTube radio support ✅
    
*/

//connection to discord
const Discord = require('discord.js');
const { addSpeechEvent, SpeechEvents } = require("discord-speech-recognition");
const {Client, GatewayIntentBits, Partials, Events, verifyString, Message, Guild} = require('discord.js');
const {
    prefix,
    token,
    geniusApiKey,
} = require('./config.json');

//instance of the bot
const client = new Client({ 
    intents: [   
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages, 
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.MessageContent
    ],
    partials: [Partials.Channel],
}); 
//addSpeechEvent(client);

const playDL = require('play-dl');
const { getLyrics } = require('genius-lyrics-api');
const {VoiceConnectionStatus, entersState, getVoiceConnection, joinVoiceChannel, createAudioPlayer, createAudioResource, AudioPlayerStatus} = require('@discordjs/voice');

const queue = new Map(); //map of guild ID and its respective queue

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

const messageHandler = (message) => {
    if (message.author.bot || !message.content.startsWith(prefix)) {
        return; //don't respond to self-messages
    }
    command(message);
    //client.removeListener('messageCreate', messageHandler);
}
client.on(Events.MessageCreate, messageHandler);

// const voiceHandler = (voice) => {
//     if (!voice.content) {
//         return; //if no speech detected, do nothing
//     }   
//     //console.log(`${voice.author.username} said ${voice.content}`);
//     if (voice.content.toLowerCase().includes('music')){
//         //console.log(voice);
//         voice.content = `!${voice.content.toLowerCase().split('music')[1].trim()}`; //append '!' so everything else works
//         console.log(`${voice.author.username} said '${voice.content}'`)
//         command(voice);
//     }
//     //client.removeListener('speech', voiceHandler);
// }
// client.on(SpeechEvents.speech, voiceHandler);

process.on('warning', e => console.warn(e.stack));

/**
 * Executes a command based on user input.
 * @param {Message} message A Discord message object.
 */
function command(message){
    const serverQueue = queue.get(message.guild.id);

    const args = message.content.slice(prefix.length).split(' ');
    //console.log(args);
    const command = args.shift().toLowerCase();

    switch(command){
        case 'join':
        case 'connect':
            connect(message,serverQueue);
            break;
        case 'p':
        case 'play' :
            execute(message, serverQueue);
            break;
        case 'next':
        case 'remove':
        case 'skip':
            skip(message, serverQueue);
            break;
        case 'skipto':
            skipto(message,serverQueue);
            break;
        case 'vol':
        case 'volume':
            volume(message,serverQueue);
            break;
        case 'pause':
            pause(message,serverQueue);
            break;
        case 'resume':
            resume(message, serverQueue);
            break;
        case 'repeat':
        case 'loop':
            loopSong(message, serverQueue);
            break;
        case 'np':
        case 'q':
        case 'queue':
            showQueue(message,serverQueue);
            break;
        case 'clear':
            clear(message, serverQueue);
            break;
        case 'shuffle':
            shuffle(message,serverQueue);
            break;
        case 'seek':
            seek(message,serverQueue);
            break;
        case 'ff':
        case 'forward':
            forward(message,serverQueue);
            break;
        case 'lyrics':
            lyrics(message,serverQueue);
            break;
        case 'stop':    
        case 'kick':
        case 'leave':
            kick(message,serverQueue);
            break;
        case 'help':
        case 'commands':
        //default:
           // message.channel.send("You need to enter a valid command!");
            help(message);
            break;
    }
    //console.log(`voice events: ${client.listenerCount('speech', voiceHandler)}`);
    //console.log(`message events: ${client.listenerCount('messageCreate', messageHandler)}`);

}

/**
 * Processes user input to either search for a song or process a URL.
 * @param {Message} message A Discord message object.
 * @param {Object} serverQueue Contains information related to a Discord server's queue.
 * @returns {Message} A message to the channel based on the user input.
 */
async function execute(message, serverQueue) {
    const args = message.content.split(" ");
    const voiceChannel = message.member.voice.channel;
    if (!voiceChannel){
        return (Math.round(Math.random())) ? message.channel.send("❌ You need to be in a channel to play music.") : message.channel.send("how bout u hop in a voice channel first❓");
       //return message.channel.send("You need to be in a channel to play music.");
    }
   
    if (args.length == 1) {//someone invokes play command without any arguments
        return message.channel.send("❌ Specify a search or URL to play 🤓")
    } 
 
    
    //check the last argument to see if it is a valid time to seek to
    //let timeToSeek = parse(args[args.length-1]);

    let song = {};  //object containing song data
    let songs = []; //array of song objects
    let check = await playDL.validate(args[1].trim());
    let searchSource = {youtube: 'video'};  //where we want to perform the search and what type of result
    //console.log(check)  //debug
    if (check === false) {
        return message.channel.send("❌ Failed to validate URL or search.");
    } else if (check === 'search') {
        let searchMsg = '';
        let query = message.content.substring(message.content.indexOf(' '), message.content.length)
        let argsRegex = new RegExp(/\s-[^\s]+/, 'g');
        let options = query.match(argsRegex) ?? [];
        options = options.map(e => e.trim());
        query = query.replace(argsRegex, "").trim();
        if (options.includes('-sc') || options.includes('-soundcloud')) { 
            if (options.includes('-pl') || options.includes('-playlist')) {
                searchSource = {soundcloud: 'playlists'}
                searchMsg = await message.channel.send(`Searching for a playlist named '${query}' on SoundCloud🔎`);
                console.log(`${message.author.username} searched for playlist '${query}' on SoundCloud🔎`);
            } else if (options.includes('-al') || options.includes('-album')) {
                searchSource = {soundcloud: 'albums'}
                searchMsg = await message.channel.send(`Searching for an album named '${query}' on SoundCloud🔎`);
                console.log(`${message.author.username} searched for album '${query}' on SoundCloud🔎`)
            } else {
                searchSource = {soundcloud : 'tracks'};
                searchMsg = await message.channel.send(`Searching for '${query}' on SoundCloud🔎`);
                console.log(`${message.author.username} searched for '${query}' on SoundCloud🔎`)
            }
            //console.log(`${message.author.username} searched for '${query}' on SoundCloud🔎`);
        } else {
            if (options.includes('-pl') || options.includes('-playlist')) {
                searchSource = {youtube: 'playlist'}
                searchMsg = await message.channel.send(`Searching for a playlist named '${query}' on YouTube🔎`);
                console.log(`${message.author.username} searched for playlist '${query}' on YouTube🔎`);
            } else {
                searchSource = {youtube: 'video'};
                searchMsg = await message.channel.send(`Searching for '${query}' on YouTube🔎`);
                console.log(`${message.author.username} searched for '${query}' on YouTube🔎`)
            }
            //console.log(`${message.author.username} searched for '${query}' on YouTube🔎`);
        }
        //let query = message.content.substring(message.content.indexOf(' '),timeToSeek ? message.content.lastIndexOf(' ') : message.content.length).trim(); //if timetoseek is non-zero, go to last space (omit seek time) otherwise accept whole message
        const search = await playDL.search(query, {
            limit: 1,
            source: searchSource
        })
        searchMsg.delete();
        //console.log(search)
        //console.log(searchSource);

        if (search.length == 0){    
            return message.channel.send(`❌ No results found for  '${query}'  😢`);
        } else {
            if (search[0].type == 'track' || search[0].type == 'video') {
                song = {
                    title: search[0].title,
                    //artist: search[0].channel?.name || search[0].publisher?.artist,
                    url: search[0].url,
                    duration: search[0].durationInSec,
                    durationTime: parse(search[0].durationInSec),
                    seek: 0,
                    //seekTime: parse(timeToSeek),
                    source: 'yt'
                }
                songs.push(song);
            } else if (search[0].type == 'playlist') {
                message.content = args[0] + " " + search[0].url;
                //console.log(message.content);
                execute(message,serverQueue);
            } else {
                console.log(search[0]);
                return console.error("Failed to find a valid search.");
            }
      
        }
    } else {
        let source = check.split("_")[0]
        let type = check.split("_")[1]
        //console.log(type);  //debug
        if (source === 'yt'){
            if (type === 'video'){
                const video = await playDL.video_info(args[1]);
                song = {
                    title: video.video_details.title,
                    //artist: video.video_details.channel.name,
                    url: video.video_details.url,
                    duration: video.video_details.durationInSec,
                    durationTime: parse(video.video_details.durationInSec),
                    seek: 0, //unused features
                    //seekTime: parse(timeToSeek),
                    source: 'yt'
                }
                //console.log(video.video_details.music);
                songs.push(song)
            } else if (type === 'playlist') {
                const playlist = await playDL.playlist_info(args[1], {incomplete: true}) //parse youtube playlist ignoring hidden videos
                const videos = await playlist.all_videos()
                console.log(`Fetched ${playlist.total_videos} videos from "${playlist.title}"`)
                videos.forEach(function (video) {
                    song = {
                        title: video.title,
                        //artist: video.channel.name,
                        url: video.url,
                        duration: video.durationInSec,
                        durationTime: parse(video.durationInSec),
                        seek: 0,
                        //seekTime: parse(timeToSeek),
                        source: 'yt'
                    }
                    songs.push(song)
                })
                message.channel.send(`Added \*\*${songs.length}\*\* songs to the queue.`)
            }
        } else if (source === 'so'){
            const so = await playDL.soundcloud(args[1])
            if (type === 'track') {
                song = {
                    title: so.name,
                    //artist: so.publisher?.artist,
                    url: so.url,
                    duration: so.durationInSec,
                    durationTime: parse(so.durationInSec),
                    source: 'so'
                }
                songs.push(song)
            } else if (type === 'playlist'){
                const tracks = await so.all_tracks()
                console.log(`Fetched ${so.total_tracks} tracks from "${so.name}"`)
                tracks.forEach(function (track) {
                    song = {
                        title: track.name,
                        //artist: track.publisher?.artist,
                        url: track.url,
                        duration: track.durationInSec,
                        durationTime: parse(track.durationInSec),
                        source: 'so'
                    }
                    songs.push(song)
                })
                message.channel.send(`Added \*\*${songs.length}\*\* songs to the queue.`)
            }
        } else if (source === 'sp'){
            //return message.channel.send("Spotify is currently not supported. Refer to https://play-dl.github.io/modules.html#stream for more information.")
            const spot = await playDL.spotify(args[1])
            //console.log(type);
            if (type === 'track') {
                //console.log(spot.artists[0].name);
                const search = await playDL.search(`${spot.name} ${spot.artists[0].name}`, {
                    limit: 1,
                    source: searchSource
                })
                if (search.length == 0) return;
                song = {
                    title: search[0].title,
                    artist: spot.artists[0].name,
                    url: search[0].url,
                    duration: search[0].durationInSec,
                    durationTime: parse(search[0].durationInSec),
                    //seek: timeToSeek,
                    //seekTime: parse(timeToSeek),
                    source: 'yt'
                }
                // song = {
                //     title: spot.name,
                //     url: spot.url,
                //     duration: spot.durationInSec,
                //     durationTime: parse(spot.durationInSec),
                //     source: 'sp'
                // }
                songs.push(song)
            } else if (type === 'album' || type === 'playlist') {
                const tracks = await spot.all_tracks();
                const loadingMsg = await message.channel.send(`📇 Loading...`);
                await Promise.all(tracks.map(async (track) => { //fast but album is shuffled
                    const search = await playDL.search(`${track.name}  ${track.artists[0].name}`, {
                        limit: 1,
                        source: searchSource
                    })
                    if (search.length == 0) return;
                    song = {
                        title: search[0].title,
                        artist: track.artists[0].name,
                        url: search[0].url,
                        duration: search[0].durationInSec,
                        durationTime: parse(search[0].durationInSec),
                        //seek: timeToSeek,
                        //seekTime: parse(timeToSeek),
                        source: 'yt'
                    }
                    console.log(`Fetched ${songs.length} videos from "${tracks.name}"`)
                    songs.push(song);
                }));
                // for (const track of tracks) {   //slow but album retains order
                //     const search = await playDL.search(`${track.name}  ${track.artists[0].name}`, {
                //         limit: 1,
                //         source: searchSource
                //     })
                //     if (search.length == 0) return;
                //     song = {
                //         title: search[0].title,
                //         url: search[0].url,
                //         duration: search[0].durationInSec,
                //         durationTime: parse(search[0].durationInSec),
                //         //seek: timeToSeek,
                //         //seekTime: parse(timeToSeek),
                //         source: 'yt'
                //     }
                //     // song = {
                //     //     title: track.name,
                //     //     url: track.url,
                //     //     duration: track.durationInSec,
                //     //     durationTime: parse(track.durationInSec),
                //     //     source: 'sp'
                //     // }
                //     songs.push(song)
                // }
                loadingMsg.delete();
                message.channel.send(`Added \*\*${songs.length}\*\* songs to the queue.`)
            }
        }
    }

    //console.log(song);
    // if(song.source === 'yt'){
    //     let maxDuration = song.duration;
    //     if (timeToSeek > maxDuration){ 
    //         //console.log(maxDuration)
    //         let maxTime = parse(maxDuration);
    //         console.log(`Seek exceeded song limits, requested ${timeToSeek}, max is ${maxDuration}`);
    //         return message.channel.send(`❌ Seeking beyond limits. <0-${maxTime.minutes}:${maxTime.seconds}>`);
    //     }
    // }
    //console.log(serverQueue);
    if(connect(message,serverQueue,songs)){
        play(message, message.guild, songs[0]);
    } else {
        if (serverQueue.songs.length == 0) {   //if queue was empty, begin playing the first song 
            serverQueue.songs = serverQueue.songs.concat(songs);    //append the new songs to the end of the queue, needs to be done after the length is checked 
            play(message, message.guild, serverQueue.songs[0]);
        } else {
            serverQueue.songs = serverQueue.songs.concat(songs);    //append the new songs to the end of the queue
   
            if (songs.length > 1) {
                //don't display anything
            } else {
                // if (song.seek > 0){ 
                //     console.log(`Added ${song.title} {${song.durationTime.minutes}:${song.durationTime.seconds}} to the queue starting at ${song.seekTime.minutes}:${song.seekTime.seconds}`);
                //     return message.channel.send(`\*\*${song.title}\*\* \`${song.durationTime.minutes}:${song.durationTime.seconds}\` has been added to the queue starting at \`${song.seekTime.minutes}:${song.seekTime.seconds}\`. `);
                // } 
                console.log(`Added ${songs[0].title} to the queue. {${songs[0].durationTime.minutes}:${songs[0].durationTime.seconds}}`);
                return message.channel.send(`\*\*${songs[0].title}\*\* \`${songs[0].durationTime.minutes}:${songs[0].durationTime.seconds}\` has been added to the queue. `);
            }
        }
    }
    //setTimeout(() => {message.delete(), 30*1000}); //delete user message after 30 seconds
}


/**
 * Establishes a connection between a Discord voice channel and its associated queue.
 * @param {Message} message A Discord message object.
 * @param {Object} serverQueue Contains information related to a Discord server's queue.
 * @param {Array} songs Array of song objects
 * @returns {number} 1 if successful, 0 if failed
 */
function connect(message, serverQueue, songs = []) {
    //console.log('connecting')
    const voiceChannel = message.member.voice.channel;
    if (!voiceChannel){
        return (Math.round(Math.random())) ? message.channel.send("❌ You need to be in a channel to play music.") : message.channel.send("how bout u hop in a voice channel first❓");
       //return message.channel.send("You need to be in a channel to play music.");
    }
    /*if no server queue exists, create one with the following parameters, 
     assign the current guild id to the serverqueue, 
     and push the requested song onto the array.
    */
    if (!serverQueue) {
        const queueConstructor = {
            //textChannel: message.channel,
            voiceChannel: voiceChannel,
            connection: null,
            songs: songs,
            player: null,
            resource: null,
            loop: false,
            //loopall: false,
            keep: false, //whether or not the current song should be kept in the queue, used for skipping songs while looping
            //timeoutID: undefined    //separate timeout ID for each guild
            volume: 100, //default 100% volume
        };

        queue.set(message.guild.id, queueConstructor);
        //queueConstructor.songs.push(song);

        //attempt a connection with the user's voice channel, create the audio player and begin playing the first song
        try {
            let connection = joinVoiceChannel({
                channelId: voiceChannel.id,
                guildId: message.guild.id,
                adapterCreator: message.guild.voiceAdapterCreator,
                selfDeaf: false
            })
            queueConstructor.connection = connection;
            queueConstructor.player = createAudioPlayer(
                /*{
                behaviors: {
                    noSubscriber: NoSubscriberBehavior.Stop,
                },
                }*/
            );

            //check if bot is moving channels or forcibly disconnected
            connection.once(VoiceConnectionStatus.Disconnected, async (oldState, newState) => {
                try {
                    await Promise.race([
                        entersState(connection, VoiceConnectionStatus.Signalling, 5_000),
                        entersState(connection, VoiceConnectionStatus.Connecting, 5_000),
                    ]);
                    // Seems to be reconnecting to a new channel - ignore disconnect
                } catch (error) {
                    // Seems to be a real disconnect which SHOULDN'T be recovered from
                    console.log(`Forcibly destroyed the bot.`);
                    connection.destroy();
                    queue.delete(message.guild.id);
                }
            });

            // connection.once('stateChange', (oldState, newState) => {
            //     const oldNetworking = Reflect.get(oldState, 'networking');
            //     const newNetworking = Reflect.get(newState, 'networking');
              
            //     const networkStateChangeHandler = (oldNetworkState, newNetworkState) => {
            //       const newUdp = Reflect.get(newNetworkState, 'udp');
            //       clearInterval(newUdp?.keepAliveInterval);
            //     }
              
            //     oldNetworking?.off('stateChange', networkStateChangeHandler);
            //     newNetworking?.on('stateChange', networkStateChangeHandler);
            //   });
            if (getVoiceConnection(message.guild.id) != undefined) {
                const userCheck = setInterval(() => {
                    //console.log(getVoiceConnection(message.guild.id));
                    //console.log(voiceChannel);
                    const membersInChannel = client.channels.fetch(getVoiceConnection(message.guild.id)?.packets.state.channel_id); //get the current channel of the bot
                    //console.log(membersInChannel);
                    membersInChannel.then((ch) => { 
                        if (ch.members.size == 1) {
                            clearInterval(userCheck);
                            destroy(message.guild);
                            console.log(`No active users, bot has disconnected from "${message.guild.name}"`);
                        } 
                    })
                   
                }, 10 * 1000);
            } else {
                clearInterval(userCheck);
            }
            console.log(`Connected to ${message.guild.name}`);
        } catch (err) {
            console.log(err);
            queue.delete(message.guild.id); //on error, trash the serverqueue
            message.channel.send(err);
        }
        //console.log('queue created')
        return 1;
    } else {
        //console.log('queue exists');
        return 0;
    }
} 
/**
 * Destroys the queue and its voice connection.
 * @param {Guild} guild A Discord guild object.
 */
function destroy(guild){
    getVoiceConnection(guild.id).destroy();
    queue.delete(guild.id);
}

/**
 * 
 * @param {Message} message A Discord message object.
 * @param {Guild} guild A Discord guild object.
 * @param {Object} song Contains information about a song.
 * @returns {Message} A message to the channel on the state of the song (playing, searching)
 */
async function play(message, guild, song){
    const serverQueue = queue.get(guild.id);

     if (!song) { 
    //     serverQueue.timeoutID = setTimeout(() => {  //separate timeout for each server
    //         //clearInterval(userCheck);
    //         if (getVoiceConnection(guild.id) != undefined) {
    //             //console.log(getVoiceConnection(guild.id));
    //             console.log(`Timeout for "${guild.name}"`);
    //             destroy(guild);
    //             serverQueue.timeoutID = undefined;  //after timeout goes off, reset timeout value.
    //         } else {
    //             console.log("Bot was disconnected during the timeout.");
    //         }
    //     }, 10 * 60 * 1000); //10 min idle
    //     console.log(`Timeout set for "${guild.name}"`);
    //     if (serverQueue.loop == true){
    //         serverQueue.loop = false;   //if there is no song to be played, disable the loop, no point looping an empty queue
    //         console.log('Disabled the loop.');
    //     }
         return;
     }
    
    //if song is queued during timeout, clear timeout
    // if (serverQueue.timeoutID != undefined){    
    //     console.log(`Timeout cleared for "${guild.name}"`);
    //     clearTimeout(serverQueue.timeoutID);
    //     serverQueue.timeoutID = undefined;
    // } 
    
    let stream;
    //console.log(song.source);
   
    try {
        if (song.source === 'yt' && song.seek > 0){  //only yt songs can be seeked, but there are songs from various sources in the playlist
            console.log(`Seeked ${song.seek} seconds into the song.`);
            stream = await playDL.stream(song.url, {seek: song.seek});
        } else {
            //console.trace();
            stream = await playDL.stream(song.url);  
        }
    } catch (e) {
        console.error(e);
        return; //stop executing function
    }
    
  
    serverQueue.resource = createAudioResource(stream.stream, {
        inputType: stream.type,
        inlineVolume: true
    });
    serverQueue.resource.volume.setVolume(serverQueue.volume/100);

    serverQueue.connection.subscribe(serverQueue.player);

    serverQueue.player.play(serverQueue.resource);

    //event handlers for the music player
    var errorListener = error => {
        console.error(`Error: ${error.message} with resource ${error.resource.title}`);
        //serverQueue.textChannel.send(`${error.message} error with resource ${error.resource.title}. Please try again.`)
    };

    serverQueue.player.on('error', errorListener);

    serverQueue.player.once(AudioPlayerStatus.Idle, () => {
        serverQueue.player.removeListener('error', errorListener); //remove previous listener
        if (serverQueue.loop && serverQueue.keep) {    //the loop is on and the song is flagged to be kept
            serverQueue.songs.push(serverQueue.songs.shift());  
        } else {
            //pop song off the array (essentially placing the next song at the top)
            serverQueue.songs.shift();  
            if (serverQueue.loop === true){
                serverQueue.keep = true;    //reset keep flag after skipping in a loop
            }
        }
        play(message, guild, serverQueue.songs[0]);
    })

    console.log(`Playing ${song.title} {${song.durationTime.minutes}:${song.durationTime.seconds}} in "${guild.name}"`); //starting at {${song.seekTime.minutes}:${song.seekTime.seconds}}`);
    if (serverQueue.loop == true) {
        // don't print anything
    } else {
        if (song.seek > 0){
            message.channel.send(`🎶 Now playing \*\*${song.title}\*\* \`${song.durationTime.minutes}:${song.durationTime.seconds}\` starting at \`${song.seekTime.minutes}:${song.seekTime.seconds}\` 🎵`);
                //.then(msg => setTimeout(() => msg.delete(), (song.duration-song.seek)*1000));
        } else {
            message.channel.send(`🎶 Now playing \*\*${song.title}\*\* \`${song.durationTime.minutes}:${song.durationTime.seconds}\` 🎵`);
                //.then(msg => setTimeout(() => msg.delete(), song.duration*1000));
        }
        //showQueue(serverQueue);
    }
}

/**
 * Clears all the songs in the queue.
 * @param {Message} message A Discord message object.
 * @param {Object} serverQueue Contains information related to a Discord server's queue.
 * @returns {Message} A message to the channel on whether or not the queue has been cleared.
 */
function clear(message, serverQueue){
    if(!message.member.voice.channel){
        return message.channel.send("❌ You have to be in a voice channel to clear the queue.");
    }
    if (!serverQueue || serverQueue.songs.length == 0) {
        return message.channel.send("❌ No queue to clear.");
    }

    let currentSong = serverQueue.songs[0];
    serverQueue.songs = [currentSong]; //remove all songs except for currently playing song
    serverQueue.loop = false;
    serverQueue.keep = false;
    //serverQueue.songs = [];     //empty the queue
    //serverQueue.player.stop();  //then skip current song by invoking AudioPlayer stop method

    console.log(`Cleared queue.`);
    return message.channel.send("🧹 Cleared queue. ");
}

/**
 * Loops the queue.
 * @param {Message} message A Discord message object.
 * @param {Object} serverQueue Contains information related to a Discord server's queue.
 * @returns {Message} A message that indicates the state of the loop.
 */
function loopSong(message, serverQueue){
    const args = message.content.split(" ");

    if(!message.member.voice.channel){
        return message.channel.send("❌ You have to be in a voice channel to loop the song."); 
    }
    if (!serverQueue || serverQueue.songs.length == 0) {
        return message.channel.send("❌ No song to loop.");
    }
    //if only !loop is checkd with no parameter
    //if (args.length == 1){
        //console.log(`Loop parameter not specified. Loop not executed.`);
        //return message.channel.send(`Specify the loop parameter. (!loop <this/all/off>`);
        serverQueue.loop = !serverQueue.loop;    //loop the queue
        serverQueue.keep = !serverQueue.keep;    //and keep the current song 
        if (serverQueue.loop){
            console.log(`Looping the queue.`);
            return message.channel.send('⚡ Loop **ACTIVATED** 🌩️');
        } else {
            console.log('Disabled the loop.');
            return message.channel.send('📴 Loop **DEACTIVATED** 😥');
        }
        //return message.channel.send('Looping the queue.');
   // }

    /*
    let check = args[1].toLowerCase();
    switch (check) {
        case 'this':
            if (serverQueue.loop) { //If already looping, then calling the command again will disable the loop
                serverQueue.loop = false;
                console.log(`No longer looping.`);
                serverQueue.textChannel.send(`No longer looping.`);
            } else { //Otherwise start looping
                serverQueue.loop = true;
                console.log(`Looping current song.`);
                serverQueue.textChannel.send(`Looping current song.`);
            }
            break;
            
        case 'all':
            serverQueue.loopall = !serverQueue.loopall;
            serverQueue.loop = false;
            if(serverQueue.loopall == true){
                console.log(`Looping the queue.`)
                serverQueue.textChannel.send(`Looping the queue.`);
            } else {
                console.log(`No longer looping the queue.`);
                serverQueue.textChannel.send(`No longer looping the queue.`);
            }
            break;
        case 'off':
            if (!serverQueue.loop) {
               return message.channel.send(`❌ The loop is already off.`);
            } else {
                serverQueue.loop = false;
                console.log(`Turned off looping.`);
                //return message.channel.send(`No longer looping.`);
                return message.channel.send('📴Loop **DEACTIVATED**😥');
            }
            //break; //not necessary due to return statements
        default:
            //message.channel.send(`Specify the loop parameter. (!loop <this/all/off>`);
            return message.channel.send('!loop to loop the queue, !loop off to disable the loop. 🤓')
    }
   */
}

/**
 * Shows the queue of songs.
 * @param {Message} message A Discord message object.
 * @param {Object} serverQueue Contains information related to a Discord server's queue.
 * @returns {Message} A message showing the queue of songs.
 */
function showQueue(message,serverQueue){
    const args = message.content.split(" ");
    let pos = 999; 


    if(!message.member.voice.channel){
        return message.channel.send("You have to be in a voice channel to view the queue.");
    }
    if (!serverQueue || serverQueue.songs.length == 0) {
        return message.channel.send('```' + `No song currently playing\n----------------------------\n` + '```');//.then(msg => setTimeout(() => msg.delete(), 15*1000));
    }
    
    if (args.length == 2){
        pos = parseInt(args[1]);
        if (pos < 0 || isNaN(pos)) {
            return;
        } else {
            pos = args[1];
        }
    }
    let msg = `Now playing: ${serverQueue.songs[0].title}\n----------------------------\n`;
    let length = Math.min(serverQueue.songs.length, ++pos); //queue includes current playing song, so we want to show current playing + the number of songs to be shown
    //let duration = nowPlaying.duration;
    for (var i = 1; i < length; i++){
        text = `${i}. ${serverQueue.songs[i].title}\n`;
        msg += text;
    }
    let strings = splitText2(msg);
    for (string of strings) {
        message.channel.send('```' + string + '```').then(string => setTimeout(() => string.delete(), 60*1000));
    }

}

/**
 * Pauses the song.
 * @param {Message} message A Discord message object.
 * @param {Object} serverQueue Contains information related to a Discord server's queue.
 * @returns {Message} A message showing if the song has been paused or not.
 */
function pause(message, serverQueue){
    if(!message.member.voice.channel){
        return message.channel.send("❌ You have to be in a voice channel to pause the song.");
    }
    if (!serverQueue || serverQueue.songs.length == 0) {
        return message.channel.send("❌ No song to pause.");
    }
    console.log(`Song paused.`);
    serverQueue.player.pause();
    return message.channel.send("⏸️ Paused song. (type !resume to continue playing)")
}

/**
 * Resumes the song.
 * @param {Message} message A Discord message object.
 * @param {Object} serverQueue Contains information related to a Discord server's queue.
 */
function resume(message, serverQueue){
    if(!message.member.voice.channel){
        return message.channel.send("❌ You have to be in a voice channel to resume the song.");
    }
    if (!serverQueue || serverQueue.songs.length == 0) {
        return message.channel.send("❌ No song to resume.");
    }
    console.log(`Song resumed.`);
    serverQueue.player.unpause();
    //return message.channel.send("▶️ Resumed song.")
}

function stop(message, serverQueue) {   //same thing as clear i guess
    if(!message.member.voice.channel){
        return message.channel.send("❌ You have to be in a voice channel to stop the music.");
    }
    if (!serverQueue || serverQueue.songs.length == 0) {
        return message.channel.send("❌ No music to stop.");
    }
    //console.log(`Stopped the bot.`);
    //getVoiceConnection(message.guild.id).disconnect();
    //getVoiceConnection(message.guild.id).destroy();
    //queue.delete(message.guild.id);
    clear(message, serverQueue);
    serverQueue.player.stop();
}

/**
 * Removes and cleans up the bot from the provided serverQueue
 * @param {String} message A Discord message object.
 * @param {Object} serverQueue
 */
function kick(message, serverQueue){
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

/**
 * Displays the list of commands.
 * @param {String} message  A Discord message object.
 */
function help(message){
    const commands = `
    !play query|url -- search for a song or enter a YouTube or SoundCloud URL 
    !pause -- pause the bot
    !resume -- resume the bot
    !stop/kick/leave -- bye bye bot ! 

    !skip number|query -- search for a song to skip in the queue by number or query
    !skipto number|query -- search for a song to jump to in the queue by number or query
    !queue n -- shows (up to n) songs in the queue 
    !clear -- removes all songs in the queue  

    !shuffle -- shuffles the queue
    !loop -- repeats the queue 
    !seek mm:ss -- seek to a desired time in the current playing song
    !ff mm:ss -- fast forward an certain amount of time in the current playing song

    !vol 0-200 -- change the volume from 0-200%
    !lyrics -- shows the lyrics of the current playing song 
    
    To view these commands again, type !help or !commands
    `
    message.channel.send('```' + commands + '```');//.then(msg => setTimeout(() => msg.delete(), 30*1000));
}


/**
 * Shuffles the queue of songs.
 * @param {Message} message  A Discord message object.
 * @param {Object} serverQueue Contains information related to a Discord server's queue.
 * @returns 
 */
function shuffle(message, serverQueue) {
    if(!message.member.voice.channel){
        return message.channel.send("❌ You have to be in a voice channel to stop the music.");
    }
    if (!serverQueue || serverQueue.songs.length == 0) {
        return message.channel.send("❌ No music to stop.");
    }

    for (let i = serverQueue.songs.length-1; i>1; --i) {    //Fisher-Yates shuffle algorithm but exclude current playing song
        const j = 1 + Math.floor(Math.random() * i);
        [serverQueue.songs[i], serverQueue.songs[j]] = [serverQueue.songs[j], serverQueue.songs[i]];
    }
    console.log('Shuffled the queue.');
    message.channel.send('🔀 Shuffled the queue.');
}

/**
 * Seek to a desired time in a song.
 * @param {Message} message A Discord message object.
 * @param {Object} serverQueue Contains information related to a Discord server's queue.
 * @param {number} [time=0] Number of seconds to seek into the song.
 * @returns 
 */
function seek(message,serverQueue, time = 0) {
    //console.log(`time: ${time}`)
    const args = message.content.split(" ");
    if(!message.member.voice.channel){
        return message.channel.send("❌ You have to be in a voice channel to seek.");
    }
    if (!serverQueue || serverQueue.songs.length == 0) {
        return message.channel.send("❌ No song to seek.");
    }
    if(serverQueue.songs[0].source != 'yt'){ 
        return message.channel.send("❌ Song must be from YouTube to seek.");
    }
  
    //console.log(serverQueue.resource.playbackDuration);
    let timeToSeek = 0;
    let seekTime = 0;
    if (time == 0) { //if no timestamp is given then process the user's timestamp
        timeToSeek = parse(args[1]) || parse(time);
        seekTime = parse(timeToSeek);
        //console.log(timeToSeek);
        //console.log(seekTime);
        let maxDuration = serverQueue.songs[0].duration;
        let maxTime = parse(maxDuration);
        if (args[1].indexOf(':') == -1) {
            return message.channel.send(`❌ Enter a timestamp between <0-${maxTime.minutes}:${maxTime.seconds}>`);
        }
        if (timeToSeek > maxDuration || timeToSeek < 0){ 
            //console.log(maxDuration)
            console.error(`Seek failed, requested ${timeToSeek}, max is ${maxDuration}`);
            return message.channel.send(`❌ Enter a timestamp between <0-${maxTime.minutes}:${maxTime.seconds}>`);
        } 
    }
    //else if (timeToSeek == 0) {
    //     return message.channel.send(`❌ Specify a timestamp. <0-${maxTime.minutes}:${maxTime.seconds}>`);
    // }
    let currentSong = serverQueue.songs[0];
    currentSong.seek = timeToSeek || time; //used to seek in the song
    console.log(`seek: ${currentSong.seek}`);

    currentSong.seekTime = seekTime || parse(time); //used to display the time in mm:ss
    console.log(currentSong.seekTime);

    serverQueue.songs.unshift(currentSong);
    serverQueue.player.stop();
}

/**
 * Fast forward a set amount of time in a song.
 * @param {Message} message A Discord message object.
 * @param {Object} serverQueue Contains information related to a Discord server's queue.
 * @returns 
 */
function forward(message,serverQueue){
    const args = message.content.split(" ");
    if(!message.member.voice.channel){
        return message.channel.send("❌ You have to be in a voice channel to seek.");
    }
    if (!serverQueue || serverQueue.songs.length == 0) {
        return message.channel.send("❌ No song to forward.");
    }
    if(serverQueue.songs[0].source != 'yt'){ 
        return message.channel.send("❌ Song must be from YouTube to forward.");
    }
    let song = serverQueue.songs[0];
    let amountToForward = parse(args[1]); //convert mm:ss format to seconds
    let currentTime = Math.floor((serverQueue.resource.playbackDuration + (song.seek*1000))/1000);
    let newTime = currentTime + amountToForward; 
    if (newTime > song.duration) {
        serverQueue.player.stop(); //just skip the song if they forward too far
    } else {
        console.log(`Forwarded ${args[1]} in ${song.title}`);
        seek(message, serverQueue, newTime);
    }
}

/**
 * Skip a song in the queue.
 * @param {Message} message A Discord message object.
 * @param {Object} serverQueue Contains information related to a Discord server's queue.
 * @returns 
 */
function skip(message, serverQueue){
    const args = message.content.split(" ");

    if (!message.member.voice.channel) {
        return message.channel.send("❌ You have to be in a voice channel to skip the song.");
    }
    if (!serverQueue || serverQueue.songs.length == 0){
        return message.channel.send("❌ No songs to skip.");
    }
    if (args.length == 1){
        serverQueue.keep = false; //don't keep skipped song in the queue
        serverQueue.player.stop();     //AudioPlayer stop method to skip to next song
        console.log(`Skipped ${serverQueue.songs[0].title}.`);
        return message.channel.send(`⏩ Skipped \*\*${serverQueue.songs[0].title}\*\*.`);
            //.then(msg => setTimeout(() => msg.delete(), 30 * 1000)); //delete after 30 seconds
    }
    let pos = parseInt(args[1]); //check if position is an integer
    //TODO: make into function
    if (isNaN(pos)) { //skip by keyword 
        let query = message.content.substring(message.content.indexOf(' '), message.content.length).trim();
        if (args[1] == 'last' || args[1] == 'end') { //check certain keywords first
            pos = serverQueue.songs.length-1;
        } else {   //otherwise find a match
            const regex = new RegExp(query, 'i'); //case insensitive regex
            pos = serverQueue.songs.findIndex(function (s) { //find position of a song title including keyword
                return regex.test(s.title); 
            });
        }
        if (pos < 0) {
            return message.channel.send(`❌ No song in queue with keyword \`${query}\`.`);
        } 
    } else if (pos > serverQueue.songs.length-1 || pos < 0) { 
        return message.channel.send(`❌ Skip position out of bounds. There are \*\*${serverQueue.songs.length-1}\*\* songs in the queue.`)   //return statement to avoid skipping
    } 
    if (pos == 0) { //removing the current playing song results in a skip
        serverQueue.player.stop();
        console.log(`Skipped ${serverQueue.songs[0].title}.`);
        return message.channel.send(`⏩ Skipped \*\*${serverQueue.songs[0].title}\*\*.`);
    } 
    console.log(`Removed ${serverQueue.songs[pos].title} from the queue.`);
    message.channel.send(`Removed \*\*${serverQueue.songs[pos].title}\*\* from the queue.`);//.then(msg => setTimeout(() => msg.delete(), 30*1000));    
    serverQueue.songs.splice(pos,1); 

    serverQueue.keep = false; //don't keep skipped song in the queue
 }
/**
 * Skip to a song in the queue.
 * @param {Message} message A Discord message object.
 * @param {Object} serverQueue  Contains information related to a Discord server's queue.
 * @returns 
 */
function skipto(message,serverQueue){
    const args = message.content.split(" ");
    let pos = parseInt(args[1]);
    let song;
    if(!message.member.voice.channel){
        return message.channel.send("❌ You have to be in a voice channel to skip.");
    }
    if (!serverQueue || serverQueue.songs.length == 0) {
        return message.channel.send("❌ No song to skip to.");
    }
    //TODO: make into function
    if (isNaN(pos)) { //skip by keyword
        let query = message.content.substring(message.content.indexOf(' '), message.content.length).trim();
        if (args[1] == 'last' || args[1] == 'end') { //check certain keywords first
            pos = serverQueue.songs.length-1;
        } else {   //otherwise find a match
            const regex = new RegExp(query, 'i'); //case insensitive regex
            pos = serverQueue.songs.findIndex(function (s) { //find position of a song title matching keyword
                return regex.test(s.title); 
            });
        }
        if (pos < 0) {
            return message.channel.send(`❌ No song in queue with keyword \`${query}\`.`);
        } 
    } else if (pos < 0 || pos > serverQueue.songs.length-1){
        return message.channel.send(`❌ There are only \*\*${serverQueue.songs.length-1}\*\* songs in the queue.`);
    } 
    if (pos == 0) { 
        return message.channel.send(`❌ The song is already playing.`);
    }
    song = serverQueue.songs.splice(pos,1);     //remove the song (splice returns array)
    serverQueue.songs.splice(1,0,song[0]);      //make it the next song
    serverQueue.player.stop();                  //skip current playing song 
}

/**
 * Displays lyrics for the current playing song.
 * @param {Message} message A Discord message object.
 * @param {Object} serverQueue  Contains information related to a Discord server's queue.
 * @returns 
 */
async function lyrics(message, serverQueue){
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
                searchMsg.delete();
                if (!lyrics) { 
                    console.log(`No lyrics found.`);
                    return message.channel.send(`❌ No lyrics found for \*\*${title}\*\*`)
                }
                console.log(`Found lyrics for ${serverQueue.songs[0].title}.`);
                let strings = splitText2(lyrics);
                for (string of strings) {
                    message.channel.send(string).then(string => setTimeout(() => string.delete(), duration*1000));
                }
                //return message.channel.send(lyrics)
            })
            .catch((e) => console.error(e));
}

/**
 * Change the volume of the bot.
 * @param {Message} message A Discord message object.
 * @param {Object} serverQueue Contains information related to a Discord server's queue.
 * @returns 
 */
function volume(message, serverQueue){
    let [min, max] = [0,200];
    const args = message.content.split(" ");
    let vol = parseInt(args[1])
    if(vol < min || vol > max) {
        return message.channel.send(`❌ Volume must be 0% to 200%.`)
    }
    serverQueue.volume = vol;
    serverQueue.resource.volume.setVolume(vol/100);
    return message.channel.send(`🔊 Volume has been set to \`${vol}%\` for \*\*${serverQueue.songs[0].title}\*\*`);
}

//add splitting at specified character
function splitText(text) {
    const maxLength = 1999;
    const numberOfStrings = text.length / maxLength;
    if (text.length < maxLength) {
        return [text];
    }

    let strings = [];
    for (let i = 0; i<numberOfStrings;i++){
        strings.push(text.substring(maxLength*i, maxLength*(i+1)));
    }
    // console.log(strings);
    return strings;
}

//Discord's now deprecated splitMessage function (default maxLength is 2000)
function splitText2(text, { maxLength = 1990, char = '\n', prepend = '', append = '' } = {}) {
    text = verifyString(text);
    if (text.length <= maxLength) return [text];
    let splitText = [text];
    if (Array.isArray(char)) {
      while (char.length > 0 && splitText.some(elem => elem.length > maxLength)) {
        const currentChar = char.shift();
        if (currentChar instanceof RegExp) {
          splitText = splitText.flatMap(chunk => chunk.match(currentChar));
        } else {
          splitText = splitText.flatMap(chunk => chunk.split(currentChar));
        }
      }
    } else {
      splitText = text.split(char);
    }
    //if (splitText.some(elem => elem.length > maxLength)) throw new RangeError('SPLIT_MAX_LEN');
    const messages = [];
    let msg = '';
    for (const chunk of splitText) {
      if (msg && (msg + char + chunk + append).length > maxLength) {
        messages.push(msg + append);
        msg = prepend;
      }
      msg += (msg && msg !== prepend ? char : '') + chunk;
    }
    return messages.concat(msg).filter(m => m);
}

/**
 * Converts mm:ss to seconds and seconds to mm:ss.
 * @param {number} input number to parse.
 * @returns {Object|number} Object containing minutes and seconds or number in seconds
 */
 function parse(input){ 
    //console.log(input);
    if (typeof input == "string" && input.indexOf(":") != -1) { //input in form of mm:ss
        let time = input.split(":"); 
        if (isNaN(time[0]) || isNaN(time[1]) || time[0] < 0 || time[1] < 0){
            //
        } else {    //otherwise, parse the given time 
            let minutes = Number(time[0]*60);
            let seconds = Number(time[1]);
            timeToSeek = minutes+seconds;
            return timeToSeek;
            //console.log(timeToSeek);
        }
    } else if (typeof input == "number"){
        let minutes = Math.floor(input/60);
        let seconds = input%60 < 10 ? '0' + input%60 : input%60;
        //return [minutes, seconds];
        return {minutes: minutes, seconds: seconds};
    } else {
        return 0;
    }
}



client.login(token);

