const playDL = require('play-dl');
const {parse} = require('./utils')
const {connect} = require('./connect')
const {queue} = require('./queue')
const {play} = require('./song')
/**
 * Processes user input to either search for a song or process a URL.
 * @param {Message} message A Discord message object.
 * @param {Object} serverQueue Contains information related to a Discord server's queue.
 * @returns {Message} A message to the channel based on the user input.
 */
async function validateRequest(message) { 
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

// function validateMp3Url(message, serverQueue) {
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

module.exports ={
    validateRequest
};
