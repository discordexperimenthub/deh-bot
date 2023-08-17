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
        .setDescription('Manages your message reminders')
        .setDescriptionLocalizations({
            tr: 'Mesaj hatırlatıcılarını yönetir'
        })
        .addSubcommand(subcommand => subcommand
            .setName('list')
            .setNameLocalizations({
                tr: 'listele'
            })
            .setDescription('Lists your message reminders')
            .setDescriptionLocalizations({
                tr: 'Mesaj hatırlatıcılarını listeler'
            })
        )
        .addSubcommand(subcommand => subcommand
            .setName('cancel')
            .setNameLocalizations({
                tr: 'iptal-et'
            })
            .setDescription('Cancels your message reminder')
            .setDescriptionLocalizations({
                tr: 'Mesaj hatırlatıcını iptal eder'
            })
            .addIntegerOption(option => option
                .setName('index')
                .setNameLocalizations({
                    tr: 'sıra'
                })
                .setDescription('Index of the message reminder. You can get the index by using the list subcommand')
                .setDescriptionLocalizations({
                    tr: 'Mesaj hatırlatıcısının sırası'
                })
                .setRequired(true)
                .setMinValue(1)
            )
        ),
    /**
     * @param {ChatInputCommandInteraction} interaction 
     */
    async execute(interaction) {
        await interaction.deferReply({ ephemeral: true });

        let subcommand = interaction.options.getSubcommand();
        let reminders = await db.get(`users.${interaction.user.id}.reminders`) ?? [];
        let locale = interaction.locale;

        if (subcommand === 'list') {

            interaction.editReply({
                embeds: [
                    new EmbedMaker(interaction.client)
                        .setTitle(localize(locale, 'MESSAGE_REMINDERS'))
                        .setDescription(reminders.length > 0 ? `${reminders.slice(0, 20).map((reminder, index) => `${index + 1}. ${reminder.content.length > 100 ? `${reminder.content.slice(0, 100)}...` : reminder.content} **-** Ends in <t:${reminder.time}:R>`).join('\n')}${reminders.length > 10 ? `\n**(${reminders.length - 10} more)**` : ''}` : localize(locale, 'NO_MESSAGE_REMINDERS'))
                ]
            }).catch(error => logger('error', 'REMINDER', 'Error while sending message reminder list', error));
        } else if (subcommand === 'cancel') {
            let index = interaction.options.getInteger('index') - 1;
            let reminder = reminders[index];

            if (isNaN(index) || !reminder) return interaction.editReply(localize(locale, 'INVALID_NUMBER'));

            reminders.splice(index, 1);

            await db.set(`users.${interaction.user.id}.reminders`, reminders);

            let timers = await db.get('timers') ?? [];

            timers = timers.filter(timer => timer.id !== reminder.timerId);

            await db.set('timers', timers);

            interaction.editReply(localize(locale, 'MESSAGE_REMINDER_CANCELLED'));
        };
    }
};
