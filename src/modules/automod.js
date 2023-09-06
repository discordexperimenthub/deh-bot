const { Message, MessageReaction, WebhookClient, Client, TextChannel, User, Guild } = require('discord.js');
const { QuickDB } = require('quick.db');
const DBMessage = require('./message');
const timer = require('./timer');
const { emojis, automodTrainData } = require('../../config');
const logger = require('./logger');
const { default: axios } = require('axios');
const EmbedMaker = require('./embed');
const { localize } = require('./localization');

const db = new QuickDB();

module.exports = class AutoMod {
    /**
     * @type {import('discord.js').Snowflake}
     */
    guildId;
    /**
     * @type {boolean}
     */
    usable;
    /**
     * @type {boolean}
     */
    set;

    /**
     * @param {import('discord.js').Snowflake} guildId 
     */
    constructor(guildId) {
        this.guildId = guildId;
    };

    async setup() {
        this.data = (await db.get(`guilds.${this.guildId}.automod`)) ?? {
            purgptKey: null,
            ai: {
                enabled: false,
                rules: [],
                roleBlacklist: [],
                channelBlacklist: [],
                model: {
                    name: 'gpt-3.5-turbo-16k',
                    owner: 'OpenAI'
                },
                allowFallbacks: true,
                alertChannel: null
            },
            badContent: {
                enabled: false,
                roleBlacklist: [],
                channelBlacklist: [],
                model: {
                    name: 'text-moderation-stable',
                    owner: 'OpenAI'
                },
                filters: 'all',
                alertChannel: null
            }
        };

        return this;
    };

    async save() {
        await db.set(`guilds.${this.guildId}.automod`, this.data);
    };

    /**
     * @param {'ai' | 'badContent'} category 
     */
    async toggle(category) {
        this.data[category].enabled = !this.data[category].enabled;

        await this.save();
    };

    async delete() {
        await db.delete(`guilds.${this.guildId}.automod`);
    };

    /**
     * @param {string[]} rules
     */
    async syncAIRules(rules) {
        this.data.ai.rules = rules;

        await this.save();
    };

    /**
     * @param {Message} message 
     * @param {boolean} rawContent
     */
    async ai(message, rawContent = false) {
        //logger('debug', 'AUTOMOD', 'AI received a message:', message.content)

        let sendData = `{\n\t"messageContent": "${message.content}",\n\t"channel": "${message.channel.name}",\n\t"author": {\n\t\t"id": "${message.author.id}",\n\t\t"username": "${message.author.username}"\n\t}\n}`
        let response = (await axios.post(`https://beta.purgpt.xyz/${this.data.ai.model.owner}/chat/completions`, {
            model: this.data.ai.model.name,
            fallbacks: this.data.ai.allowFallbacks ? ['gpt-3.5-turbo-16k'] : null,
            overwriteOnError: this.data.ai.allowFallbacks ? true : false,
            messages: [
                {
                    role: 'system',
                    content: 'You are AutoMod, a Discord bot that automatically moderates messages. You are currently in a conversation with multiple users. You must respond with JSON format in a code block like this: ```json\n{\n\t"deleteMessage": false, // whether the message should be deleted or not\n\t"warnMessage": true, // whether a warning should be sent or not\n\t"rule": 1, // the againsted rule index\n\t"reason": "" // if the message against server rules, enter a reason\n}\n```\n\nUser messages will be in the format of: ```json\n{\n\t"messageContent": "", // the message the user sent\n\t"channel": "channel-name", // where the message sent\n\t"author": {\n\t\t"id": "123456", // the user\'s id\n\t\t"username": "", // the user\'s username\n\t}\n}\n```\n\nIf the message is not against server rules, you can respond with this:\n```json\n{\n\t"deleteMessage": false,\n\t"warnMessage": false\n}\n```'
                },
                {
                    role: 'system',
                    content: `# Here are some examples for you:\n${JSON.stringify(automodTrainData, null, 4)}`
                },
                {
                    role: 'system',
                    content: `# Server Rules\n${this.data.ai.rules.map((rule, index) => `${index + 1}. ${rule}`).join('\n')}\n\nYOU HAVE TO FOLLOW THESE RULES, NOTHING ELSE. Don't act like a dumb moderator. People may send negative messages, this is not bad. Don't warn everything, let people speak but follow the rules at the same time. Also don't block emojis. For example if the message contains inappropriate language, but the rules doesn't say inappropriate language is not allowed, you can't warn this user. Role and user mentions are different things. Role mentions are in "<@&12345>" format and user mentions are "<@12345>". You can't warn/delete any message because of an user mention. Only role mentions if included in the rules. Do not forget that you have to respond with JSON format in a code block.`
                },
                {
                    role: 'user',
                    content: `\`\`\`json\n${sendData}\n\`\`\`\n\nDo not forget, you have to be fair. Do not warn/delete everything. If you do, you will be punished.`
                }
            ],
            overwriteOnError: this.data.ai.allowFallbacks ? true : false
        }, {
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${this.data.purgptKey ?? process.env.PURGPT_API_KEY}`
            }
        }).catch(error => error?.response))?.data

        if (!response || !response?.choices?.[0]?.message?.content) return logger('error', 'AUTOMOD', 'Failed to get response from PurGPT API.', JSON.stringify(response?.error?.message ? { message: response?.error?.message } : response, null, 4));

        let content = response.choices[0].message.content;

        if (rawContent) return content;

        let regex = /```json\n?({[\s\S]*?})\n?```/g;
        let json = regex.exec(content);
        let data;

        try {
            data = JSON.parse(json[1]);
        } catch (error) {
            return logger('error', 'AUTOMOD', 'Failed to parse JSON:', error, content);
        };

        if (data.deleteMessage || data.warnMessage) {
            if (!this.data.ai.rules[data.rule - 1]) return logger('error', 'AUTOMOD', 'Failed to get rule:', data.rule, this.data.ai.rules);
            if (!data.reason) return logger('error', 'AUTOMOD', 'Failed to get reason:', JSON.stringify(data, null, 4));

            logger('debug', 'AUTOMOD', 'AutoMod blocked a message:', this.data.ai.rules[data.rule - 1], sendData, JSON.stringify(data, null, 4));

            if (data.deleteMessage) {
                await message.reply({
                    content: `Your message has been deleted by AutoMod because it is against the server rules.\n**Reason:** ${data.reason}\n*Powered by purgpt.xyz (if you think this is a mistake, please report this issue in our Discord server)*`,
                    allowedMentions: {
                        repliedUser: true,
                        roles: []
                    }
                });
                await message.delete();
            } else await message.reply({
                content: `${data.reason}\n*Powered by purgpt.xyz (if you think this is a mistake, please report this issue in our Discord server)*`,
                allowedMentions: {
                    repliedUser: true,
                    roles: []
                }
            });

            if (this.data.ai.alertChannel) {
                let channel = await message.guild.channels.fetch(this.data.ai.alertChannel).catch(() => null);

                if (!channel) {
                    this.setAIAlertChannel(null);

                    return logger('error', 'AUTOMOD', 'Failed to fetch alert channel:', data.ai.alertChannel);
                };

                await channel.send({
                    content: `**AutoMod** has ${data.deleteMessage ? 'blocked' : 'warned'} a message from <@${message.author.id}> in <#${message.channel.id}>`,
                    embeds: [
                        new EmbedMaker(message.client)
                            .setAuthor({
                                name: message.member ? message.member.displayName : message.author.displayName,
                                iconURL: message.member ? message.member.displayAvatarURL({ forceStatic: true }) : message.author.displayAvatarURL({ forceStatic: true })
                            })
                            .setTitle('Message Content')
                            .setDescription(message.content)
                            .setFields(
                                {
                                    name: 'Reason',
                                    value: data.reason,
                                    inline: false
                                },
                                {
                                    name: 'Rule',
                                    value: this.data.ai.rules[data.rule - 1],
                                    inline: false
                                },
                                ...(data.deleteMessage ? [] : [{
                                    name: 'Message',
                                    value: `[Jump to message](https://discord.com/channels/${message.guild.id}/${message.channel.id}/${message.id})`
                                }]),
                                {
                                    name: 'Warning',
                                    value: 'AutoMod is an **experimental** feature. If you think this is a mistake, please report this issue in [our Discord server](https://discord.gg/experiments).'
                                }
                            )
                    ]
                });

                return true;
            };
        } else if (rawContent) return content;

        return false;
    };

    /**
     * @param {Message} message 
     * @param {boolean} rawContent
     */
    async badContent(message, rawContent = false) {
        //emoji only message regex (should match unicode and discord emojis like 😀 or :smile:)
        let emojiRegex = /^((<a?:\w+:\d+>)|([\u{1F000}-\u{1FFFF}]))+$/u;

        if (emojiRegex.test(message.content)) return false;

        let response;

        try {
            response = await axios.post('https://beta.purgpt.xyz/openai/moderations', {
                model: this.data.badContent.model.name,
                input: message.content
            }, {
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${this.data.purgptKey ?? process.env.PURGPT_API_KEY}`
                }
            });
        } catch (error) {
            return logger('error', 'AUTOMOD', 'Failed to get response from PurGPT API.', error);
        };

        if (!response || response.status !== 200) return logger('error', 'AUTOMOD', 'Failed to get response from PurGPT API.', JSON.stringify(response?.data?.error?.message ? { message: response?.data?.error?.message } : response, null, 4));

        let filters = this.data.badContent.filters;
        let categories = response.data.results[0].categories;
        let triggered = false;
        let triggers = [];

        for (let category in categories) {
            if (categories[category]) {
                if (filters === 'all') {
                    triggered = true;

                    triggers.push(category);
                } else if (filters.includes(category)) {
                    triggered = true;

                    triggers.push(category);
                }
            };
        };

        if (rawContent) return JSON.stringify(categories, null, 4);
        if (triggered) {
            logger('debug', 'AUTOMOD', 'AutoMod blocked a message:', triggers, message.content);

            await message.reply(`Your message has been deleted by AutoMod because it is against the server rules.\n**Reason:** ${triggers.map(trigger => localize('en-US', trigger.toUpperCase().replaceAll('-', '_').replaceAll('/', '_'))).join(', ')}\n*Powered by purgpt.xyz*`);
            await message.delete();

            if (this.data.badContent.alertChannel) {
                let channel = await message.guild.channels.fetch(this.data.badContent.alertChannel).catch(() => null);

                if (!channel) {
                    this.setBadContentAlertChannel(null);

                    return logger('error', 'AUTOMOD', 'Failed to fetch alert channel:', this.data.ai.alertChannel);
                };

                await channel.send({
                    content: `**AutoMod** has blocked a message from <@${message.author.id}> in <#${message.channel.id}>`,
                    embeds: [
                        new EmbedMaker(message.client)
                            .setAuthor({
                                name: message.member ? message.member.displayName : message.author.displayName,
                                iconURL: message.member ? message.member.displayAvatarURL({ forceStatic: true }) : message.author.displayAvatarURL({ forceStatic: true })
                            })
                            .setTitle('Message Content')
                            .setDescription(message.content)
                            .setFields(
                                {
                                    name: 'Reason',
                                    value: triggers.map(trigger => localize('en-US', trigger.toUpperCase().replaceAll('-', '_').replaceAll('/', '_'))).join(', '),
                                    inline: false
                                }
                            )
                    ]
                });
            };

            return true;
        };

        return false;
    };

    /**
     * @param {string} rule 
     */
    async addAIRule(rule) {
        this.data.ai.rules.push(rule);

        await this.save();
    };

    /**
     * @param {number} index 
     */
    async removAIRule(index) {
        this.data.ai.rules.splice(index, 1);

        await this.save();
    };

    /**
     * @param {string} category
     * @param {import('discord.js').Snowflake[]} roles
     */
    async addBlacklistRoles(category, roles) {
        this.data[category].roleBlacklist = this.data[category].roleBlacklist.concat(roles);

        await this.save();
    };

    /**
     * @param {string} category
     * @param {import('discord.js').Snowflake[]} roles
     */
    async removeBlacklistRoles(category, roles) {
        this.data[category].roleBlacklist = this.data[category].roleBlacklist.filter(role => !roles.includes(role));

        await this.save();
    };

    /**
     * @param {string} category
     * @param {import('discord.js').Snowflake[]} channels
     */
    async addBlacklistChannels(category, channels) {
        this.data[category].channelBlacklist = this.data[category].channelBlacklist.concat(channels);

        await this.save();
    };

    /**
     * @param {string} category
     * @param {import('discord.js').Snowflake[]} channels
     */
    async removeBlacklistChannels(category, channels) {
        this.data[category].channelBlacklist = this.data[category].channelBlacklist.filter(channel => !channels.includes(channel));

        await this.save();
    };

    /**
     * @param {import('discord.js').Snowflake} channelId
     */
    async setAIAlertChannel(channelId) {
        this.data.ai.alertChannel = channelId;

        await this.save();
    };

    /**
     * @param {import('discord.js').Snowflake} channelId
     */
    async setBadContentAlertChannel(channelId) {
        this.data.badContent.alertChannel = channelId;

        await this.save();
    };

    /**
     * @param {string} key
     */
    async setPurGPTKey(key) {
        this.data.purgptKey = key;

        await this.save();
    };

    /**
     * @param {string} model
     * @param {string} owner
     */
    async setAIModel(model, owner) {
        this.data.ai.model.name = model;
        this.data.ai.model.owner = owner;

        await this.save();
    };

    /**
     * @param {string} model
     * @param {string} owner
     */
    async setBadContentModel(model, owner) {
        this.data.badContent.model.name = model;
        this.data.badContent.model.owner = owner;

        await this.save();
    };

    async toggleAIFallbacks() {
        this.data.ai.allowFallbacks = !this.data.ai.allowFallbacks;

        await this.save();
    };

    /**
     * @param {string | string[]} filters
     */
    async setBadContentFilters(filters) {
        this.data.badContent.filters = filters;

        await this.save();
    };
};