const { ContextMenuCommandBuilder, ApplicationCommandType, PermissionFlagsBits, MessageContextMenuCommandInteraction, ActionRowBuilder, StringSelectMenuBuilder, StringSelectMenuOptionBuilder, InteractionCollector, WebhookClient } = require("discord.js");
const { localize } = require("../modules/localization");
const { QuickDB } = require("quick.db");
const cron = require("../modules/cron");
const { emojis } = require("../../config");

const db = new QuickDB();

module.exports = {
    category: 'Moderator',
    data: new ContextMenuCommandBuilder()
        .setType(ApplicationCommandType.Message)
        .setName('Feature Message')
        .setNameLocalizations({
            tr: 'Mesajı Öne Çıkar'
        })
        .setDMPermission(false)
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),
    /**
     * @param {MessageContextMenuCommandInteraction} interaction 
     */
    async execute(interaction) {
        await interaction.deferReply({ ephemeral: true });

        let guildId = interaction.guildId;
        let guild = (await db.get(`guilds.${guildId}`)) ?? {};

        if (!guild.home || !guild.home.channel || !guild.home.webhook) return interaction.editReply(localize(interaction.locale, 'FEATURE_MESSAGE_NOT_SET'));
        if (!guild.home.enabled) return interaction.editReply(localize(interaction.locale, 'FEATURE_MESSAGE_NOT_ENABLED'));

        let locale = interaction.locale;
        let homeMessages = (await db.get(`guilds.${guildId}.home.messages`)) ?? [];

        const componentMessage = interaction.editReply({
            components: [
                new ActionRowBuilder()
                    .setComponents(
                        new StringSelectMenuBuilder()
                            .setCustomId(`${interaction.user.id}:feature_message`)
                            .setPlaceholder(localize(locale, 'FEATURE_MESSAGE_SELECT_TIME'))
                            .setOptions(
                                new StringSelectMenuOptionBuilder()
                                    .setLabel(localize(locale, 'FOR_24_HOURS'))
                                    .setValue('86400000'),
                                new StringSelectMenuOptionBuilder()
                                    .setLabel(localize(locale, 'FOR_3_DAYS'))
                                    .setValue('259200000'),
                                new StringSelectMenuOptionBuilder()
                                    .setLabel(localize(locale, 'FOR_7_DAYS'))
                                    .setValue('604800000')
                            )
                    )
            ]
        });

        const collector = new InteractionCollector(interaction.client, {
            message: componentMessage,
            time: 120000
        });

        collector.on('collect', async int => {
            await int.deferUpdate();

            let time = parseInt(int.values[0]);

            if (!homeMessages.includes(interaction.targetId)) {
                let webhook = new WebhookClient({
                    url: guild.home.webhook
                });
                let homeMessage = interaction.targetMessage;

                const post = await webhook.send({
                    avatarURL: homeMessage.author.displayAvatarURL({ forceStatic: true }),
                    username: homeMessage.member?.displayName ?? homeMessage.author.displayName,
                    content: `${emojis.featuredMessage} **Featured Message**\n${homeMessage.content}`,
                    embeds: homeMessage.embeds,
                    files: homeMessage.attachments.map(a => a.url),
                    allowedMentions: {
                        parse: []
                    }
                });
                const postMessage = await interaction.client.channels.cache.get(guild.home.channel).messages.fetch(post.id);

                let added = [];

                for (let reaction of homeMessage.reactions.cache.toJSON()) {
                    if (added.includes(reaction.emoji.id ?? reaction.emoji.name)) continue;

                    postMessage.react({
                        id: reaction.emoji.id,
                        name: reaction.emoji.name
                    }).catch(() => { });
                    added.push(reaction.emoji.id ?? reaction.emoji.name);

                    await new Promise(resolve => setTimeout(resolve, 1000));
                };

                homeMessages.push(interaction.targetId);

                await db.set(`guilds.${guildId}.home.messages`, homeMessages);

                cron(time, async () => {
                    let homeMessagesNew = (await db.get(`guilds.${guildId}.home.messages`)) ?? [];

                    homeMessagesNew = homeMessagesNew.filter(m => m !== interaction.targetId);

                    await db.set(`guilds.${guildId}.home.messages`, homeMessagesNew);
                    await postMessage.delete();
                });
            };

            await interaction.editReply({
                content: localize(locale, 'FEATURE_MESSAGE_SUCCESS'),
                components: []
            });
        });
    }
};