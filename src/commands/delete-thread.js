const { SlashCommandBuilder, ChatInputCommandInteraction } = require("discord.js");

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

        if (!interaction.channel.isThread()) return interaction.editReply('This command can only be executed in thread channels.');
        if (!interaction.channel.ownerId !== interaction.user.id) return interaction.editReply('You can only delete your own theads!');

        interaction.channel.delete();
    }
};
