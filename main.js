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
const { addSpeechEvent } = require("discord-speech-recognition");
const {Client, GatewayIntentBits, Partials, Message} = require('discord.js');
const {
    prefix,
    token,
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
addSpeechEvent(client);

const playDL = require('play-dl');

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


// client.on('voiceStateUpdate', (oldState, newState) => {
//     if (newState.channel && !oldState.channel) {
//     //   console.log(
//     //     `${newState.member.displayName} has joined the voice channel "${newState.channel.name}"`
//     //   );
//     }
//     if (!newState.channel && oldState.channel) {
//     //   console.log(
//     //     `${oldState.member.displayName} has left the voice channel "${oldState.channel.name}"`
//     //   );
        
//     }  
//     // if (newState.channel && oldState.channel) {
//     //   if (newState.channel.id !== oldState.channel.id) {
//     //     console.log(
//     //       `${newState.member.displayName} has left the voice channel "${oldState.channel.name}" and joined "${newState.channel.name}"`
//     //     );
//     //   } else {
//     //     console.log(
//     //       `${newState.member.displayName} is still in the voice channel "${oldState.channel.name}" but there were some changes (e.g. muted/unmuted themselves, started sharing their screen, etc.)`
//     //     );
//     //   }
//     // }
//   });

/*
client.once('error', error => {
    console.error(`Error: ${error.message} with resource ${error.resource.title}`);
})
*/
playDL.getFreeClientID().then((clientID) => playDL.setToken({
    soundcloud : {
        client_id : clientID
    }
}))

client.on('messageCreate', function messageHandler(message) {
    if (message.author.bot) {
        return; //don't respond to self-messages
    }
    if (!message.content.startsWith(prefix)) return;
    
    command(message);
    this.removeListener('messageCreate', messageHandler);
});

client.on("speech", function voiceHandler(voice) {
    if (!voice.content) return; //if no speech detected, do nothing
    //console.log(`${voice.author.username} said ${voice.content}`);
    if (voice.content.toLowerCase().includes('music')){
        //console.log(voice);
        voice.content = `!${voice.content.toLowerCase().split('music')[1].trim()}`; //append '!' so everything else works
        console.log(`${voice.author.username} said '${voice.content}'`)
        command(voice);
    }
    this.removeListener('speech', voiceHandler);
})

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
}

