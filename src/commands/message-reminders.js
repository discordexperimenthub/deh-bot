const { SlashCommandBuilder, ChatInputCommandInteraction } = require("discord.js");
const { QuickDB } = require("quick.db");
const EmbedMaker = require("../modules/embed");
const { localize } = require("../modules/localization");
const logger = require("../modules/logger");

const db = new QuickDB();

module.exports = {
    category: 'General',
    data: new SlashCommandBuilder()
        .setName('message-reminders')
        .setNameLocalizations({
            tr: 'mesaj-hatırlatıcıları'
        })
        .setDescription('Shows your message reminders')
        .setDescriptionLocalizations({
            tr: 'Mesaj hatırlatıcılarını gösterir'
        }),
    /**
     * @param {ChatInputCommandInteraction} interaction 
     */
    async execute(interaction) {
        await interaction.deferReply({ ephemeral: true });

        let reminders = await db.get(`users.${interaction.user.id}.reminders`) ?? [];
        let locale = interaction.locale;

        interaction.editReply({
            embeds: [
                new EmbedMaker(interaction.client)
                    .setTitle(localize(locale, 'MESSAGE_REMINDERS'))
                    .setDescription(reminders.length > 0 ? `${reminders.slice(0, 20).map((reminder, index) => `${index + 1}. ${reminder.content.length > 100 ? `${reminder.content.slice(0, 100)}...` : reminder.content} **-** Ends in <t:${reminder.time}:R>`).join('\n')}${reminders.length > 10 ? `\n**(${reminders.length - 10} more)**` : ''}` : localize(locale, 'NO_MESSAGE_REMINDERS'))
            ]
        }).catch(error => logger('error', 'REMINDER', 'Error while sending message reminder list', error));
    }
};