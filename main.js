/*
    Features to add:
    Autoplay related songs
    Run and control the bot from a single embed
    Slash commands
    Find a way to auto-refresh youtube cookie/bypass age-restricted content
*/
const {splitText, parse} = require('./utils')
//connection to discord
const Discord = require('discord.js');
const {Client, GatewayIntentBits, Partials, Events, Message, Guild} = require('discord.js');
const {VoiceConnectionStatus, entersState, getVoiceConnection, joinVoiceChannel, createAudioPlayer, createAudioResource, AudioPlayerStatus, NoSubscriberBehavior} = require('@discordjs/voice');

const {
    prefix,
    token,
    geniusApiKey,
    keyword,
} = require('./config.json');


//instance of the bot
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

const { addSpeechEvent, SpeechEvents } = require("discord-speech-recognition");
const playDL = require('play-dl');
const { getLyrics } = require('genius-lyrics-api');

addSpeechEvent(client, {profanityFilter: false});

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


//TODO: remove serverQueue argument from functions
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
            processMusic(message);
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

// function processMp3Url(message, serverQueue) {
//     const args = message.content.split(" ");
//     const attachment = message.attachments.first();
//     song = {
//         title: attachment?.name ?? args[1].slice(args[1].lastIndexOf('/')+1),
//         url: attachment?.url ?? args[1]
//     }
//     connect(message, serverQueue).then(() =>{
//     }).catch(() => {
//     }).finally(() => {
//         const q = queue.get(message.guild.id)
//         q.resource = createAudioResource(song.url)
    
//         q.connection.subscribe(q.player);
    
//         q.player.play(q.resource);
//         //console.log(q.resource.metadata)
    
//         var errorListener = error => {
//             console.error(`Error: ${error.message} with resource ${error.resource.title}`);
//         };
//         q.player.on('error', errorListener)
//         console.log(`Playing ${title} in "${message.guild.name}"`)
//         return message.channel.send(`🎶 Now playing \*\*${song.title}\*\* 🎵`);
//     })
// }

/**
 * Processes user input to either search for a song or process a URL.
 * @param {Message} message A Discord message object.
 * @param {Object} serverQueue Contains information related to a Discord server's queue.
 * @returns {Message} A message to the channel based on the user input.
 */
