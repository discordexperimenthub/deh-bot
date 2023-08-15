const { Message, MessageReaction, WebhookClient, Client, TextChannel, User } = require('discord.js');
const { QuickDB } = require('quick.db');
const DBMessage = require('./message');
const cron = require('./cron');
const { emojis } = require('../../config');

const db = new QuickDB();

module.exports = class Home {
    /**
     * @type {import('discord.js').Snowflake}
     */
    guild;
    /**
     * @type {boolean}
     */
    usable;
    /**
     * @type {{ channel: import('discord.js').Snowflake, webhook: string, enabled: boolean, messages: import('discord.js').Snowflake[], minInteractions: number } | null}
     */
    data;
    /**
     * @type {boolean}
     */
    set;

    /**
     * @param {import('discord.js').Snowflake} guildId 
     */
    constructor(guildId) {
        this.guild = guildId;
        this.usable = false;
    };

    async setup() {
        this.data = (await db.get(`guilds.${this.guild}.home`)) ?? {
            channel: null,
            webhook: null,
            enabled: false,
            messages: [],
            minInteractions: 5
        };

        if (!this.data.messages) this.data.messages = [];
        if (!this.data.minInteractions) this.data.minInteractions = 5;

        this.usable = (this.data.enabled && this.data.channel && this.data.webhook) ? true : false;
        this.set = (this.data.channel && this.data.webhook) ? true : false;

        return this;
    };

    async save() {
        await db.set(`guilds.${this.guild}.home`, this.data);
    };

    async setChannel(channelId) {
        this.data.channel = channelId;

        await this.save();
    };

    async setWebhook(webhook) {
        this.data.webhook = webhook;

        await this.save();
    };

    async toggle() {
        this.data.enabled = !this.data.enabled;

        await this.save();
    };

    async setMinInteractions(count) {
        this.data.minInteractions = count;

        await this.save();
    };

    /**
     * @param {boolean} featured
     * @param {TextChannel} channel
     * @param {DBMessage} message 
     * @param {number} time
     */
    async send(featured, channel, message, time = 43200000 * 2) {
        if (this.data.messages.includes(message.message)) return;

        const webhook = new WebhookClient({
            url: this.data.webhook
        });
        const homeMessage = await channel.messages.fetch(message.message);

        let messageLink = `<https://canary.discord.com/channels/${channel.guildId}/${channel.id}/${message.message}>`;
        let m = `${emojis.featuredMessage} ${featured ? `**[Featured Post](${messageLink})**` : `**[Original Message](${messageLink})**`}\n${homeMessage.content}\n${message.data.replies.slice(0, 3).map((reply, index) => `${(message.data.replies.length - 1) > index ? emojis.replyContinuing : emojis.reply} **<@${reply.author}>:** ${reply.content}`).join('\n')}`;

        const post = await webhook.send({
            avatarURL: homeMessage.author.displayAvatarURL({ forceStatic: true }),
            username: homeMessage.member?.displayName || homeMessage.author?.displayName,
            content: m.length > 2000 ? `${m.slice(0, 2000 - 3)}...` : m,
            embeds: homeMessage.embeds,
            files: homeMessage.attachments.map(a => a.url),
            allowedMentions: {
                parse: []
            }
        });
        const postMessage = await channel.client.channels.cache.get(this.data.channel).messages.fetch(post.id);

        for (let reaction of message.data.reactions) {
            postMessage.react(reaction).catch(() => { });

            await new Promise(resolve => setTimeout(resolve, 1000));
        };

        await message.delete();

        this.data.messages.push(message.message);

        await this.save();

        cron(time, async () => {
            this.data.messages = this.data.messages.filter(m => m !== message.message);

            await this.save();
            await postMessage.delete();
        });
    };

    /**
     * @param {'reply' | 'reaction'} event 
     * @returns 
     */
    async check(event, ...args) {
        if (!this.usable) return;

        /**
         * @type {DBMessage}
         */
        let msg;
        let channel;

        switch (event) {
            case 'reply':
                /**
                 * @type {[Message]}
                 */
                let [message] = args;

                msg = await new DBMessage(message.reference.messageId).setup();
                channel = message.channel;

                msg.addReply({
                    author: message.author.id,
                    content: message.content
                });
                msg.addInteraction(message.author.id);
                break;
            case 'reaction':
                /**
                 * @type {[MessageReaction, User]}
                 */
                let [reaction, user] = args;

                msg = await new DBMessage(reaction.message.id).setup();
                channel = reaction.message.channel;

                msg.addReaction(reaction.emoji.id ?? reaction.emoji.name);
                msg.addInteraction(user.id);
                break;
        };

        if (msg.data.interacted.length >= this.data.minInteractions) this.send(false, channel, msg);
    };

    async delete() {
        await db.delete(`guilds.${this.guild}.home`);
    };
};