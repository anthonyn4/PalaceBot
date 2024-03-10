const {VoiceConnectionStatus, entersState, getVoiceConnection, joinVoiceChannel, createAudioPlayer, NoSubscriberBehavior} = require('@discordjs/voice');
const {queue} = require('./queue')
const {client} = require('./client')

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

module.exports = {connect};