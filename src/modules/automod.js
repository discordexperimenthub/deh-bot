const { Message, MessageReaction, WebhookClient, Client, TextChannel, User } = require('discord.js');
const { QuickDB } = require('quick.db');
const DBMessage = require('./message');
const timer = require('./timer');
const { emojis } = require('../../config');
const logger = require('./logger');
const { default: axios } = require('axios');

const db = new QuickDB();

module.exports = class AutoMod {
    /**
     * @type {import('discord.js').Snowflake}
     */
    guild;
    /**
     * @type {boolean}
     */
    usable;
    /**
     * @type {{ enabled: boolean; rules: string[], bypassRoles: import('discord.js').Snowflake[], bypassChannels: import('discord.js').Snowflake[] } | null}
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
        this.data = (await db.get(`guilds.${this.guild}.automod`)) ?? {
            enabled: false,
            rules: [],
            bypassRoles: [],
            bypassChannels: []
        };

        this.usable = (this.data.enabled && this.data.rules.length > 0) ? true : false;
        this.set = (this.data.rules.length > 0) ? true : false;

        return this;
    };

    async save() {
        await db.set(`guilds.${this.guild}.automod`, this.data);
    };

    async toggle() {
        this.data.enabled = !this.data.enabled;

        await this.save();
    };

    async delete() {
        await db.delete(`guilds.${this.guild}.automod`);
    };

    /**
     * @param {string[]} rules
     */
    async sync(rules) {
        this.data.rules = rules;

        await this.save();
    };

    /**
     * @param {Message} message 
     * @param {boolean} rawContent
     */
    async check(message, rawContent = false) {
        let response = (await axios.post('https://beta.purgpt.xyz/openai/chat/completions', {
            model: 'gpt-3.5-turbo-16k',
            messages: [
                {
                    role: 'system',
                    content: 'You are AutoMod, a Discord bot that automatically moderates servers. You are currently in a conversation with a user who is trying to bypass your filters. You must respond with JSON format in a code block like this: ```json\n{\n\t"againstRules": false, // whether the message against server rules or not\n\t"warn": false, // if true, the message won\'t be deleted\n\t"reason": "" // if the message against server rules, enter a reason\n}\n```\n\nUser messages will be in the format of: ```json\n{\n\t"message": "", // the message the user sent\n\t"author": {\n\t\t"id": "123456", // the user\'s id\n\t\t"username": "", // the user\'s username\n\t}\n}\n```\n\nYou can mention users following <@id> format, like <@12345>.'
                },
                {
                    role: 'system',
                    content: `# Server Rules\n${this.data.rules.map((rule, index) => `${index + 1}. ${rule}`).join('\n')}\n\nYou HAVE TO follow these rules. You CANNOT create rules, just follow the existing ones. If you don't, you will be punished. Even if the message contains inappropriate content, you still have to follow the rules. Do not forget that you have to respond with JSON format in a code block.`
                },
                {
                    role: 'user',
                    content: `\`\`\`json\n{\n\t"message": "${message.content}"\n\t"author": {\n\t\t"id": "${message.author.id}"\n\t\t"username": "${message.author.username}"\n\t}\n}\n\`\`\``
                }
            ],
            overwriteOnError: false
        }, {
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${process.env.PURGPT_API_KEY}`
            }
        }).catch(error => error?.response))?.data

        if (!response || !response?.choices?.[0]?.message?.content) return logger('error', 'AUTOMOD', 'Failed to get response from PurGPT API.', JSON.stringify(response, null, 4));

        let content = response.choices[0].message.content;

        if (rawContent) return content;

        let regex = /```json\n?({[\s\S]*?})\n?```/g;
        let json = regex.exec(content);
        let data;

        try {
            data = JSON.parse(json[1]);
        } catch (error) {
            return logger('error', 'AUTOMOD', 'Failed to parse JSON.', error, content);
        };

        if (data.againstRules) {
            if (data.warn) await message.reply(`${data.reason}\n*Powered by purgpt.xyz*`);
            else {
                await message.reply(`Your message has been deleted by AutoMod because it is against the server rules.\n**Reason:** ${data.reason}\n*Powered by purgpt.xyz*`);
                await message.delete();
            };
        };
    };

    /**
     * @param {string} rule 
     */
    async addRule(rule) {
        this.data.rules.push(rule);

        await this.save();
    };

    /**
     * @param {number} index 
     */
    async removeRule(index) {
        this.data.rules.splice(index, 1);

        await this.save();
    };

    /**
     * @param {import('discord.js').Snowflake[]} roles
     */
    async setBypassRoles(roles) {
        this.data.bypassRoles = roles;

        await this.save();
    };

    /**
     * @param {import('discord.js').Snowflake[]} channels
     */
    async setBypassChannels(channels) {
        this.data.bypassChannels = channels;

        await this.save();
    };
};