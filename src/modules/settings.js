const { Locale, ActionRowBuilder, ButtonBuilder, StringSelectMenuBuilder, StringSelectMenuOptionBuilder, ButtonStyle } = require("discord.js");
const { emojis, colors, beta } = require("../../config");
const AutoMod = require("./automod");
const Home = require("./home");
const { localize } = require("./localization");
const EmbedMaker = require("./embed");

/**
 * @param {import("discord.js").Interaction} interaction 
 * @param {Home} home 
 * @param {Locale} locale
 */
module.exports.homeSettings = async (interaction, home, locale) => {
    interaction.editReply({
        embeds: [
            new EmbedMaker(interaction.client)
                .setColor(home.set ? home.data.enabled ? colors.green : colors.red : colors.yellow)
                .setTitle(`${emojis.home} ${localize(locale, 'HOME')} ${beta.home ? emojis.beta : ''}`)
                .setFields(
                    {
                        name: localize(locale, 'STATUS'),
                        value: home.data?.enabled ? `${emojis.enabled} ${localize(locale, 'ENABLED')}` : `${emojis.disabled} ${localize(locale, 'DISABLED')}`,
                        inline: true
                    },
                    {
                        name: localize(locale, 'CHANNEL'),
                        value: home.data?.channel ? `<#${home.data.channel}>` : localize(locale, 'NOT_SET'),
                        inline: true
                    },
                    {
                        name: localize(locale, 'MIN_INTERACTIONS'),
                        value: home.data.minInteractions.toString(),
                        inline: true
                    }
                )
        ],
        components: [
            new ActionRowBuilder()
                .setComponents(
                    ...(!home.set ? [
                        new ButtonBuilder()
                            .setCustomId(`${interaction.user.id}:home_setup`)
                            .setLabel(localize(locale, 'QUICK_SETUP'))
                            .setStyle(ButtonStyle.Success)
                    ] : []),
                    new ButtonBuilder()
                        .setCustomId(`${interaction.user.id}:home_${home.data?.enabled ? 'disable' : 'enable'}`)
                        .setLabel(localize(locale, home.data?.enabled ? 'DISABLE' : 'ENABLE'))
                        .setStyle(home.data?.enabled ? ButtonStyle.Danger : ButtonStyle.Success),
                    new ButtonBuilder()
                        .setCustomId(`${interaction.user.id}:home_channel`)
                        .setEmoji(emojis.channel)
                        .setLabel(localize(locale, 'SET_CHANNEL'))
                        .setStyle(ButtonStyle.Secondary),
                    new ButtonBuilder()
                        .setCustomId(`${interaction.user.id}:home_min_interactions`)
                        .setEmoji(emojis.interaction)
                        .setLabel(localize(locale, 'SET_MIN_INTERACTIONS'))
                        .setStyle(ButtonStyle.Secondary),
                    ...(home.set ? [
                        new ButtonBuilder()
                            .setCustomId(`${interaction.user.id}:home_reset`)
                            .setLabel(localize(locale, 'RESET_DATA'))
                            .setStyle(ButtonStyle.Danger)
                    ] : [])
                )
        ]
    });
};

/**
 * @param {import("discord.js").Interaction} interaction 
 * @param {AutoMod} automod
 * @param {Locale} locale
 */
