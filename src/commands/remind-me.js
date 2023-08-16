const { ApplicationCommandType, ContextMenuCommandBuilder, ActionRowBuilder, StringSelectMenuBuilder, StringSelectMenuOptionBuilder, InteractionCollector, MessageContextMenuCommandInteraction } = require("discord.js");
const { localize } = require("../modules/localization");
const timer = require("../modules/timer");
const { QuickDB } = require("quick.db");
const { default: axios } = require("axios");
const crypto = require('node:crypto');

const db = new QuickDB();

module.exports = {
    category: 'General',
    data: new ContextMenuCommandBuilder()
        .setType(ApplicationCommandType.Message)
        .setName('Remind Me')
        .setNameLocalizations({
            tr: 'Hatırlat'
        }),
    /**
     * @param {MessageContextMenuCommandInteraction} interaction 
     */
    async execute(interaction) {
        const message = await interaction.deferReply({
            ephemeral: true,
            fetchReply: true
        });

        let locale = interaction.locale;

        interaction.editReply({
            components: [
                new ActionRowBuilder()
                    .setComponents(
                        new StringSelectMenuBuilder()
                            .setCustomId(`${interaction.user.id}:reminder_time`)
                            .setPlaceholder(localize(locale, 'REMINDER_TIME'))
                            .setOptions(
                                new StringSelectMenuOptionBuilder()
                                    .setLabel(localize(locale, 'IN_1_HOUR'))
                                    .setValue('3600000'),
                                new StringSelectMenuOptionBuilder()
                                    .setLabel(localize(locale, 'IN_2_HOURS'))
                                    .setValue('7200000'),
                                new StringSelectMenuOptionBuilder()
                                    .setLabel(localize(locale, 'IN_4_HOURS'))
                                    .setValue('14400000'),
                                new StringSelectMenuOptionBuilder()
                                    .setLabel(localize(locale, 'IN_1_DAY'))
                                    .setValue('86400000'),
                                new StringSelectMenuOptionBuilder()
                                    .setLabel(localize(locale, 'IN_1_WEEK'))
                                    .setValue('604800000')
                            )
                    )
            ]
        });

        const collector = new InteractionCollector(interaction.client, {
            message,
            time: 120000
        });

        collector.on('collect', async int => {
            collector.stop();
            int.deferUpdate();

            let time = parseInt(int.values[0]);
            let id = crypto.randomBytes(32).toString('hex');

            timer('sendUserMessage', {
                time,
                callback: async () => {
                    let reminders = await db.get(`users.${c.userId}.reminders`);

                    reminders = reminders.filter(r => r.id !== c.targetId);

                    await db.set(`users.${c.userId}.reminders`, reminders);
                },
                userId: interaction.user.id,
                message: {
                    content: interaction.targetMessage.content,
                    embeds: interaction.targetMessage.embeds.map(e => e.toJSON()),
                    attachments: interaction.targetMessage.attachments.map(a => a.toJSON())
                },
                id,
                config: {
                    userId: interaction.user.id,
                    targetId: interaction.targetId
                }
            });

            if (!(await db.has(`users.${interaction.user.id}.reminders`))) await db.set(`users.${interaction.user.id}.reminders`, []);

            await db.push(`users.${interaction.user.id}.reminders`, {
                time: Math.floor(Date.now() / 1000) + Math.floor(time / 1000),
                id: interaction.targetId,
                content: interaction.targetMessage.content
            });

            interaction.editReply({
                content: localize(locale, 'REMINDER_SET', `<t:${Math.floor(Date.now() / 1000) + Math.floor(time / 1000)}>`),
                components: []
            });
        });
    }
};