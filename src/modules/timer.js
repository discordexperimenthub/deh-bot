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
    }).catch(error => error?.response ?? error))?.data;

    if (!channel) return logger('error', 'TIMER', 'Error while creating DM channel:', channel);

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
 * @param {{ time: number, callback?: Function, userId?: import("discord.js").Snowflake, message?: MessagePayload, config?: object, channelId?: import("discord.js").Snowflake, messageId?: import("discord.js").Snowflake, id?: string }} settings 
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
        id: settings.id,
        channelId: settings.channelId,
        messageId: settings.messageId
    });
};

setInterval(async () => {
    let now = Date.now();
    let timers = await db.get('timers');

    if (!timers) return;

    for (let i = 0; i < timers.length; i++) {
        if (timers[i].time <= now) {
            let timer = timers.splice(i, 1)[0];

            let c = timer?.config;

            if (timer.callback) {
                try {
                    await eval(`(${timer.callback})()`);
                } catch (error) {
                    logger('error', 'TIMER', 'Error while executing callback:', timer.callback, error);
                };
            }
            if (timer.type === 'sendUserMessage') {
                try {
                    let response = await sendUserMessage(timer.userId, timer.message);

                    logger('debug', 'TIMER', 'Sent user message:', JSON.stringify(response, null, 4));
                } catch (error) {
                    logger('error', 'TIMER', 'Error while sending user message:', error);
                };
            } else if (timer.type === 'deleteMessage') {
                try {
                    let response = await deleteMessage(timer.channelId, timer.messageId);

                    logger('debug', 'TIMER', 'Deleted message:', JSON.stringify(response, null, 4));
                } catch (error) {
                    logger('error', 'TIMER', 'Error while deleting message:', error);
                };
            };

            logger('debug', 'TIMER', `Timer executed:`, timer?.id ?? i);
        };
    };

    await db.set('timers', timers);
}, 1000);