module.exports.automodSettings = async (interaction, automod, locale) => {
    interaction.editReply({
        embeds: [
            new EmbedMaker(interaction.client)
                .setTitle(`${emojis.automod} ${localize(locale, 'AUTOMOD')}`)
                .setFields(
                    {
                        name: `${emojis.automod} ${localize(locale, 'AUTOMOD_AI')} **(${localize(locale, 'EXPERIMENTAL')})**`,
                        value: `${automod.data.ai.enabled ? emojis.enabled : emojis.disabled} ${localize(locale, automod.data.ai.enabled ? 'ENABLED' : 'DISABLED')}\n\n- **${localize(locale, 'ALERT_CHANNEL')}:** ${automod.data.ai.alertChannel ? `<#${automod.data.ai.alertChannel}>` : localize(locale, 'NONE')}\n- **${localize(locale, 'RULES')}:** ${localize(locale, 'FOUND', automod.data.ai.rules.length)}\n- **${localize(locale, 'AI_MODEL')}:** ${localize(locale, 'AI_MODEL_WITH_OWNER', automod.data.ai.model.name, automod.data.ai.model.owner)}\n- **${localize(locale, 'ALLOW_FALLBACKS')}:** ${automod.data.ai.allowFallbacks ? emojis.enabled : emojis.disabled} ${localize(locale, automod.data.ai.allowFallbacks ? 'ENABLED' : 'DISABLED')}\n- **${localize(locale, 'BLACKLISTED_ROLES')}:** ${automod.data.ai.roleBlacklist.map(role => `<@&${role}>`).join(', ')}\n- **${localize(locale, 'BLACKLISTED_CHANNELS')}:** ${automod.data.ai.channelBlacklist.map(channel => `<#${channel}>`).join(', ')}`,
                        inline: false
                    },
                    {
                        name: `${emojis.automodBadContent} ${localize(locale, 'BAD_CONTENT')} ${emojis.beta}`,
                        value: `${automod.data.badContent.enabled ? `${emojis.enabled} ${localize(locale, 'ENABLED')}` : `${emojis.disabled} ${localize(locale, 'DISABLED')}`}\n\n- **${localize(locale, 'ALERT_CHANNEL')}:** ${automod.data.badContent.alertChannel ? `<#${automod.data.badContent.alertChannel}>` : localize(locale, 'NONE')}\n- **${localize(locale, 'FILTERS')}:** ${automod.data.badContent.filters === 'all' ? localize(locale, 'ALL') : automod.data.badContent.filters.join(', ')}\n- **${localize(locale, 'AI_MODEL')}:** ${localize(locale, 'AI_MODEL_WITH_OWNER', automod.data.badContent.model.name, automod.data.badContent.model.owner)}\n- **${localize(locale, 'BLACKLISTED_ROLES')}:** ${automod.data.badContent.roleBlacklist.map(role => `<@&${role}>`).join(', ')}\n- **${localize(locale, 'BLACKLISTED_CHANNELS')}:** ${automod.data.badContent.channelBlacklist.map(channel => `<#${channel}>`).join(', ')}`,
                        inline: false
                    }
                )
        ],
        components: [
            new ActionRowBuilder()
                .setComponents(
                    new ButtonBuilder()
                        .setCustomId(`${interaction.user.id}:automod_toggle:ai`)
                        .setLabel(localize(locale, `AUTOMOD_AI_${automod.data.ai.enabled ? 'DISABLE' : 'ENABLE'}`))
                        .setStyle(automod.data.ai.enabled ? ButtonStyle.Danger : ButtonStyle.Success),
                    new ButtonBuilder()
                        .setCustomId(`${interaction.user.id}:automod_toggle:badContent`)
                        .setLabel(localize(locale, `AUTOMOD_BAD_CONTENT_${automod.data.badContent.enabled ? 'DISABLE' : 'ENABLE'}`))
                        .setStyle(automod.data.badContent.enabled ? ButtonStyle.Danger : ButtonStyle.Success),
                    new ButtonBuilder()
                        .setCustomId(`${interaction.user.id}:automod_reset`)
                        .setLabel(localize(locale, 'RESET_DATA'))
                        .setStyle(ButtonStyle.Danger)
                ),
            new ActionRowBuilder()
                .setComponents(
                    new StringSelectMenuBuilder()
                        .setCustomId(`${interaction.user.id}:automod_configure`)
                        .setPlaceholder(localize(locale, 'SELECT_CATEGORY'))
                        .setOptions(
                            new StringSelectMenuOptionBuilder()
                                .setEmoji(emojis.automod.split(':')[2].replace('>', ''))
                                .setLabel(localize(locale, 'AUTOMOD_AI'))
                                .setValue('ai'),
                            new StringSelectMenuOptionBuilder()
                                .setEmoji(emojis.automodBadContent.split(':')[2].replace('>', ''))
                                .setLabel(localize(locale, 'BAD_CONTENT'))
                                .setValue('bad_content')
                        )
                )
        ]
    });
};

