/*
    Features to add:
    !skip {n} skips max({n}, queue.length) songs in the queue 
    Remove individual songs from queue
    Seek to a given time ✅
    YouTube playlist support ✅
*/

// serverQueue.textChannel.send() is used when an instance of the ServerQueue already exists, 
// message.channel.send() is used otherwise

//connection to discord
const Discord = require('discord.js');
const {Client, Intents} = require('discord.js');
const {
    prefix,
    token,
} = require('./config.json');

//instance of the bot
const client = new Client({ intents: ["GUILDS", "GUILD_MESSAGES", "GUILD_VOICE_STATES"] });

const playDL = require('play-dl');

const { NoSubscriberBehavior, getVoiceConnection, joinVoiceChannel, createAudioPlayer, createAudioResource, AudioPlayerStatus} = require('@discordjs/voice');

const queue = new Map(); //map of guild ID and its respective queue
let timeoutID = undefined;

client.once('ready', () =>{
    console.log("PALACE BAY is online!");
});
client.once('reconnect', () =>{
    console.log("PALACE BAY is reconnecting...");
});
client.on('disconnect', () =>{
    console.log("PALACE BAY has disconnected.");
});

// client.on('voiceStateUpdate', (oldState, newState) => {
//     console.log('oldState ' + oldState.channel);
//     console.log('newState ' + newState.channel);
//     //bot is joining
//     if (oldState.channel === null) return; //console.log('JOINED')  
//     //bot is disconnecting
//     if (newState.channel === null) {
//         //console.log('disconnected')
//         queue.delete(oldState.guild.id);
//     }
// });
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

client.on('messageCreate', async message =>{
    if (message.author.bot) {
       // message.delete() 
        return; //don't respond to self-messages
    }
    if (!message.content.startsWith(prefix)) return;
    
    const serverQueue = queue.get(message.guild.id);
    
    const args = message.content.slice(prefix.length).trim().split(' ');
    const command = args.shift().toLowerCase();
    switch(command){
        case 'p':
        case 'play' :
            execute(message, serverQueue);
            break;
        case 'next':
        case 'skip':
            skip(message, serverQueue);
            break;
        case 'clear':
            clear(message, serverQueue);
            break;
        case 'pause':
            pause(message,serverQueue);
             break;
        case 'resume':
            resume(message, serverQueue);
            break;
        case 'loop':
            loopSong(message, serverQueue);
            break;
        case 'queue':
            showQueue(serverQueue);
            break;
        case 'stop':
            stop(message,serverQueue);
            break;
        // case 'seek':
        //     seek(message,serverQueue);
        //     break;
        default:
           // message.channel.send("You need to enter a valid command!");
            help(message);
            break;
    }
    
});