async function processMusic(message) { 
    const serverQueue = queue.get(message.guild.id);

    //check the last argument to see if it is a valid time to seek to
    //let timeToSeek = parse(args[args.length-1]);

    let request = message.content; //no trim or arguments will stop working due to regex needing whitespace
    //console.log(request);

    const attachment = message.attachments?.first() ?? 0; //if attachment does not exist, assign 0 instead
    const voiceChannel = message.member.voice.channel;
    //const attachedUrl = message.attachments?.first()?.url ?? 0;
    if (!voiceChannel){
        return (Math.round(Math.random())) ? message.channel.send("❌ You need to be in a channel to play music.") : message.channel.send("how bout u hop in a voice channel first❓");
       //return message.channel.send("You need to be in a channel to play music.");
    }
   
    if (!request && !attachment) {//someone invokes play command without any arguments
        return message.channel.send("❌ Specify a search, URL, or mp3 to play 🤓")
    } 
   
    if (attachment) request = attachment.url; //if we dont assign args[1] to url, args[1].trim will fail
    try { 
        let song = {};  //object containing song data
        let songs = []; //array of song objects
        //let check = await playDL.validate(args[1].trim());
        let check = await playDL.validate(request);
        let searchSource = {youtube: 'video'};  //where we want to perform the search and what type of result
        //console.log(check)  //debug
        if (check === false) {
            song = {
                title: attachment.name, //?? args[1].slice(args[1].lastIndexOf('/')+1),
                url: attachment.url, //?? args[1],
                source: 'discord'
            }
            songs.push(song);
        } else if (check === 'search') {
            let searchMsg = '';
            let argsRegex = new RegExp(/\s-[^\s]+/, 'g');
            let options = request.match(argsRegex) ?? [];
            options = options.map(e => e.trim());
            request = request.replace(argsRegex, "").trim();
            if (options.includes('-sc') || options.includes('-soundcloud')) { 
                if (options.includes('-pl') || options.includes('-playlist')) {
                    searchSource = {soundcloud: 'playlists'}
                    searchMsg = await message.channel.send(`Searching for a playlist named '${request}' on SoundCloud🔎`);
                    console.log(`${message.author.username} searched for playlist '${request}' on SoundCloud🔎`);
                } else if (options.includes('-al') || options.includes('-album')) {
                    searchSource = {soundcloud: 'albums'}
                    searchMsg = await message.channel.send(`Searching for an album named '${request}' on SoundCloud🔎`);
                    console.log(`${message.author.username} searched for album '${request}' on SoundCloud🔎`)
                } else {
                    searchSource = {soundcloud : 'tracks'};
                    searchMsg = await message.channel.send(`Searching for '${request}' on SoundCloud🔎`);
                    console.log(`${message.author.username} searched for '${request}' on SoundCloud🔎`)
                }
            } else {
                if (options.includes('-pl') || options.includes('-playlist')) {
                    searchSource = {youtube: 'playlist'}
                    searchMsg = await message.channel.send(`Searching for a playlist named '${request}' on YouTube🔎`);
                    console.log(`${message.author.username} searched for playlist '${request}' on YouTube🔎`);
                } else {
                    searchSource = {youtube: 'video'};
                    searchMsg = await message.channel.send(`Searching for '${request}' on YouTube🔎`);
                    console.log(`${message.author.username} searched for '${request}' on YouTube🔎`)
                }
            }
            //let request = message.content.substring(message.content.indexOf(' '),timeToSeek ? message.content.lastIndexOf(' ') : message.content.length).trim(); //if timetoseek is non-zero, go to last space (omit seek time) otherwise accept whole message
            const search = await playDL.search(request, {
                limit: 1,
                source: searchSource
            })
            searchMsg.delete();
            //console.log(search)
            //console.log(searchSource);
            if (search.length == 0){    
                return message.channel.send(`❌ No results found for  '${request}'  😢`);
            } else {
                if (search[0].type == 'track' || search[0].type == 'video') {
                    song = {
                        title: search[0].title || search[0].name,
                        //artist: search[0].channel?.name || search[0].publisher?.artist,
                        url: search[0].url,
                        duration: search[0].durationInSec,
                        durationTime: parse(search[0].durationInSec),
                        seek: 0,
                        seekTime: parse(0),
                        source: 'yt'
                    }
                    songs.push(song);
                } else if (search[0].type == 'playlist') {
                    message.content = search[0].url;
                    return processMusic(message,serverQueue); 
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
                    const video = await playDL.video_info(request);
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
                    const playlist = await playDL.playlist_info(request, {incomplete: true}) //parse youtube playlist ignoring hidden videos
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
                const so = await playDL.soundcloud(request)
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
                //await getSpotifyToken(spotifyId,spotifySecret)
                if (playDL.is_expired()) {
                    await playDL.refreshToken();
                    console.log('Refreshed Spotify token.')
                }               
                //return message.channel.send("Spotify is currently not supported. Refer to https://play-dl.github.io/modules.html#stream for more information.")
                const spot = await playDL.spotify(request)
                //console.log(type);
                if (type === 'track') {
                    //console.log(spot.artists[0].name);
                    console.log(`Searching '${spot.name} ${spot.artists[0].name}' from Spotify on YouTube`)
                    const search = await playDL.search(`${spot.name} ${spot.artists[0].name}`, {
                        limit: 1,
                        source: searchSource
                    })
                    if (search.length == 0) return; //message.channel.send(`Unable to find ${spot.name} ${spot.artists[0].name} on YouTube 😔`);
                    song = {
                        title: search[0].title,
                        artist: spot.artists[0].name,
                        url: search[0].url,
                        duration: search[0].durationInSec,
                        durationTime: parse(search[0].durationInSec),
                        seek: 0,
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
                            seek: 0,
                            //seekTime: parse(timeToSeek),
                            source: 'yt'
                        }
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
                    console.log(`Fetched ${songs.length} videos from "${tracks.name}"`)
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
    connect(message,songs)
    .then( 
        () => { //on resolve (queue created)
            play(message, message.guild, songs[0])
        },
        async () => { //on reject (queue exists)
            if (serverQueue.songs.length == 0) {   //if queue was empty, begin playing the first song 
                serverQueue.songs = serverQueue.songs.concat(songs);    //append the new songs to the end of the queue, needs to be done after the length is checked 
                play(message, message.guild, serverQueue.songs[0]);
            } else {
                if (serverQueue.paused) {
                    //message.channel.send(`The bot is paused. Unpausing now...`).then(msg => setTimeout(() => msg.delete(), 2_000));
                    //setTimeout(() => serverQueue.player.unpause(), 2_000);
                    //console.log(`Song unpaused by adding a new song.`)
                    const pauseMsg = await message.channel.send(`The bot is paused. The current song is \`\`${serverQueue.songs[0].title}\`\`.\n\*\*Do you want to play \`\`${songs[0].title}\`\` instead?\*\*`);

                    pauseMsg.react('❌');
                    pauseMsg.react('✅');

                    const collectorFilter = (reaction, user) => {
                        return ['❌', '✅'].includes(reaction.emoji.name) && user.id === message.author.id;
                    };
                    pauseMsg.awaitReactions({ filter: collectorFilter, max: 1, time: 30_000, errors: ['time'] })
                        .then(collected => {
                            if (collected.first().emoji.name == '✅') {
                                    //message.reply('Shutting down...');
                                    //client.destroy();
                                    serverQueue.songs.splice(1,0,songs[0]);      //make it the next song
                                    serverQueue.player.stop();                  //skip current playing song 
                            } else {
                                message.channel.send(`Unpausing now...`).then(msg => setTimeout(() => msg.delete(), 1_000));
                                //TODO: fix the repetition
                                addSong(message,songs)
                            } 
                            setTimeout(() => resume(message,serverQueue), 1_000);
                    }).catch(() => {
                        //pauseMsg.reply('No reaction after 30 seconds, operation canceled');
                    }).finally(() => {
                        pauseMsg.delete();
                    });
                } else {
                  addSong(message,songs)
                }
            } 
         })
    } catch (e) {
        console.error(e);
        return message.channel.send(`\`Error: ${e.message}\``);    
    }

 
}


function addSong(message, songs){
    let serverQueue = queue.get(message.guild.id)

    serverQueue.songs = serverQueue.songs.concat(songs);    //append the new songs to the end of the queue
    if (songs.length > 1) {
        //don't display anything
    } else {
        // if (song.seek > 0){ 
        //     console.log(`Added ${song.title} {${song.durationTime.minutes}:${song.durationTime.seconds}} to the queue starting at ${song.seekTime.minutes}:${song.seekTime.seconds}`);
        //     return message.channel.send(`\*\*${song.title}\*\* \`${song.durationTime.minutes}:${song.durationTime.seconds}\` has been added to the queue starting at \`${song.seekTime.minutes}:${song.seekTime.seconds}\`. `);
        // } 
        if (songs[0].source == 'discord'){
            console.log(`Added ${songs[0].title} to the queue.`);
            return message.channel.send(`\*\*${songs[0].title}\*\* has been added to the queue.`);
        } else {
            console.log(`Added ${songs[0].title} to the queue. {${songs[0].durationTime.minutes}:${songs[0].durationTime.seconds}}`);
            return message.channel.send(`\*\*${songs[0].title}\*\* \`${songs[0].durationTime.minutes}:${songs[0].durationTime.seconds}\` has been added to the queue. `);
        }
    } 
}

/**
 * Establishes a connection between a Discord voice channel and its associated queue.
 * @param {Message} message A Discord message object.
 * @param {Object} serverQueue Contains information related to a Discord server's queue.
 * @param {Array} songs Array of song objects
 * @returns {Promise}
 */
async function connect(message, songs = []) {
    const serverQueue = queue.get(message.guild.id);
    const voiceChannel = message.member.voice.channel;
    if (!voiceChannel){
        return (Math.round(Math.random())) ? message.channel.send("❌ You need to be in a channel to play music.") : message.channel.send("how bout u hop in a voice channel first❓");
       //return message.channel.send("You need to be in a channel to play music.");
    }
    /*if no server queue exists, create one with the following parameters, 
     assign the current guild id to the serverqueue, 
     and push the requested song onto the array.
    */
   return new Promise((resolve,reject) => {
        if (!serverQueue) {
            const queueConstructor = {
                //textChannel: message.channel,
                connection: null,
                lastPlayed: null, //last played song
                paused: false,
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
                    {
                    behaviors: {
                        noSubscriber: NoSubscriberBehavior.Pause //pause when there is no voice connection
                    },
                    }
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
                if (getVoiceConnection(message.guild.id) != null) {
                    const userCheck = setInterval(() => {
                        // console.log(client.channels.fetch(getVoiceConnection(message.guild.id).packets.state.channel_id))
                        client.channels.fetch(getVoiceConnection(message.guild.id)?.packets.state.channel_id)
                            .then((ch) => {
                                if (ch.members.size == 1) {
                                    clearInterval(userCheck);
                                    destroy(message.guild);
                                    console.log(`No active users, bot has disconnected from "${message.guild.name}"`);
                                } 
                            }).catch((e) => {
                                clearInterval(userCheck);
                                //console.error(e); //usually throws an error when the bot is forcibly disconnected but idk what to do about it
                            });
                    }, 10 * 1000);
                } 
                console.log(`Connected to ${message.guild.name}`);
            } catch (err) {
                console.log(err);
                queue.delete(message.guild.id); //on error, trash the serverqueue
                message.channel.send(`\`${err.message}\``)
                return;
            }
            resolve('Queue created');
        } else {
            reject('Queue exists');
        }
   })

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
    
    let stream = {
        stream: null
    };
    //console.log(song.source);
   
    try {
        if (song.source == 'yt' && song.seek > 0){  //only yt songs can be seeked, but there are songs from various sources in the playlist
            //console.log(`Seeked ${song.seek} seconds into ${song.title}.`);
            stream = await playDL.stream(song.url, {seek: song.seek});
        } else if (song.source == 'discord') {
            stream.stream = song.url;   
        } else {
            stream = await playDL.stream(song.url); 
        }
        serverQueue.resource = createAudioResource(stream.stream, {
            inputType: stream.type,
            inlineVolume: true
        });
    } catch (e) {
       console.error(e);
       serverQueue.songs.shift();
       return message.channel.send(`\`Error: ${e.message}\``);
    }
    


    serverQueue.resource.volume.setVolume(serverQueue.volume/100);

    serverQueue.connection.subscribe(serverQueue.player);

    serverQueue.player.play(serverQueue.resource);

    serverQueue.lastPlayed = song;
    //console.log(`lastPlayed: ${serverQueue.lastPlayed.title}`);

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

    if (serverQueue.loop == true) {
        // don't print anything
    } else {
        if (song.source == 'discord'){
            console.log(`Playing ${song.title} in "${guild.name}"`)
            message.channel.send(`🎶 Now playing \*\*${song.title}\*\* 🎵`) //starting at \`${song.seekTime.minutes}:${song.seekTime.seconds}\` 🎵`); 
                //.then(msg => setTimeout(() => msg.delete(), (song.duration-song.seek)*1000));
        } else {
            console.log(`Playing ${song.title} {${song.durationTime.minutes}:${song.durationTime.seconds}} in "${guild.name}"`) //starting at {${song.seekTime.minutes}:${song.seekTime.seconds}}`);
            message.channel.send(`🎶 Now playing \*\*${song.title}\*\* \`${song.durationTime.minutes}:${song.durationTime.seconds}\` 🎵`);
                //.then(msg => setTimeout(() => msg.delete(), song.duration*1000));
        }
        //showQueue(serverQueue);
    }
}

/**
 * Clears all the songs in the queue.
 * @param {Message} message A Discord message object.
 * @returns {Message} A message to the channel on whether or not the queue has been cleared.
 */
function clear(message){
    const serverQueue = queue.get(message.guild.id);

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
 * @returns {Message} A message that indicates the state of the loop.
 */
function loopSong(message){
    const serverQueue = queue.get(message.guild.id);
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
            return message.channel.send('⚡ Loop **ACTIVATED** 🌩️ (type !loop again to deactivate)');
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
 * @returns {Message} A message showing the queue of songs.
 */
function showQueue(message){
    const serverQueue = queue.get(message.guild.id);

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
    let strings = splitText(msg);
    for (string of strings) {
        message.channel.send('```' + string + '```').then(string => setTimeout(() => string.delete(), 30*1000));
    }

}

/**
 * Pauses the song.
 * @param {Message} message A Discord message object.
 * @returns {Message} A message showing if the song has been paused or not.
 */
function pause(message){
    const serverQueue = queue.get(message.guild.id);

    if(!message.member.voice.channel){
        return message.channel.send("❌ You have to be in a voice channel to pause the song.");
    }
    if (!serverQueue || serverQueue.songs.length == 0) {
        return message.channel.send("❌ No song to pause.");
    }
    if (serverQueue.player.pause()) {
        serverQueue.paused = true;
        console.log(`Song paused.`);
        return message.channel.send("⏸️ Paused song. (type !resume to continue playing)")
    }
    console.log("Failed to pause.")
    return message.channel.send("❌ Something went wrong pausing the bot.")
}

/**
 * Resumes the song.
 * @param {Message} message A Discord message object.
 */
function resume(message){
    const serverQueue = queue.get(message.guild.id);

    if(!message.member.voice.channel){
        return message.channel.send("❌ You have to be in a voice channel to resume the song.");
    }
    if (!serverQueue || serverQueue.songs.length == 0) {
        return message.channel.send("❌ No song to resume.");
    }
    if (serverQueue.player.unpause()) {
        serverQueue.paused = false;
        console.log(`Song resumed.`);
        return;
        //return message.channel.send("▶️ Resumed song.")
    }
    return message.channel.send("❌ Something went wrong unpausing the bot.")
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
 * Shuffles the queue of songs.
 * @param {Message} message  A Discord message object.
 * @returns 
 */
function shuffle(message) {
    const serverQueue = queue.get(message.guild.id);

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
 * @param {number} [time=0] Number of seconds to seek into the song.
 * @returns 
 */
function seek(message, time = -1) {
    const serverQueue = queue.get(message.guild.id);

    //console.log(`time: ${time}`)
    const args = message.content.split(" ");
    if(!message.member.voice.channel){
        return message.channel.send("❌ You have to be in a voice channel to seek.");
    }
    if (!serverQueue || serverQueue.songs.length == 0) {
        return message.channel.send("❌ No song to seek.");
    }
    if(serverQueue.songs[0].source !== 'yt'){ 
        return message.channel.send("❌ Song must be from YouTube to seek.");
    }
    if (['minutes', 'minute', 'm'].includes(args[2])) {
        args[1] = `${args[1]}:00`;
    }
    //console.log(serverQueue.resource.playbackDuration);
    let timeToSeek = 0;
    let seekTime = 0;
    if (time == -1) { //if no timestamp is given then process the user's timestamp
        timeToSeek = parse(args[1]) || parse(time);
        seekTime = parse(timeToSeek);
        //console.log(timeToSeek);
        //console.log(seekTime);
        let maxDuration = serverQueue.songs[0].duration;
        let maxTime = parse(maxDuration);
        if (args[1].indexOf(':') == -1) {
            return message.channel.send(`❌ Enter a timestamp between <0:00-${maxTime.minutes}:${maxTime.seconds}>`);
        }
        if (timeToSeek > maxDuration || timeToSeek < 0){ 
            //console.log(maxDuration)
            console.error(`Seek failed, requested ${timeToSeek}, max is ${maxDuration}`);
            return message.channel.send(`❌ Enter a timestamp between <0:00-${maxTime.minutes}:${maxTime.seconds}>`);
        } 
    }
    //else if (timeToSeek == 0) {
    //     return message.channel.send(`❌ Specify a timestamp. <0-${maxTime.minutes}:${maxTime.seconds}>`);
    // }
    let currentSong = serverQueue.songs[0];
    currentSong.seek = timeToSeek || time; //used to seek in the song
    //console.log(`seek: ${currentSong.seek}`);

    currentSong.seekTime = seekTime || parse(time); //used to display the time in mm:ss
    //  console.log(currentSong.seekTime);

    serverQueue.songs.unshift(currentSong);
    serverQueue.player.stop();
}

/**
 * Fast forward a set amount of time in a song.
 * @param {Message} message A Discord message object.
 * @returns 
 */
function forward(message){
    const serverQueue = queue.get(message.guild.id);

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
    let amountToForward = parseInt(parse(args[1]) || args[1]) || 30; 

    let currentTime = Math.floor((serverQueue.resource.playbackDuration + (song.seek*1000))/1000); //convert to seconds
    let newTime = Math.max(0, currentTime + amountToForward); 

    let displayStartTime = parse(currentTime);
    let displayEndTime = parse(Math.min(newTime, song.duration));
    //console.log(amountToForward);
    //console.log(displayStartTime);
    //console.log(displayEndTime);

    console.log(`Forwarded ${amountToForward} seconds in ${song.title} from ${displayStartTime.minutes}:${displayStartTime.seconds} to ${displayEndTime.minutes}:${displayEndTime.seconds}`);
    const ffMsg = message.channel.send(`Forwarded \*\*${song.title}\*\* from \`${displayStartTime.minutes}:${displayStartTime.seconds}\` to \`${displayEndTime.minutes}:${displayEndTime.seconds}\`.`);
    if (newTime > song.duration) {
        return serverQueue.player.stop(); //just skip the song if they forward too far
    } 
    seek(message, serverQueue, newTime);
    //ffMsg.delete();
}

/**
 * Skip a song in the queue.
 * @param {Message} message A Discord message object.
 * @returns 
 */
function skip(message){
    const serverQueue = queue.get(message.guild.id);
    const args = message.content.split(" ");

    if (!message.member.voice.channel) {
        return message.channel.send("❌ You have to be in a voice channel to skip the song.");
    }
    if (!serverQueue || serverQueue.songs.length == 0){
        return message.channel.send("❌ No songs to skip.");
    }
    if (serverQueue.paused) {
        resume(message,serverQueue);
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
        let request = message.content.substring(message.content.indexOf(' '), message.content.length).trim();
        if (args[1] == 'last' || args[1] == 'end') { //check certain keywords first
            pos = serverQueue.songs.length-1;
        } else {   //otherwise find a match
            const regex = new RegExp(request, 'i'); //case insensitive regex
            pos = serverQueue.songs.findIndex(function (s) { //find position of a song title including keyword
                return regex.test(s.title); 
            });
        }
        if (pos < 0) {
            return message.channel.send(`❌ No song in queue with keyword \`${request}\`.`);
        } 
    } else if (pos > serverQueue.songs.length-1 || pos < 0) { 
        return message.channel.send(`❌ Skip position out of bounds. There are \*\*${serverQueue.songs.length-1}\*\* songs in the queue.`)   //return statement to avoid skipping
    } 
    if (pos == 0) { //removing the current playing song results in a skip
        serverQueue.keep = false; //don't keep skipped song in the queue
        serverQueue.player.stop();
        console.log(`Skipped ${serverQueue.songs[0].title}.`);
        return message.channel.send(`⏩ Skipped \*\*${serverQueue.songs[0].title}\*\*.`);
    } 
    console.log(`Removed ${serverQueue.songs[pos].title} from the queue.`);
    message.channel.send(`Removed \*\*${serverQueue.songs[pos].title}\*\* from the queue.`);//.then(msg => setTimeout(() => msg.delete(), 30*1000));    
    serverQueue.songs.splice(pos,1); 

 }
/**
 * Skip to a song in the queue.
 * @param {Message} message A Discord message object.
 * @returns 
 */
function skipto(message){
    const serverQueue = queue.get(message.guild.id);
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
        let request = message.content.substring(message.content.indexOf(' '), message.content.length).trim();
        if (args[1] == 'last' || args[1] == 'end') { //check certain keywords first
            pos = serverQueue.songs.length-1;
        } else {   //otherwise find a match
            const regex = new RegExp(request, 'i'); //case insensitive regex
            pos = serverQueue.songs.findIndex(function (s) { //find position of a song title matching keyword
                return regex.test(s.title); 
            });
        }
        if (pos < 0) {
            return message.channel.send(`❌ No song in queue with keyword \`${request}\`.`);
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
 * Change the volume of the bot.
 * @param {Message} message A Discord message object.
 * @returns 
 */
function volume(message){
    const serverQueue = queue.get(message.guild.id);

    if(!message.member.voice.channel){
        return message.channel.send("❌ You have to be in a voice channel to change the volume.");
    }
    if (!serverQueue) {
        return message.channel.send("❌ Play a song to change its volume.");
    }
    let [min, max] = [0,500];
    const args = message.content.split(" ");
    let vol = parseInt(args[1])
    if(vol < min || vol > max || isNaN(vol)) {
        return message.channel.send(`❌ Volume must be 0% to 500%.`)
    }
    //serverQueue.volume = vol;
    serverQueue.resource.volume.setVolume(vol/100);
    console.log(`Set volume for ${serverQueue.songs[0].title} to ${vol}`);
    return message.channel.send(`🔊 Volume has been set to \`${vol}%\` for \*\*${serverQueue.songs[0].title}\*\*`);
}

/**
 * Replays the last played song.
 * @param {Message} message A Discord message object.
 * @returns 
 */
function replay(message) {
    const serverQueue = queue.get(message.guild.id);

    if(!message.member.voice.channel){
        return message.channel.send("❌ You have to be in a voice channel to replay the song.");
    }
    if (!serverQueue || !serverQueue.lastPlayed) {
        return message.channel.send("❌ No song to replay. (Play a song before trying to replay it)");
    }
    //console.log(`lastPlayed: ${serverQueue.lastPlayed.title}`);
    serverQueue.songs.splice(1,0,serverQueue.lastPlayed);
    play(message,message.guild,serverQueue.songs[0]);
}


client.login(token);

