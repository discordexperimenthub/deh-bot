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
        if (interaction.channel.ownerId !== interaction.user.id) return interaction.editReply(localize(locale, 'DELETE_THREAD_NOT_OWN'));


        if(!interaction.channel.permissionsFor(interaction.guild.members.me).has("ManageThreads")) return interaction.editReply(localize(locale, "DELETE_THREAD_MISSING_PERMISSION"))
        if(!interaction.guild.members.me.permissions.has("ManageThreads")) return interaction.editReply(localize(locale, "DELETE_THREAD_MISSING_PERMISSION"))

        interaction.channel.delete();
    }
};