async function execute(message, serverQueue) {
    const args = message.content.split(" ");
    const voiceChannel = message.member.voice.channel;

    let timeToSeek = 0;

    if (!voiceChannel){
        return (Math.round(Math.random())) ? message.channel.send("❌ You need to be in a channel to play music.") : message.channel.send("how bout u hop in a voice channel first❓");
       //return message.channel.send("You need to be in a channel to play music.");
    }
    const permissions = voiceChannel.permissionsFor(message.client.user);
    if (!permissions.has('CONNECT') || !permissions.has('SPEAK')) {
        return message.channel.send("imagine not having permissions 😭 ");
        //return message.channel.send("You don't have permission to do that.")
    };

    if(args.length == 1) {return message.channel.send("Specify a search or URL to play 🤓")};   //someone invokes play command without any arguments
    
    //parse the given seek time 
    if (args[args.length-1].indexOf(":") != -1){
        let time = args[args.length-1].split(":"); //assuming form of mm:ss
        if (isNaN(time[0]) || isNaN(time[1])){
            //do nothing, move on
        } else {    //otherwise, parse the given time 
            let minutes = Number(time[0]*60);
            let seconds = Number(time[1]);
            timeToSeek = minutes+seconds;
            //console.log(timeToSeek);

        }
    }

    let song = {};
    let songs = [];
    //if (args[1].startsWith("https")){
    let check = await playDL.validate(args[1].trim());
    //console.log(check)  //debug
    if (check === false) {
        return message.channel.send("❌ Failed to validate URL or search.");
    } else if (check === 'search') {
        let query = message.content.substring(message.content.indexOf(' '),timeToSeek ? message.content.lastIndexOf(' ') : message.content.length).trim();
        console.log(`Searching for '${query}' 🔎`);
        const searchMsg = await message.channel.send(`Searching for '${query}' 🔎`);
        const search = await playDL.search(query, {
            limit: 1
        })
        searchMsg.delete();
        //console.log(search)
        if (search.length == 0){    
            return message.channel.send(`No results found for  '${query}'  😢`);
        } else {
            song = {
                title: search[0].title,
                url: search[0].url,
                duration: search[0].durationInSec,
                durationTime: parse(search[0].durationInSec),
                seek: timeToSeek,
                seekTime: parse(timeToSeek),
                source: 'yt'
            }
            songs.push(song)
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
                    seek: timeToSeek,
                    seekTime: parse(timeToSeek),
                    source: 'yt'
                }
                songs.push(song)
            } else if (type === 'playlist') {
                const playlist = await playDL.playlist_info(args[1], {incomplete: true}) //parse youtube playlist ignoring hidden videos
                const videos = await playlist.all_videos()
                console.log(`Fetched ${playlist.total_videos} videos from the playlist`)
                videos.forEach(function (video) {
                    song = {
                        title: video.title,
                        url: video.url,
                        duration: video.durationInSec,
                        durationTime: parse(video.durationInSec),
                        seek: timeToSeek,
                        seekTime: parse(timeToSeek),
                        source: 'yt'
                    }
                    songs.push(song)
                })
                message.channel.send(`Queued \*\*${songs.length}\*\* songs ✅`)
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
                console.log(`Fetched ${so.total_tracks} tracks from the playlist`)
                tracks.forEach(function (track) {
                    song = {
                        title: track.name,
                        url: track.url,
                        duration: track.duration,
                        durationTime: parse(track.duration),
                        source: 'so'
                    }
                    songs.push(song)
                })
                message.channel.send(`Queued \*\*${songs.length}\*\* songs ✅`)
            }
        } else if (source === 'sp'){
            return message.channel.send("Spotify is currently not supported. Refer to https://play-dl.github.io/modules.html#stream for more information.")
            // const spot = await playDL.spotify(args[1])
            // if (type === 'track') {
            //     song = {
            //         title: track.name,
            //         url: track.url
            //     }
            //     songs.push(song)
            // } else if (type === 'album' || type === 'playlist') {
            //     const tracks = await spot.all_tracks()
            //     tracks.forEach(function (track) {
            //         song = {
            //             title: track.name,
            //             url: track.url
            //         }
            //         songs.push(song)
            //     })
            // }
        }
    }

    //console.log(song);
    if(song.source === 'yt'){
        let maxDuration = song.duration-2;
        if (timeToSeek > maxDuration){ 
            //console.log(maxDuration)
            let maxTime = parse(maxDuration);
            console.log(`Seek exceeded song limits, requested ${timeToSeek}, max is ${maxDuration}`);
            return message.channel.send(`❌ Seeking beyond limits. <0-${maxTime.minutes}:${maxTime.seconds}>`);
        }
    }

    /*if no server queue exists, create one with the following parameters, 
     assign the current guild id to the serverqueue, 
     and push the requested song onto the array.
    */
    if (!serverQueue) {
        const queueConstructor = {
            textChannel: message.channel,
            voiceChannel: voiceChannel,
            connection: null,
            songs: songs,
            player: null,
            loop: false,
            //loopall: false,
            //seek: timeToSeek,
            keep: false //whether or not the current song should be kept in the queue
            //timeoutID: undefined,
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
            })
            queueConstructor.connection = connection;
            queueConstructor.player = createAudioPlayer(
                /*{
                behaviors: {
                    noSubscriber: NoSubscriberBehavior.Stop,
                },
            }*/
            );
            play(message.guild, queueConstructor.songs[0]);
        } catch (err) {
            console.log(err);
            queue.delete(message.guild.id); //on error, trash the serverqueue
            return message.channel.send(err);
        }

    } else {
        serverQueue.songs = serverQueue.songs.concat(songs);    //append the new songs to the end of the queue
        //console.log(serverQueue.songs.length);
        //if the queue exists and it is the only song in the queue, play it
        if (serverQueue.songs.length == 1) {
            play(message.guild, serverQueue.songs[0]);
        } else {
            if (song.seek > 0){
                console.log(`Added ${song.title} \`${song.durationTime.minutes}:${song.durationTime.seconds}\` to the queue seeking to ${song.seekTime.minutes}:${song.seekTime.seconds}`);
                return message.channel.send(`\*\*${song.title}\*\* \`${song.durationTime.minutes}:${song.durationTime.seconds}\` has been added to the queue seeking to \`${song.seekTime.minutes}:${song.seekTime.seconds}\`. ✅`);
            } else {
                console.log(`Added ${song.title} to the queue. {${song.durationTime.minutes}:${song.durationTime.seconds}}`);
                return message.channel.send(`\*\*${song.title}\*\* \`${song.durationTime.minutes}:${song.durationTime.seconds}\` has been added to the queue. ✅`);
            }

            //showQueue(serverQueue);
        }
    }
}


