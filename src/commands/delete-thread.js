const { SlashCommandBuilder, ChatInputCommandInteraction } = require("discord.js");
const { localize } = require("../modules/localization");

module.exports = {
    category: 'General',
    data: new SlashCommandBuilder()
    .setName('delete-thread')
    .setNameLocalizations({
        tr: 'alt-başlık-sil'
    })
    .setDescription("Deletes your thread")
    .setDescriptionLocalizations({
        tr: 'Alt başlığını siler'
    }),
    /**
     * @param {ChatInputCommandInteraction} interaction 
     */
    async execute(interaction) {
        await interaction.deferReply({ ephemeral: true });

        let locale = interaction.locale;
        
        if (!interaction.channel.isThread()) return interaction.editReply(localize(locale, 'DELETE_THREAD_NOT_A_THREAD'));
        if (!interaction.channel.isThread()) return interaction.editReply(localize(locale, 'DELETE_THREAD_NOT_OWN'));

        interaction.channel.delete();
    }
};
