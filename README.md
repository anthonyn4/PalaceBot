# PALACE BAY
PALACE BAY is a simple, text-based music bot compatible with YouTube and SoundCloud built on [discord.js](https://discord.js.org). This bot is generally self-hosted or ran on a dedicated server such as a Raspberry Pi. The bot runs on [Node.js](https://nodejs.org/en) and uses the [play-dl](https://play-dl.github.io/index.html) library to function.
## Features
The music bot also responds to voice commands as well. Edit your config.json to include your desired keyword to invoke the voice commands. Most commands should be compatible with voice but not all. 
<br><br>
If you choose your keyword to be 'music', for example you would invoke the play command by saying 'music play mood lil uzi' or skip the song with 'music skip'. 
<br><br>
The bot does not record any voice or sound and only responds if you say your desired keyword. You can also opt not to install the speech recognition library/comment out the relevant code if you don't want to use the voice commands.
<br><br>

### Commands
<sub>[] brackets denote optional arguments</sub>
| Commands | Description |
| --- | --- |
| `!help` `!commands` | Lists all commands. |
| `!join` `!connect` | Summons the bot to your current voice channel. (using !play will automatically invoke this) |
| `!play [-sc] [-pl/-al] query`| Searches for the specified query on YouTube. (You can search for playlists `-pl` or albums(SoundCloud only) `-al`  or search on SoundCloud `-sc`) |
| `!play url/mp3` | Plays the requested url or mp3 in your current voice channel. (Supports playlists, radio, attachments, and Discord URLs as well)
| `!skip` `!remove` `!next [keyword/position]` | Skip the current song. (or optionally, specify a keyword or position to remove a song from the queue) |
| `!skipto keyword/position` | Jump to a desired position or song containing the keyword in the queue. |
| `!volume 0-200` | Set the volume of the bot from 0% to 200%.
| `!pause` `!resume` | Pause or resume playing of the bot.|
| `!loop` `!repeat` | Loops the queue. (type !loop or !repeat again to disable the loop) |
| `!replay` `!again` | Replays the last played song. |
| `!queue [n]` | Shows all the songs in the queue. (or optionally, up to n songs) |
| `!clear` | Removes all except the current song from the queue. |
| `!stop` | Removes all of the songs from the queue. | 
| `!shuffle` | Shuffles all the songs in the queue. |
| `!seek mm:ss` | Seek to a desired position in the current song. |
| `!ff mm:ss` | Fast forward a specified amount in the current song. |
| `!lyrics` | Displays lyrics for the current song. |
| `!kick` `!leave` | Removes the bot from your voice channel. |

## Installation
- The bot currently runs on [discord.js v14](https://www.npmjs.com/package/discord.js) and [Node.js v18.12.1](https://nodejs.org/en) and depends on [play-dl](https://play-dl.github.io/index.html) to function.
- You will also need [FFmpeg](https://ffmpeg.org/download.html) and an [audio encryption package](https://www.npmjs.com/package/libsodium-wrappers) to play music through Discord. I recommend following their official guide [here](https://discordjs.guide/voice/#installation).
- For voice commands to work, you will need to install a [speech recognition library](https://discordsr.netlify.app/).
- If you want to view lyrics for your current song, the bot depends on [genius-lyrics-api](https://github.com/farshed/genius-lyrics-api). Make sure to install and get your [Genius API key](https://genius.com/developers).
- In order to complete setting up your bot, follow this [guide](https://discordjs.guide/preparations/setting-up-a-bot-application.html#creating-your-bot) on how to fill out your config.json. 
- Finally, to run your bot, install [Visual Studio Code](https://code.visualstudio.com/) and navigate to your bot's folder. You can run `node .` or `node main.js` in your terminal to activate the bot. The console should print out an initial message indicating the bot has come online.
  