async function play(guild, song){
    const serverQueue = queue.get(guild.id);

    //if no song to be played, idle for 300 seconds (5 min) before destroying connection
    if (!song) {
        timeoutID = setTimeout(() => {
            console.log(`Timeout ${timeoutID}.`);
            //serverQueue.connection.disconnect();
            getVoiceConnection(guild.id).destroy();
            queue.delete(guild.id);
            timeoutID = undefined;  //after timeout goes off, reset timeout value.
        }, 300 * 1000);
        console.log(`Timeout ${timeoutID} set.`);
        return;
    }
    
    //if song is queued during timeout, clear timeout
    if (timeoutID != undefined){    
        console.log(`Timeout ${timeoutID} cleared.`);
        clearTimeout(timeoutID);
        timeoutID = undefined;
    } 
    
    let stream;
    //console.log(song.source);
    if (song.source === 'yt' && song.seek > 0){  //only yt songs can be seeked, but there are songs from various sources in the playlist
        console.log(`Seeked ${song.seek} seconds into the song.`);
        stream = await playDL.stream(song.url, {seek: song.seek});
    } else {
        stream = await playDL.stream(song.url);
    }

    let resource = createAudioResource(stream.stream, {
        inputType: stream.type
    });
    serverQueue.connection.subscribe(serverQueue.player);

    serverQueue.player.play(resource);

    //event handlers for the music player
    var errorListener = error => {
        console.error(`Error: ${error.message} with resource ${error.resource.title}`);
        //serverQueue.textChannel.send(`${error.message} error with resource ${error.resource.title}. Please try again.`)
    };

    serverQueue.player.on('error', errorListener);

    serverQueue.player.once(AudioPlayerStatus.Idle, () => {
        serverQueue.player.removeListener('error', errorListener); //remove previous listener
        if (serverQueue.loop === true && serverQueue.keep) {    //the loop is on and the song is flagged to be kept
            serverQueue.songs.push(serverQueue.songs.shift());  
        } else {
            //pop song off the array (essentially placing the next song at the top)
            serverQueue.songs.shift();  
            if (serverQueue.loop === true){
                serverQueue.keep = true;    //reset keep flag after skipping in a loop
            }
        }
        //serverQueue.seek = 0;   //reset any seek option after playing
        play(guild, serverQueue.songs[0]);
    })


    console.log(`Playing ${song.title} {${song.durationTime.minutes}:${song.durationTime.seconds}}`);
    if (serverQueue.loop == true) {
        // don't print anything
    } else {
        if (song.seek > 0){
            serverQueue.textChannel.send(`🎶 Now playing \*\*${song.title}\*\* \`${song.durationTime.minutes}:${song.durationTime.seconds}\` starting at \`${song.seekTime.minutes}:${song.seekTime.seconds}\` 🎵`)
                .then(msg => setTimeout(() => msg.delete(), (song.duration-song.seek)*1000));
        } else {
            serverQueue.textChannel.send(`🎶 Now playing \*\*${song.title}\*\* \`${song.durationTime.minutes}:${song.durationTime.seconds}\` 🎵`)
                .then(msg => setTimeout(() => msg.delete(), song.duration*1000));
        }
        //showQueue(serverQueue);
    }
}

function skip(message, serverQueue){
    if (!message.member.voice.channel) {
        return message.channel.send("❌ You have to be in a voice channel to skip the song.");
    }
    if (!serverQueue || serverQueue.songs.length == 0){
        return message.channel.send("❌ No songs to skip.");
    }

    console.log(`Skipped ${serverQueue.songs[0].title}.`);
    serverQueue.textChannel.send(`⏩ Skipped \*\*${serverQueue.songs[0].title}\*\* ⏩`);

    serverQueue.player.stop();     //AudioPlayer stop method to skip to next song
    serverQueue.keep = false;
    //play(message.guild,serverQueue.songs[0]);
}


