const {createAudioResource, AudioPlayerStatus} = require('@discordjs/voice');
const {queue} = require('./queue')
const playDL = require('play-dl');

/**
 * Plays a song.
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
 * Change the volume of the song.
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

module.exports = {
    play, pause, resume, replay, forward, volume
};
