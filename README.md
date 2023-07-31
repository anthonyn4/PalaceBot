# PALACE BAY
PALACE BAY is a simple music bot compatible with YouTube and SoundCloud built on [discord.js](https://discord.js.org). This bot is generally self-hosted or ran on a dedicated server such as a Raspberry Pi. The bot runs on [Node.js](https://nodejs.org/en) and uses the [play-dl](https://play-dl.github.io/index.html) library to function.
## Features
~~The music bot also responds to voice commands as well. Begin your voice command with 'music' followed by whichever command you want to invoke. Some commands may not be suited for voice commands, but you can try.~~ 
<br>
~~An example would be 'music play mood lil uzi' or 'music next'.~~ 
<br><br>
Works but suffers from a memory leak so it is disabled for the time being. You can enable it at your own discretion by uncommenting https://github.com/anthonyn4/PalaceBot/blob/08ca7107076e9cb8234fdc722ee9f10fb46322b0/main.js#L31 and https://github.com/anthonyn4/PalaceBot/blob/08ca7107076e9cb8234fdc722ee9f10fb46322b0/main.js#L65-L79
### Commands
<sub>[] brackets denote optional arguments</sub>
| Commands | Description |
| --- | --- |
| `!help` `!commands` | Lists all commands. |
| `!play [-sc] [-pl/-al] query`| Searches for the specified query on YouTube. (You can search for playlists `-pl` or albums(SoundCloud only) `-al`  or search on SoundCloud `-sc`) |
| `!play url` | Plays the requested url in your current voice channel. (Supports playlists and radio as well)
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
<!-- | `!join/connect` | Summons the bot to your current voice channel. (using !play will automatically invoke this) | -->

## Installation
- The bot currently runs on [discord.js v14](https://www.npmjs.com/package/discord.js) and [Node.js v18.12.1](https://nodejs.org/en) and depends on [play-dl](https://play-dl.github.io/index.html) to function.
- You will also need [FFmpeg](https://ffmpeg.org/download.html) and an [audio encryption package](https://www.npmjs.com/package/libsodium-wrappers) to play music through Discord. I recommend following their official guide [here](https://discordjs.guide/voice/#installation).
- For voice commands to work, you will need to install a [speech recognition library](https://discordsr.netlify.app/).
- If you want to view lyrics for your current song, the bot depends on [genius-lyrics-api](https://github.com/farshed/genius-lyrics-api). Make sure to install and get your [Genius API key](https://genius.com/developers).
- In order to complete setting up your bot, follow this [guide](https://discordjs.guide/preparations/setting-up-a-bot-application.html#creating-your-bot) on how to fill out your config.json. 
- Finally, to run your bot, install [Visual Studio Code](https://code.visualstudio.com/) and navigate to your bot's folder. You can run `node .` or `node main.js` in your terminal to activate the bot. The console should print out an initial message indicating the bot has come online.
  
