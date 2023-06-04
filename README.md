# PALACE BAY
PALACE BAY is a simple music bot compatible with YouTube and SoundCloud built on [discord.js](https://discord.js.org). This bot is generally self-hosted or ran on a dedicated server such as a Raspberry Pi.
## Commands

- `!help` `!commands` = Lists all commands. 
- `!join/connect` = Summons the bot to your current voice channel.
- `!play [-sc] query`= Searches for the specified query on YouTube. (or optionally, on SoundCloud)
- `!play url` = Plays the requested url in your current voice channel. (Supports playlists and radio as well)
- `!skip` `!remove` `!next` = Skip the current song.
- `!skip` `!remove` `!next keyword|position` = Remove a song from the desired position or a song containing the keyword from the queue.
- `!skipto keyword|position` = Jump to a desired position or song containing the keyword in the queue.
- `!volume 0-200` = Set the volume of the bot from 0% to 200%.
- `!pause` `!resume` = Pause or resume playing of the bot.
- `!loop` `!repeat` = Loops the queue. (type !loop or !repeat again to disable the loop)
- `!queue` = Shows the first 15 songs in the queue.
- `!clear` = Removes all except the current song from the queue.
- `!shuffle` = Shuffles all the songs in the queue.
- `!seek mm:ss` = Seek to a desired position in the current song.
- `!stop` `!kick` `!leave` = Removes the bot from your voice channel.

