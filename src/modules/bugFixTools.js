const { QuickDB } = require('quick.db');

const db = new QuickDB();

module.exports = class BugFixTools {
    /**
     * @type {import('discord.js').Snowflake}
     */
    guild;
    data;

    /**
     * @param {import('discord.js').Snowflake} guildId 
     */
    constructor(guildId) {
        this.guild = guildId;
    };

    async setup() {
        this.data = (await db.get(`guilds.${this.guild}.bugFixTools`)) ?? {
            doubleJoinMessages: false,
            lastJoin: null
        };

        if (!this.data.doubleJoinMessages) this.data.doubleJoinMessages = false;
        if (!this.data.lastJoin) this.data.lastJoin = null;

        return this;
    };

    async save() {
        await db.set(`guilds.${this.guild}.bugFixTools`, this.data);
    };

    async toggle(feature) {
        this.data[feature] = !this.data[feature];

        await this.save();
    };

    /**
     * @param {import('discord.js').Snowflake} userId
     */
    async setLastJoin(userId) {
        this.data.lastJoin = userId;

        await this.save();
    };
};