const { QuickDB } = require('quick.db');
const timer = require('./timer');

const db = new QuickDB();

module.exports = class DBMessage {
    /** 
     * @type {import("discord.js").Snowflake}   
     */
    message;
    /** 
     * @type {{ replyCount: number, reactionCount: number, replies: string[], reactions: string[], interacted: import('discord.js').Snowflake[] } | null}
     */
    data;

    /**
     * @param {import("discord.js").Snowflake} messageId 
     */
    constructor(messageId) {
        this.message = messageId;
    };

    async setup() {
        this.data = (await db.get(`messages.${this.message}`)) ?? {
            replyCount: 0,
            reactionCount: 0,
            replies: [],
            reactions: [],
            interacted: []
        };

        if (!this.data.replyCount) this.data.replyCount = 0;
        if (!this.data.reactionCount) this.data.reactionCount = 0;
        if (!this.data.replies) this.data.replies = [];
        if (!this.data.reactions) this.data.reactions = [];
        if (!this.data.interacted) this.data.interacted = [];

        return this;
    };

    async save() {
        if (!(await db.has(`messages.${this.message}`))) timer('custom', {
            time: 43200000,
            callback: async () => {
                await db.delete(`messages.${c.messageId}`);
            },
            config: {
                messageId: this.message
            }
        });

        await db.set(`messages.${this.message}`, this.data);
    };

    addReply(reply) {
        this.data.replyCount++;
        this.data.replies.push(reply);

        this.save();
    };

    addReaction(reaction) {
        this.data.reactionCount++;

        if (!this.data.reactions.includes(reaction)) this.data.reactions.push(reaction);

        this.save();
    };

    addInteraction(userId) {
        if (!this.data.interacted.includes(userId)) this.data.interacted.push(userId);

        this.save();
    };

    async delete() {
        await db.delete(`messages.${this.message}`);
    };
};