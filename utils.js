module.exports = {splitText, parse};
const {verifyString} = require('discord.js');

//add splitting at specified character
// function splitText(text) {
//     const maxLength = 1999;
//     const numberOfStrings = text.length / maxLength;
//     if (text.length < maxLength) {
//         return [text];
//     }

//     let strings = [];
//     for (let i = 0; i<numberOfStrings;i++){
//         strings.push(text.substring(maxLength*i, maxLength*(i+1)));
//     }
//     // console.log(strings);
//     return strings;
// }

//Discord's now deprecated splitMessage function (default maxLength is 2000)
function splitText(text, { maxLength = 1990, char = '\n', prepend = '', append = '' } = {}) {
    text = verifyString(text);
    if (text.length <= maxLength) return [text];
    let splitText = [text];
    if (Array.isArray(char)) {
      while (char.length > 0 && splitText.some(elem => elem.length > maxLength)) {
        const currentChar = char.shift();
        if (currentChar instanceof RegExp) {
          splitText = splitText.flatMap(chunk => chunk.match(currentChar));
        } else {
          splitText = splitText.flatMap(chunk => chunk.split(currentChar));
        }
      }
    } else {
      splitText = text.split(char);
    }
    //if (splitText.some(elem => elem.length > maxLength)) throw new RangeError('SPLIT_MAX_LEN');
    const messages = [];
    let msg = '';
    for (const chunk of splitText) {
      if (msg && (msg + char + chunk + append).length > maxLength) {
        messages.push(msg + append);
        msg = prepend;
      }
      msg += (msg && msg !== prepend ? char : '') + chunk;
    }
    return messages.concat(msg).filter(m => m);
}

/**
 * Converts mm:ss to seconds and seconds to mm:ss.
 * @param {number} input number to parse.
 * @returns {Object|number} Object containing minutes and seconds or number in seconds
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
