/*
    Features to add:
    !skip {n} skips max({n}, queue.length) songs in the queue 
    Remove individual songs from queue ✅
    Autoplay related songs
    Seek to a given time ✅
    YouTube playlist support ✅
    YouTube radio support 
*/

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

client.once('ready', () =>{
    console.log("PALACE BAY is online!");
});
client.once('reconnect', () =>{
    console.log("PALACE BAY is reconnecting...");
});
client.on('disconnect', () =>{
    console.log("PALACE BAY has disconnected.");
});

//Attempt to fix force disconnect by user breaking the bot
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
        return; //don't respond to self-messages
    }
    if (!message.content.startsWith(prefix)) return;
    
    const serverQueue = queue.get(message.guild.id);
    
    const args = message.content.slice(prefix.length).split(' ');
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
        case 'q':
        case 'queue':
            showQueue(message,serverQueue);
            break;
        case 'clear':
            clear(message, serverQueue);
            break;
        case 'stop':    
            stop(message,serverQueue);
            break;
        case 'shuffle':
            shuffle(message,serverQueue);
            break;
        case 'seek':
            seek(message,serverQueue);
            break;
        case 'help':
        case 'commands':
        default:
           // message.channel.send("You need to enter a valid command!");
            help(message);
            break;
    }
    
});


async function execute(message, serverQueue) {
    const args = message.content.split(" ");
    const voiceChannel = message.member.voice.channel;

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
    
    //check the last argument to see if it is a valid time to seek to
    let timeToSeek = parse(args[args.length-1]);

    let song = {};
    let songs = [];
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
                console.log(`Fetched ${so.total_tracks} tracks from the playlist`)
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
        let maxDuration = song.duration;
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
            keep: false, //whether or not the current song should be kept in the queue
            timeoutID: undefined    //separate timeout ID for each guild
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
        //console.log(serverQueue.songs.length);
        if (serverQueue.songs.length == 0) {    //check if queue is empty prior to adding songs
            serverQueue.songs = serverQueue.songs.concat(songs);    //append the new songs to the end of the queue  
            play(message.guild, serverQueue.songs[0]);
        } else {
            serverQueue.songs = serverQueue.songs.concat(songs);    //append the new songs to the end of the queue
            if (songs.length > 1) {
                //return message.channel.send(`Added \*\*${songs.length}\*\* songs to the queue.`);
            } else {
                if (song.seek > 0){
                    console.log(`Added ${song.title} {${song.durationTime.minutes}:${song.durationTime.seconds}} to the queue seeking to ${song.seekTime.minutes}:${song.seekTime.seconds}`);
                    return message.channel.send(`\*\*${song.title}\*\* \`${song.durationTime.minutes}:${song.durationTime.seconds}\` has been added to the queue seeking to \`${song.seekTime.minutes}:${song.seekTime.seconds}\`. `);
                } else {
                    console.log(`Added ${song.title} to the queue. {${song.durationTime.minutes}:${song.durationTime.seconds}}`);
                    return message.channel.send(`\*\*${song.title}\*\* \`${song.durationTime.minutes}:${song.durationTime.seconds}\` has been added to the queue. `);
                }
            }
            //showQueue(serverQueue);
        }
    }
    //setTimeout(() => {message.delete(), 30*1000}); //delete user message after 30 seconds
}