/**
 * @param {import("discord.js").Interaction} interaction 
 * @param {AutoMod} automod
 * @param {Locale} locale
 */
module.exports.automodAIConfigure = (interaction, automod, locale) => {
    let rules = automod.data.ai.rules.length > 0 ? automod.data.ai.rules.join('\n\n') : localize(locale, 'NONE');

    interaction.editReply({
        embeds: [
            new EmbedMaker(interaction.client)
                .setTitle(`${emojis.automod} ${localize(locale, 'AUTOMOD_AI')} (Experimental)`)
                .setFields(
                    {
                        name: localize(locale, 'RULES'),
                        value: rules.length > 1000 ? `${rules.slice(0, 1000)}...` : rules,
                        inline: false
                    },
                    {
                        name: localize(locale, 'ALERT_CHANNEL'),
                        value: automod.data.ai.alertChannel ? `<#${automod.data.ai.alertChannel}>` : localize(locale, 'NONE'),
                        inline: true
                    },
                    {
                        name: localize(locale, 'AI_MODEL'),
                        value: localize(locale, 'AI_MODEL_WITH_OWNER', automod.data.ai.model.name, automod.data.ai.model.owner),
                        inline: true
                    },
                    {
                        name: localize(locale, 'ALLOW_FALLBACKS'),
                        value: `${automod.data.ai.allowFallbacks ? emojis.enabled : emojis.disabled} ${localize(locale, automod.data.ai.allowFallbacks ? 'ENABLED' : 'DISABLED')}`,
                        inline: true
                    },
                    {
                        name: localize(locale, 'BLACKLISTED_ROLES'),
                        value: automod.data.ai.roleBlacklist.length > 0 ? automod.data.ai.roleBlacklist.map(role => `<@&${role}>`).join(', ') : localize(locale, 'NONE'),
                        inline: false
                    },
                    {
                        name: localize(locale, 'BLACKLISTED_CHANNELS'),
                        value: automod.data.ai.channelBlacklist.length > 0 ? automod.data.ai.channelBlacklist.map(channel => `<#${channel}>`).join(', ') : localize(locale, 'NONE'),
                        inline: false
                    }
                )
        ],
        components: [
            new ActionRowBuilder()
                .setComponents(
                    new ButtonBuilder()
                        .setCustomId(`${interaction.user.id}:automod_ai_test`)
                        .setEmoji(emojis.automod.split(':')[2].replace('>', ''))
                        .setLabel(localize(locale, 'TEST'))
                        .setStyle(ButtonStyle.Primary),
                    new ButtonBuilder()
                        .setCustomId(`${interaction.user.id}:automod_ai_model_set_key`)
                        .setEmoji(emojis.set.split(':')[2].replace('>', ''))
                        .setLabel(localize(locale, 'SET_KEY'))
                        .setStyle(ButtonStyle.Secondary),
                ),
            new ActionRowBuilder()
                .setComponents(
                    new ButtonBuilder()
                        .setCustomId(`${interaction.user.id}:automod_ai_alert_channel`)
                        .setEmoji(emojis.channel.split(':')[2].replace('>', ''))
                        .setLabel(localize(locale, 'SET_ALERT_CHANNEL'))
                        .setStyle(ButtonStyle.Secondary),
                    new ButtonBuilder()
                        .setCustomId(`${interaction.user.id}:automod_ai_model${automod.data.purgptKey ? '_key' : ''}`)
                        .setEmoji(emojis.aiModel.split(':')[2].replace('>', ''))
                        .setLabel(localize(locale, 'AI_MODEL'))
                        .setStyle(ButtonStyle.Secondary),
                    new ButtonBuilder()
                        .setCustomId(`${interaction.user.id}:automod_ai_toggle_fallbacks`)
                        .setEmoji(emojis.fallback.split(':')[2].replace('>', ''))
                        .setLabel(localize(locale, `${automod.data.ai.allowFallbacks ? 'DISABLE' : 'ENABLE'}_FALLBACKS`))
                        .setStyle(ButtonStyle.Secondary)
                ),
            new ActionRowBuilder()
                .setComponents(
                    new ButtonBuilder()
                        .setCustomId(`${interaction.user.id}:automod_ai_sync_rules`)
                        .setEmoji(emojis.sync.split(':')[2].replace('>', ''))
                        .setLabel(localize(locale, 'SYNC_RULES'))
                        .setStyle(ButtonStyle.Secondary),
                    new ButtonBuilder()
                        .setCustomId(`${interaction.user.id}:automod_ai_add_rule`)
                        .setEmoji(emojis.add.split(':')[2].replace('>', ''))
                        .setLabel(localize(locale, 'ADD_RULE'))
                        .setStyle(ButtonStyle.Secondary),
                    new ButtonBuilder()
                        .setCustomId(`${interaction.user.id}:automod_ai_remove_rule`)
                        .setEmoji(emojis.remove.split(':')[2].replace('>', ''))
                        .setLabel(localize(locale, 'REMOVE_RULE'))
                        .setStyle(ButtonStyle.Secondary)
                ),
            new ActionRowBuilder()
                .setComponents(
                    new ButtonBuilder()
                        .setCustomId(`${interaction.user.id}:automod_ai_add_blacklist_roles`)
                        .setEmoji(emojis.add.split(':')[2].replace('>', ''))
                        .setLabel(localize(locale, 'ADD_BLACKLIST_ROLES'))
                        .setStyle(ButtonStyle.Secondary),
                    new ButtonBuilder()
                        .setCustomId(`${interaction.user.id}:automod_ai_remove_blacklist_roles`)
                        .setEmoji(emojis.remove.split(':')[2].replace('>', ''))
                        .setLabel(localize(locale, 'REMOVE_BLACKLIST_ROLES'))
                        .setStyle(ButtonStyle.Secondary),
                    new ButtonBuilder()
                        .setCustomId(`${interaction.user.id}:automod_ai_add_blacklist_channels`)
                        .setEmoji(emojis.add.split(':')[2].replace('>', ''))
                        .setLabel(localize(locale, 'ADD_BLACKLIST_CHANNELS'))
                        .setStyle(ButtonStyle.Secondary),
                    new ButtonBuilder()
                        .setCustomId(`${interaction.user.id}:automod_ai_remove_blacklist_channels`)
                        .setEmoji(emojis.remove.split(':')[2].replace('>', ''))
                        .setLabel(localize(locale, 'REMOVE_BLACKLIST_CHANNELS'))
                        .setStyle(ButtonStyle.Secondary)
                )
        ]
    });
};

