const { SlashCommandBuilder, ChatInputCommandInteraction } = require("discord.js");
const { localize } = require("../modules/localization");

module.exports = {
    category: 'Developer',
    data: new SlashCommandBuilder()
        .setName('eval')
        .setDescription('Evaluates the given code')
        .setDescriptionLocalizations({
            tr: 'Verilen kodu çalıştırır'
        })
        .addStringOption(option => option
            .setName('code')
            .setNameLocalizations({
                tr: 'kod'
            })
            .setDescription('The code to evaluate')
            .setDescriptionLocalizations({
                tr: 'Çalıştırılacak kod'
            })
            .setRequired(true)
        ),
    /**
     * @param {ChatInputCommandInteraction} interaction 
     */
    async execute(interaction) {
        await interaction.deferReply({ ephemeral: true });

        try {
            let input = interaction.options.getString('code');
            let code = await eval(input);

            if (typeof code !== 'string') code = await require('util').inspect(code, { depth: 0 });

            interaction.editReply(`**${localize(interaction.locale, 'OUTPUT')}:**\n\`\`\`js\n${code}\n\`\`\``);
        } catch (error) {
            interaction.editReply(`**${localize(interaction.locale, 'ERROR')}:**\n\`\`\`js\n${error.stack ?? error}\n\`\`\``);
        };
    }
};