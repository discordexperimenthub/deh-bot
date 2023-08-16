const { default: axios } = require("axios");
const { MessagePayload } = require("discord.js");
const { QuickDB } = require("quick.db");
const logger = require("./logger");

const db = new QuickDB();

async function sendUserMessage(userId, message) {
    let channel = (await axios.post(`https://canary.discord.com/api/v10/users/@me/channels`, {
        recipient_id: userId
    }, {
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bot ${process.env.DISCORD_TOKEN}`
        }
    }).catch(error => logger('error', 'TIMER', 'Error while creating DM channel:', error.response.data)))?.data;

    if (!channel) return;

    return (await axios.post(`https://canary.discord.com/api/v10/channels/${channel.id}/messages`, message, {
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bot ${process.env.DISCORD_TOKEN}`
        }
    }).catch(error => error.response)).data;
};

async function deleteMessage(channelId, messageId) {
    return (await axios.delete(`https://canary.discord.com/api/v10/channels/${channelId}/messages/${messageId}`, {
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bot ${process.env.DISCORD_TOKEN}`
        }
    }).catch(error => error.response)).data;
};

/**
 * **Required**
 * - `time` - Time in milliseconds
 * - `callback` - Function to execute
 * 
 * **Required for `sendUserMessage`**
 * - `userId` - Channel/User id to send message to
 * - `message` - Message to send
 * 
 * **Required for `deleteMessage`**
 * - `channelId` - Channel id to delete message from
 * - `messageId` - Message id to delete
 * @param {'custom' | 'sendUserMessage' | 'deleteMessage'} type 
 * @param {{ time: number, callback?: Function, userId?: import("discord.js").Snowflake, message?: MessagePayload, config?: object, channelId?: import("discord.js").Snowflake, messageId?: import("discord.js").Snowflake }} settings 
 */
module.exports = async (type, settings) => {
    let now = Date.now();

    if (!(await db.has('timers'))) await db.set('timers', []);

    await db.push('timers', {
        time: now + settings.time,
        callback: settings.callback ? settings.callback.toString() : undefined,
        type,
        userId: settings.userId,
        message: settings.message,
        config: settings.config,
    });
};

setInterval(async () => {
    let now = Date.now();
    let timers = await db.get('timers');

    if (!timers) return;

    for (let i = 0; i < timers.length; i++) {
        if (timers[i].time <= now) {
            let c = timers[i].config;

            if (timers[i].callback) {
                let response = eval(`(${timers[i].callback})()`);

                logger('debug', 'TIMER', 'Executed custom timer callback:', timers[i].callback, 'Response:', JSON.stringify(response))
            }
            if (timers[i].type === 'sendUserMessage') {
                logger('debug', 'TIMER', 'Sending message to', timers[i].userId, 'with content:', timers[i].message.content);

                let response = await sendUserMessage(timers[i].userId, timers[i].message);

                logger('debug', 'TIMER', 'Message sent to', timers[i].userId, 'with content:', timers[i].message.content, 'Response:', JSON.stringify(response, null, 4));
            } else if (timers[i].type === 'deleteMessage') {
                logger('debug', 'TIMER', 'Deleting message', timers[i].messageId, 'from channel', timers[i].channelId);

                let response = await deleteMessage(timers[i].channelId, timers[i].messageId);

                logger('debug', 'TIMER', 'Message deleted', timers[i].messageId, 'from channel', timers[i].channelId, 'Response:', JSON.stringify(response, null, 4));
            };

            timers.splice(i, 1);
        };
    };

    await db.set('timers', timers);
}, 1000);