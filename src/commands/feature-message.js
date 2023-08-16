const { ContextMenuCommandBuilder, ApplicationCommandType, PermissionFlagsBits, MessageContextMenuCommandInteraction, ActionRowBuilder, StringSelectMenuBuilder, StringSelectMenuOptionBuilder, InteractionCollector, WebhookClient } = require("discord.js");
const { localize } = require("../modules/localization");
const { QuickDB } = require("quick.db");
const timer = require("../modules/timer");
const { emojis } = require("../../config");
const Home = require("../modules/home");
const DBMessage = require("../modules/message");

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

        const home = await new Home(guildId).setup();
        const message = await new DBMessage(interaction.targetId).setup();

        if (home.data.enabled && !home.usable) return interaction.editReply(localize(interaction.locale, 'FEATURE_MESSAGE_NOT_SET'));
        if (!home.data.enabled) return interaction.editReply(localize(interaction.locale, 'FEATURE_MESSAGE_NOT_ENABLED'));

        let locale = interaction.locale;

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
            collector.stop();

            await int.deferUpdate();

            let time = parseInt(int.values[0]);

            await home.send(true, interaction.channel, message, time);

            await interaction.editReply({
                content: localize(locale, 'FEATURE_MESSAGE_SUCCESS'),
                components: []
            });
        });
    }
};