/**
 * @param {import("discord.js").Interaction} interaction 
 * @param {AutoMod} automod
 * @param {Locale} locale
 */
module.exports.automodBadContentConfigure = (interaction, automod, locale) => {
    interaction.editReply({
        embeds: [
            new EmbedMaker(interaction.client)
                .setTitle(`${emojis.automodBadContent} ${localize(locale, 'BAD_CONTENT')} ${emojis.beta}`)
                .setFields(
                    {
                        name: localize(locale, 'FILTERS'),
                        value: automod.data.badContent.filters === 'all' ? localize(locale, 'ALL') : automod.data.badContent.filters.length > 0 ? automod.data.badContent.filters.map(filter => localize(locale, filter.toUpperCase().replaceAll('-', '_').replaceAll('/', '_'))).join(', ') : localize(locale, 'NONE'),
                        inline: false
                    },
                    {
                        name: localize(locale, 'ALERT_CHANNEL'),
                        value: automod.data.badContent.alertChannel ? `<#${automod.data.badContent.alertChannel}>` : localize(locale, 'NONE'),
                        inline: true
                    },
                    {
                        name: localize(locale, 'AI_MODEL'),
                        value: localize(locale, 'AI_MODEL_WITH_OWNER', automod.data.badContent.model.name, automod.data.badContent.model.owner),
                        inline: true
                    },
                    {
                        name: localize(locale, 'BLACKLISTED_ROLES'),
                        value: automod.data.badContent.roleBlacklist.length > 0 ? automod.data.badContent.roleBlacklist.map(role => `<@&${role}>`).join(', ') : localize(locale, 'NONE'),
                        inline: false
                    },
                    {
                        name: localize(locale, 'BLACKLISTED_CHANNELS'),
                        value: automod.data.badContent.channelBlacklist.length > 0 ? automod.data.badContent.channelBlacklist.map(channel => `<#${channel}>`).join(', ') : localize(locale, 'NONE'),
                        inline: false
                    }
                )
        ],
        components: [
            new ActionRowBuilder()
                .setComponents(
                    new ButtonBuilder()
                        .setCustomId(`${interaction.user.id}:automod_bad_content_set_filters`)
                        .setEmoji(emojis.automod.split(':')[2].replace('>', ''))
                        .setLabel(localize(locale, 'SET_FILTERS'))
                        .setStyle(ButtonStyle.Primary),
                    new ButtonBuilder()
                        .setCustomId(`${interaction.user.id}:automod_ai_model_set_key`)
                        .setEmoji(emojis.set.split(':')[2].replace('>', ''))
                        .setLabel(localize(locale, 'SET_KEY'))
                        .setStyle(ButtonStyle.Secondary),
                ),
            new ActionRowBuilder()
                .setComponents(
                    new ButtonBuilder()
                        .setCustomId(`${interaction.user.id}:automod_bad_content_alert_channel`)
                        .setEmoji(emojis.channel.split(':')[2].replace('>', ''))
                        .setLabel(localize(locale, 'SET_ALERT_CHANNEL'))
                        .setStyle(ButtonStyle.Secondary),
                    new ButtonBuilder()
                        .setCustomId(`${interaction.user.id}:automod_${automod.data.purgptKey ? 'bad_content_model_key' : 'ai_model'}`)
                        .setEmoji(emojis.aiModel.split(':')[2].replace('>', ''))
                        .setLabel(localize(locale, 'AI_MODEL'))
                        .setStyle(ButtonStyle.Secondary)
                ),
            new ActionRowBuilder()
                .setComponents(
                    new ButtonBuilder()
                        .setCustomId(`${interaction.user.id}:automod_bad_content_add_blacklist_roles`)
                        .setEmoji(emojis.add.split(':')[2].replace('>', ''))
                        .setLabel(localize(locale, 'ADD_BLACKLIST_ROLES'))
                        .setStyle(ButtonStyle.Secondary),
                    new ButtonBuilder()
                        .setCustomId(`${interaction.user.id}:automod_bad_content_remove_blacklist_roles`)
                        .setEmoji(emojis.remove.split(':')[2].replace('>', ''))
                        .setLabel(localize(locale, 'REMOVE_BLACKLIST_ROLES'))
                        .setStyle(ButtonStyle.Secondary),
                    new ButtonBuilder()
                        .setCustomId(`${interaction.user.id}:automod_bad_content_add_blacklist_channels`)
                        .setEmoji(emojis.add.split(':')[2].replace('>', ''))
                        .setLabel(localize(locale, 'ADD_BLACKLIST_CHANNELS'))
                        .setStyle(ButtonStyle.Secondary),
                    new ButtonBuilder()
                        .setCustomId(`${interaction.user.id}:automod_bad_content_remove_blacklist_channels`)
                        .setEmoji(emojis.remove.split(':')[2].replace('>', ''))
                        .setLabel(localize(locale, 'REMOVE_BLACKLIST_CHANNELS'))
                        .setStyle(ButtonStyle.Secondary)
                )
        ]
    });
};