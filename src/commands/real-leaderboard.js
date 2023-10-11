const { SlashCommandBuilder, ChatInputCommandInteraction } = require("discord.js");
const { QuickDB } = require("quick.db");
const EmbedMaker = require("../modules/embed");

const db = new QuickDB();

module.exports = {
    category: 'General',
    data: new SlashCommandBuilder()
        .setName('real-leaderboard')
        .setDescription('Shows the realest users.'),
    /**
     * @param {ChatInputCommandInteraction} interaction 
     */
    async execute(interaction) {
        await interaction.deferReply();

        let users = await db.get('users') ?? {};

        let leaderboard = Object.entries(users);

        leaderboard.sort((a, b) => b[1].real - a[1].real);

        leaderboard = leaderboard.map((user, index) => {
            return `${index + 1}. <@${user[0]}> - ${user[1].real}`;
        });

        await interaction.editReply({
            embeds: [
                new EmbedMaker(interaction.client)
                    .setTitle('Real Leaderboard')
                    .setDescription(leaderboard.join('\n'))
            ]
        });
    }
};