async function play(guild, song){
    const serverQueue = queue.get(guild.id);

    //if no song to be played, idle for 300 seconds (5 min) before destroying connection
    if (!song) {
        serverQueue.timeoutID = setTimeout(() => {
            console.log(`Timeout ${serverQueue.timeoutID}.`);
            //serverQueue.connection.disconnect();
            getVoiceConnection(guild.id).destroy();
            queue.delete(guild.id);
            serverQueue.timeoutID = undefined;  //after timeout goes off, reset timeout value.
        }, 300 * 1000);
        console.log(`Timeout ${serverQueue.timeoutID} set.`);
        if (serverQueue.loop == true){
            serverQueue.loop = false;   //if there is no song to be played, disable the loop, no point looping an empty queue
            console.log('Disabled the loop.');
        }
        return;
    }
    
    //if song is queued during timeout, clear timeout
    if (serverQueue.timeoutID != undefined){    
        console.log(`Timeout ${serverQueue.timeoutID} cleared.`);
        clearTimeout(serverQueue.timeoutID);
        serverQueue.timeoutID = undefined;
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

    console.log(`Playing ${song.title} {${song.durationTime.minutes}:${song.durationTime.seconds}}`); //starting at {${song.seekTime.minutes}:${song.seekTime.seconds}}`);
    if (serverQueue.loop == true) {
        // don't print anything
    } else {
        if (song.seek > 0){
            serverQueue.textChannel.send(`🎶 Now playing \*\*${song.title}\*\* \`${song.durationTime.minutes}:${song.durationTime.seconds}\` starting at \`${song.seekTime.minutes}:${song.seekTime.seconds}\` 🎵`);
                //.then(msg => setTimeout(() => msg.delete(), (song.duration-song.seek)*1000));
        } else {
            serverQueue.textChannel.send(`🎶 Now playing \*\*${song.title}\*\* \`${song.durationTime.minutes}:${song.durationTime.seconds}\` 🎵`);
                //.then(msg => setTimeout(() => msg.delete(), song.duration*1000));
        }
        //showQueue(serverQueue);
    }
}

function skip(message, serverQueue){
    const args = message.content.split(" ");

    if (!message.member.voice.channel) {
        return message.channel.send("❌ You have to be in a voice channel to skip the song.");
    }
    if (!serverQueue || serverQueue.songs.length == 0){
        return message.channel.send("❌ No songs to skip.");
    }
    if (args.length == 2) {
        let pos = parseInt(args[1]);
        if (pos > serverQueue.songs.length-1) {
            return message.channel.send(`❌ Skip position out of bounds. There are \`${serverQueue.songs.length-1}\` songs in the queue.`)   //return statement to avoid skipping
        } else if (isNaN(pos)) {
            return;
        } else {
            console.log(`Removed ${serverQueue.songs[pos].title} from the queue.`);
            serverQueue.textChannel.send(`Removed \`${serverQueue.songs[pos].title}\` from the queue.`);//.then(msg => setTimeout(() => msg.delete(), 30*1000));    
            if (pos == 0){  //removing the current playing song results in a skip
                serverQueue.player.stop();
            } else {    //otherwise just delete the song from the queue
                serverQueue.songs.splice(pos,1);    
            }
        }
    } else if (args.length == 1){
        serverQueue.player.stop();     //AudioPlayer stop method to skip to next song
        console.log(`Skipped ${serverQueue.songs[0].title}.`);
        return message.channel.send(`⏩ Skipped \*\*${serverQueue.songs[0].title}\*\*.`);
            //.then(msg => setTimeout(() => msg.delete(), 30 * 1000)); //delete after 30 seconds
    } else {
        help(message);
    }
    serverQueue.keep = false; //don't keep skipped song in the queue
 
    //play(message.guild,serverQueue.songs[0]);
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
    if (args.length == 1){
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
               return message.channel.send(`❌ The loop is already off.`);
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

function showQueue(message,serverQueue){
    if(!message.member.voice.channel){
        return message.channel.send("You have to be in a voice channel to view the queue.");
    }
    if (!serverQueue || serverQueue.songs.length == 0) {
        return message.channel.send('```' + `No song currently playing\n----------------------------\n` + '```').then(msg => setTimeout(() => msg.delete(), 15*1000));
    }
    
    let nowPlaying = serverQueue.songs[0];
    let msg = `Now playing: ${nowPlaying.title}\n----------------------------\n`
    let length = Math.min(serverQueue.songs.length, 11) 
    let duration = nowPlaying.duration;
    for (var i = 1; i < length; i++){
        if (serverQueue.songs[i].seek > 0){
            msg += `${i}. ${serverQueue.songs[i].title} starting at ${serverQueue.songs[i].seekTime.minutes}:${serverQueue.songs[i].seekTime.seconds}\n`
            duration = nowPlaying.duration - nowPlaying.seek;
        } else {
            msg += `${i}. ${serverQueue.songs[i].title}\n`;
        }
    }

    return message.channel.send('```' + msg + '```').then(msg => setTimeout(() => msg.delete(), duration*1000));
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
    return message.channel.send("⏸️ Paused song.")
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
 * Displays the list of commands
 * @param {*} message  
 */
function help(message){
    const commands = `
    !play <query|url> <seek> -- search for a song or enter a YouTube URL  
    !pause -- pause the current song
    !resume -- resume the current song 
    !skip <n> -- skips the current song or remove a song from the queue
    !stop -- stops the bot from playing  
    !queue -- shows all songs in the queue 
    !clear -- purges all songs in the queue  
    !loop -- repeats all of the songs in the queue (!loop off to disable the loop)
    !seek <mm:ss> -- seek to a desired time in the current playing song\n
    To view these commands again, type !help or !commands
    `
    message.channel.send('```' + commands + '```').then(msg => setTimeout(() => msg.delete(), 30*1000));
}

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
 * Given a number, parses it into the form of mm:ss
 * @param {number} input number to parse
 * @returns {object} object containing the parsed data
 */
function parse(input){ 
    //console.log(input);
    if (typeof input == "string" && input.indexOf(":") != -1) { //input in form of mm:ss
        let time = input.split(":"); 
        if (isNaN(time[0]) || isNaN(time[1]) || time[0] < 0 || time[1] < 0){
            //do nothing, move on
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


function seek(message,serverQueue) {
    const args = message.content.split(" ");
    if(!message.member.voice.channel){
        return message.channel.send("❌ You have to be in a voice channel to seek.");
    }
    if (!serverQueue || serverQueue.songs.length == 0) {
        return message.channel.send("❌ No song to seek.");
    }
    if(serverQueue.songs[0].source != 'yt'){ 
        return message.channel.send("❌ Song must be from YouTube to seek!");
    }
    let timeToSeek = parse(args[1]);
    let seekTime = parse(timeToSeek);
    //console.log(timeToSeek);
    //console.log(seekTime);
    let maxDuration = serverQueue.songs[0].duration;
    if (timeToSeek > maxDuration){ 
        //console.log(maxDuration)
        let maxTime = parse(maxDuration);
        console.log(`Seek exceeded song limits, requested ${timeToSeek}, max is ${maxDuration}`);
        return message.channel.send(`❌ Seeking beyond limits. <0-${maxTime.minutes}:${maxTime.seconds}>`);
    }
    let currentSong = serverQueue.songs[0];
    currentSong.seek = timeToSeek;
    currentSong.seekTime = seekTime;
    serverQueue.songs.unshift(currentSong);
    serverQueue.player.stop();
}

client.login(token);