function clear(message, serverQueue){
    if(!message.member.voice.channel){
        return message.channel.send("❌ You have to be in a voice channel to clear the queue.");
    }
    if (!serverQueue || serverQueue.songs.length == 0) {
        return message.channel.send("❌ No queue to clear.");
    }
    //skip(message, serverQueue);
    let currentSong = serverQueue.songs[0];
    serverQueue.songs = [currentSong]; //remove all songs except for currently playing song
    serverQueue.loop = false;
    serverQueue.keep = false;
    //serverQueue.player.stop();  //AudioPlayer stop method
    //serverQueue.loopall = false;

    //queue.delete(message.guild.id);

    console.log(`Cleared queue.`);
    return message.channel.send("Cleared queue. ✅");
    //player.stop();
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
    if (args.length == 1){
        //console.log(`Loop parameter not specified. Loop not executed.`);
        //return message.channel.send(`Specify the loop parameter. (!loop <this/all/off>`);
        serverQueue.loop = true;    //loop the queue
        serverQueue.keep = true;    //and keep the current song 
        console.log(`Looping the queue.`);
        //return message.channel.send('Looping the queue.');
        return message.channel.send('⚡Loop **ACTIVATED**🌩️');
    }

    let check = args[1].toLowerCase();
    switch (check) {
        /*
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
        */
        case 'off':
            if (!serverQueue.loop) {
               return message.channel.send(`❌ There is no loop to disable.`);
            } else {
                serverQueue.loop = false;
                console.log(`Turned off looping.`);
                //return message.channel.send(`No longer looping.`);
                return message.channel.send('📴Loop **DEACTIVATED**😥');
            }
            //break; //not necessary due to return statements
        default:
            //console.log(`Attempt to loop failed.`);
            //message.channel.send(`Specify the loop parameter. (!loop <this/all/off>`);
            return message.channel.send('!loop to loop the queue, !loop off to disable the loop. 🤓')
    }
   
}

function showQueue(serverQueue){
    // if(!message.member.voice.channel){
    //     return message.channel.send("You have to be in a voice channel to view the queue.");
    // }
    // if (!serverQueue || serverQueue.songs.length == 0) {
    //     return message.channel.send("No queue to show.");
    // }
    
    let nowPlaying = serverQueue.songs[0];
    let msg = `Now playing: ${nowPlaying.title}\n----------------------------\n`
    let length = Math.min(serverQueue.songs.length, 11) 
    let duration = nowPlaying.duration;
    for (var i = 1; i < length; i++){
        if (serverQueue.songs[i].seek > 0){
            msg += `${i}. ${serverQueue.songs[i].title} seek: ${serverQueue.songs[i].seekTime.minutes}:${serverQueue.songs[i].seekTime.seconds}\n`
            duration = nowPlaying.duration - nowPlaying.seek;
        } else {
            msg += `${i}. ${serverQueue.songs[i].title}\n`;
        }
    }

    serverQueue.textChannel.send('```' + msg + '```').then(msg => setTimeout(() => msg.delete, duration*1000));
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
    return message.channel.send("Paused song. ⏸️")
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
    return message.channel.send("Resumed song. ▶️")
}

function stop(message, serverQueue) {
    if(!message.member.voice.channel){
        return message.channel.send("❌ You have to be in a voice channel to stop the music.");
    }
    if (!serverQueue || serverQueue.songs.length == 0) {
        return message.channel.send("❌ No music to stop.");
    }
    console.log(`Stopped the bot.`);
    //getVoiceConnection(message.guild.id).disconnect();
    //getVoiceConnection(message.guild.id).destroy();
    //queue.delete(message.guild.id);
    clear(message, serverQueue);
    serverQueue.player.stop();
}

/**
 * Displays the list of commands
 * @param {*} message  
 */
function help(message){
    const commands = `
    !play <query|url> <seek> -- search for a song or type a YouTube URL  
    !pause -- pause the current song
    !resume -- resume the current song 
    !skip -- skips over the current song 
    !stop -- stops the bot from playing  
    !queue -- shows all songs in the queue 
    !clear -- purges all songs in the queue  
    !loop -- repeats all of the songs in the queue (!loop off to disable the loop)\n
    To view these commands again, type !help 
    `
    return message.channel.send('```' + commands + '```')
}

/**
 * Given a number, parses it into the form of mm:ss
 * @param {number} input number to parse
 * @returns {object} object containing the parsed data
 */
function parse(input){
    let minutes = Math.floor(input/60);
    let seconds = input%60 < 10 ? '0' + input%60 : input%60;
    //return [minutes, seconds];
    return {minutes: minutes, seconds: seconds};
}

// function seek(input) {
//     // const args = message.content.split(" ");
//     // if(!message.member.voice.channel){
//     //     return message.channel.send("❌ You have to be in a voice channel to seek.");
//     // }
//     // if (!serverQueue || serverQueue.songs.length == 0) {
//     //     return message.channel.send("❌ No music to seek.");
//     // }
//     let seekInfo = {};
//     const time = input.split(":"); //assuming form of mm:ss
//     if (isNaN(time[0]) || isNaN(time[1])){
//         return -1
//     }
//     const minutes = Number(time[0]*60)
//     const seconds = Number(time[1])
//     const totalTime = minutes+seconds
//     seekInfo = {
//         minute: minutes,
//         second: seconds,
//         duration: totalTime
//     }
//     //console.log(totalTime)
//     return seekInfo;
//     //serverQueue.seek = args[1];
//     //console.log(serverQueue.seek);

//     //serverQueue.player.stop();
//    // play(message.guild, serverQueue.songs[0]);
// }

client.login(token);

