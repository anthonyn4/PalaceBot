const {splitText, parse} = require('./utils')
const { AudioPlayerStatus } = require('@discordjs/voice');

const queue = new Map(); //map of guild ID and its respective queue

function addSong(message, songs){
    const serverQueue = queue.get(message.guild.id);

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
            let durationTime = parse(songs[0].duration)
            console.log(`Added ${songs[0].title} to the queue. {${durationTime.minutes}:${durationTime.seconds}}`);
            return message.channel.send(`\*\*${songs[0].title}\*\* \`${durationTime.minutes}:${durationTime.seconds}\` has been added to the queue. `);
        }
    } 
}

/**
 * Skip a song in the queue.
 * @param {Message} message A Discord message object.
 * @returns 
 */
function skip(message){
    const serverQueue = queue.get(message.guild.id);

    const args = message.content.split(" ");

    if (!serverQueue || serverQueue.songs.length == 0){
        return message.channel.send("❌ No songs to skip.");
    }
    let pos = parseInt(args[1]); //check if position is an integer
    let currentSong = serverQueue.songs[0];
    if (serverQueue.player.state.status == AudioPlayerStatus.Paused) {
        return message.channel.send(`The bot is paused. Resume playing with \`\`!resume\`\` in order to skip \*\*${currentSong.title}\*\*.`)
    }
    if (args.length == 1 || pos == 0){
        serverQueue.keep = false; //don't keep skipped song in the queue
        //console.log(`before skip: ${serverQueue.player.state.status}`)

        if (serverQueue.player.stop()) {
            //console.log(`after skip: ${serverQueue.player.state.status}`)
            console.log(`Skipped ${currentSong.title}.`);
            return message.channel.send(`⏩ Skipped \*\*${currentSong.title}\*\*.`);
                //.then(msg => setTimeout(() => msg.delete(), 30 * 1000)); //delete after 30 seconds
        }     
        return message.channel.send(`❌ Something went wrong skipping \*\*${serverQueue.songs[0].title}\*\*.`)
    }
    //TODO: make into function
    if (isNaN(pos)) { //skip by keyword 
        let request = message.content.substring(message.content.indexOf(' '), message.content.length).trim();
        if (args[1] == 'last' || args[1] == 'end') { //check certain keywords first
            pos = serverQueue.songs.length-1;
        } else if (args[1] == 'all') {
            stop(message);
            return; 
        } else {   //otherwise find a match
            const regex = new RegExp(request, 'i'); //case insensitive regex
            pos = serverQueue.songs.findIndex(function (s) { //find position of a song title including keyword
                return regex.test(s.title); 
            });
        }
        if (pos < 0) { //if regex fails to find a match
            return message.channel.send(`❌ No song in queue with keyword \`${request}\`.`);
        } 
    } else if (pos > serverQueue.songs.length-1 || pos < 0) {  //if position number was out of bounds
        return message.channel.send(`❌ Skip position out of bounds. There are \*\*${serverQueue.songs.length-1}\*\* songs in the queue.`)   //return statement to avoid skipping
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
 * Clears all the songs in the queue.
 * @param {Message} message A Discord message object.
 * @returns {Message} A message to the channel on whether or not the queue has been cleared.
 */
function clear(message){
    const serverQueue = queue.get(message.guild.id);

    if (!serverQueue || serverQueue.songs.length == 0) {
        return message.channel.send("❌ No queue to clear.");
    }

    //let currentSong = serverQueue.songs[0];
    //serverQueue.songs = [currentSong]; //remove all songs except for currently playing song
    serverQueue.loop = false;
    serverQueue.keep = false;
    serverQueue.autoplay = false;
    serverQueue.songs = [];     //empty the queue
    serverQueue.player.stop();  //then skip current song by invoking AudioPlayer stop method

    console.log(`Cleared queue.`);
    return message.channel.send("🧹 Cleared queue. ");
}

/**
 * Functionally the same as clear(), except it skips the currently playing song (if any)
 * @param {Message} message A Discord message object.
 * @returns 
 */
// function stop(message) {   
//     const serverQueue = queue.get(message.guild.id);

//     if (!serverQueue || serverQueue.songs.length == 0) {
//         return message.channel.send("❌ No music to stop.");
//     }
//     //console.log(`Stopped the bot.`);
//     clear(message);
//     serverQueue.songs = []; //remove all songs 
//     serverQueue.player.stop();
// }

/**
 * Loops the queue.
 * @param {Message} message A Discord message object.
 * @returns {Message} A message that indicates the state of the loop.
 */
function loopSong(message){
    const serverQueue = queue.get(message.guild.id);

    const args = message.content.split(" ");

    if (!serverQueue || serverQueue.songs.length == 0) {
        return message.channel.send("❌ No song to loop.");
    }
    if (args.length > 1) {
        if (args.includes('off')) {
            serverQueue.loop = false;
            console.log(`Turned off looping.`);
            return message.channel.send('📴Loop **DEACTIVATED**😥');
        } 
        if (args.includes('on')) {
            serverQueue.loop = true;
            console.log(`Turned on looping.`);
            return message.channel.send('⚡ Loop **ACTIVATED** 🌩️');
        }
    }
    //if only !loop is checkd with no parameter
    //if (args.length == 1){
        //console.log(`Loop parameter not specified. Loop not executed.`);
        //return message.channel.send(`Specify the loop parameter. (!loop <this/all/off>`);
        serverQueue.loop = !serverQueue.loop;    //loop the queue
       // serverQueue.keep = !serverQueue.keep;    //and keep the current song 
        if (serverQueue.loop){
            console.log(`Enabled the loop.`);
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
 * Shuffles the queue of songs.
 * @param {Message} message  A Discord message object.
 * @returns 
 */
function shuffle(message) {
    const serverQueue = queue.get(message.guild.id);

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

module.exports = {
    queue, addSong, skip, skipto, clear, loopSong, showQueue, shuffle
};