async function execute(message, serverQueue) {
    const args = message.content.split(" ");
    const voiceChannel = message.member.voice.channel;
    if (!voiceChannel){
        return (Math.round(Math.random())) ? message.channel.send("❌ You need to be in a channel to play music.") : message.channel.send("how bout u hop in a voice channel first❓");
       //return message.channel.send("You need to be in a channel to play music.");
    }
    // const permissions = voiceChannel.permissionsFor(message.client.user);
    // if (!permissions.has('CONNECT') || !permissions.has('SPEAK')) {
    //     return message.channel.send("imagine not having permissions 😭 ");
    //     //return message.channel.send("You don't have permission to do that.")
    // };

    if (args.length == 1) {//someone invokes play command without any arguments
        return message.channel.send("Specify a search or URL to play 🤓")
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
        let query = message.content.substring(message.content.indexOf(' '), message.content.length).trim();
        options = query.match(/-[^\s]+/g);
        //console.log(options);
        if (args[1].trim() == '-sc' || args[1].trim() == '-soundcloud') { //check if the second string in the query is a specifier  (change to parse all dash prefixes as arguments)
            searchSource = {soundcloud : 'tracks'};
            query = message.content.substring(message.content.indexOf(' ', message.content.indexOf(' ')+1), message.content.length).trim();
            console.log(`${message.author.username} searched for '${query}' on SoundCloud🔎`);
        } else {
            console.log(`${message.author.username} searched for '${query}' on YouTube🔎`);
        }
        //let query = message.content.substring(message.content.indexOf(' '),timeToSeek ? message.content.lastIndexOf(' ') : message.content.length).trim(); //if timetoseek is non-zero, go to last space (omit seek time) otherwise accept whole message
        const searchMsg = await message.channel.send(`Searching for '${query}' 🔎`);
        const search = await playDL.search(query, {
            limit: 1,
            source: searchSource
        })
        searchMsg.delete();
        //console.log(search)
        //console.log(searchSource);
        if (search.length == 0){    
            return message.channel.send(`No results found for  '${query}'  😢`);
        } else {
            song = {
                title: search[0].title,
                url: search[0].url,
                duration: search[0].durationInSec,
                durationTime: parse(search[0].durationInSec),
                //seek: timeToSeek,
                //seekTime: parse(timeToSeek),
                source: 'yt'
            }
            if ('soundcloud' in searchSource){
                song.title = search[0].name;
                song.source = 'so';
            }
            songs.push(song);
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
                    url: video.video_details.url,
                    duration: video.video_details.durationInSec,
                    durationTime: parse(video.video_details.durationInSec),
                    //seek: timeToSeek,
                    //seekTime: parse(timeToSeek),
                    source: 'yt'
                }
                songs.push(song)
            } else if (type === 'playlist') {
                const playlist = await playDL.playlist_info(args[1], {incomplete: true}) //parse youtube playlist ignoring hidden videos
                const videos = await playlist.all_videos()
                console.log(`Fetched ${playlist.total_videos} videos from "${playlist.title}"`)
                videos.forEach(function (video) {
                    song = {
                        title: video.title,
                        url: video.url,
                        duration: video.durationInSec,
                        durationTime: parse(video.durationInSec),
                        //seek: timeToSeek,
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
                        url: search[0].url,
                        duration: search[0].durationInSec,
                        durationTime: parse(search[0].durationInSec),
                        //seek: timeToSeek,
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
            //seek: timeToSeek,
            keep: false, //whether or not the current song should be kept in the queue, used for skipping songs while looping
            //timeoutID: undefined    //separate timeout ID for each guild
            //volume: 5,
            //playing: true
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
                    const membersInChannel = client.channels.fetch(getVoiceConnection(message.guild.id).packets.state.channel_id); //get the current channel of the bot
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

function destroy(guild){
    getVoiceConnection(guild.id).destroy();
    queue.delete(guild.id);
}

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
   
    if (song.source === 'yt' && song.seek > 0){  //only yt songs can be seeked, but there are songs from various sources in the playlist
        console.log(`Seeked ${song.seek} seconds into the song.`);
        stream = await playDL.stream(song.url, {seek: song.seek});
    } else {
        //console.trace();
        stream = await playDL.stream(song.url);  
    }
  
  
    serverQueue.resource = createAudioResource(stream.stream, {
        inputType: stream.type,
        inlineVolume: true
    });
 
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
            return message.channel.send('⚡Loop **ACTIVATED**🌩️');
        } else {
            console.log('Disabled the loop.');
            return message.channel.send('📴Loop **DEACTIVATED**😥');
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

function showQueue(message,serverQueue){
    const args = message.content.split(" ");
    let pos = 15; //show at most 15 songs


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
    message.channel.send('```' + msg + '```').then(msg => setTimeout(() => msg.delete(), 60*1000));

}

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

function resume(message, serverQueue){
    if(!message.member.voice.channel){
        return message.channel.send("❌ You have to be in a voice channel to resume the song.");
    }
    if (!serverQueue || serverQueue.songs.length == 0) {
        return message.channel.send("❌ No song to resume.");
    }
    console.log(`Song resumed.`);
    serverQueue.player.unpause();
    return message.channel.send("▶️ Resumed song.")
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
 * @param {String} message
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
 * Displays the list of commands
 * @param {String} message  
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
    
    !vol -- change the volume from 1-200%
    !shuffle -- shuffles the queue
    !loop -- repeats the queue 
    !seek mm:ss -- seek to a desired time in the current playing song\n
    To view these commands again, type !help or !commands
    `
    message.channel.send('```' + commands + '```');//.then(msg => setTimeout(() => msg.delete(), 30*1000));
}


/**
 * Shuffles the queue of songs in the provided serverQueue
 * @param {String} message  
 * @param {Object} serverQueue
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


function seek(message,serverQueue) {
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
    let timeToSeek = parse(args[1]);
    let seekTime = parse(timeToSeek);
    //console.log(timeToSeek);
    //console.log(seekTime);
    let maxDuration = serverQueue.songs[0].duration;
    let maxTime = parse(maxDuration);
    if (timeToSeek > maxDuration || timeToSeek < 0){ 
        //console.log(maxDuration)
        console.log(`Seek failed, requested ${timeToSeek}, max is ${maxDuration}`);
        return message.channel.send(`❌ Invalid timestamp. <0-${maxTime.minutes}:${maxTime.seconds}>`);
    } 
    //else if (timeToSeek == 0) {
    //     return message.channel.send(`❌ Specify a timestamp. <0-${maxTime.minutes}:${maxTime.seconds}>`);
    // }
    let currentSong = serverQueue.songs[0];
    currentSong.seek = timeToSeek;
    currentSong.seekTime = seekTime;
    serverQueue.songs.unshift(currentSong);
    serverQueue.player.stop();
}

//used to remove a song
function skip(message, serverQueue){
    const args = message.content.split(" ");

    if (!message.member.voice.channel) {
        return message.channel.send("❌ You have to be in a voice channel to skip the song.");
    }
    if (!serverQueue || serverQueue.songs.length == 0){
        return message.channel.send("❌ No songs to skip.");
    }
    if (args.length == 1){
        serverQueue.player.stop();     //AudioPlayer stop method to skip to next song
        console.log(`Skipped ${serverQueue.songs[0].title}.`);
        return message.channel.send(`⏩ Skipped \*\*${serverQueue.songs[0].title}\*\*.`);
            //.then(msg => setTimeout(() => msg.delete(), 30 * 1000)); //delete after 30 seconds
    }
    let pos = parseInt(args[1]); //check if position is an integer
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

 //used to skip to a song
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
        return message.channel.send(`❌ Skip position out of bounds. There are \*\*${serverQueue.songs.length-1}\*\* songs in the queue.`);
    } 
    if (pos == 0) { 
        return message.channel.send(`❌ The song is already playing.`);
    }
    song = serverQueue.songs.splice(pos,1);     //remove the song (splice returns array)
    serverQueue.songs.splice(1,0,song[0]);      //make it the next song
    serverQueue.player.stop();                  //skip current playing song 
}



/**
 * Given a number, parses it into the form of mm:ss
 * @param {number} input number to parse.
 * @returns {object} object containing the parsed data.
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

function volume(message, serverQueue){
    let [min, max] = [1,200];
    const args = message.content.split(" ");
    let vol = parseInt(args[1])
    if(vol < min || vol > max) {
        return message.channel.send(`❌ Volume must be 1% to 200%.`)
    }
    serverQueue.resource.volume.setVolume(vol/100);
    return message.channel.send(`🔊 Volume has been set to \`${vol}%\` for \*\*${serverQueue.songs[0].title}\*\*`);
}

client.login(token);

