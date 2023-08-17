const { SlashCommandBuilder, ChatInputCommandInteraction, StringSelectMenuBuilder, StringSelectMenuOptionBuilder, ActionRowBuilder, PermissionFlagsBits } = require("discord.js");
const { QuickDB } = require("quick.db");
const { localize } = require("../modules/localization");
const EmbedMaker = require("../modules/embed");
const { beta, emojis, features } = require("../../config");
const Home = require("../modules/home");

const db = new QuickDB();

module.exports = {
    category: 'Moderator',
    data: new SlashCommandBuilder()
        .setName('settings')
        .setNameLocalizations({
            tr: 'ayarlar'
        })
        .setDescription('Shows the settings of the server')
        .setDescriptionLocalizations({
            tr: 'Sunucunun ayarlarını gösterir'
        })
        .setDMPermission(false)
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),
    /**
     * @param {ChatInputCommandInteraction} interaction 
     */
    async execute(interaction) {
        await interaction.deferReply();

        let guildId = interaction.guild.id;
        let locale = interaction.locale;

        interaction.editReply({
            components: [
                new ActionRowBuilder()
                    .setComponents(
                        new StringSelectMenuBuilder()
                            .setCustomId(`${interaction.user.id}:settings`)
                            .setPlaceholder(localize(locale, 'SETTINGS_MENU'))
                            .setOptions(features.map(feature => new StringSelectMenuOptionBuilder()
                                .setEmoji({
                                    id: emojis[feature].split(':')[2].replace('>', '')
                                })
                                .setLabel(localize(locale, feature.toUpperCase()))
                                .setValue(feature)
                            ))
                    )
            ]
        });
    }
};