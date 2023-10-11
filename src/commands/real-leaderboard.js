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

        let users = await db.get('users');

        if (!users) {
            users = [];
        };

        users.sort((a, b) => b.real - a.real);

        let leaderboard = [];

        for (let i = 0; i < 10; i++) {
            if (users[i]) {
                leaderboard.push(`${i + 1}. ${users[i].name} - ${users[i].real}`);
            };
        };

        await interaction.editReply({
            embeds: [
                new EmbedMaker(interaction.client)
                    .setTitle('Real Leaderboard')
                    .setDescription(leaderboard.join('\n'))
            ]
        });
    }
};