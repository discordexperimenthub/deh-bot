const { SlashCommandBuilder, ChatInputCommandInteraction, AutocompleteInteraction } = require('discord.js');
const { readFileSync } = require('node:fs');
const EmbedMaker = require('../modules/embed');

module.exports = {
    category: 'General',
    data: new SlashCommandBuilder()
        .setName('support-article')
        .setDescription('Shows an support article')
        .setDescriptionLocalizations({
            tr: 'Bir makale gösterir'
        })
        .addStringOption(option => option
            .setName('type')
            .setNameLocalizations({
                tr: 'tür'
            })
            .setDescription('Support type')
            .setDescriptionLocalizations({
                tr: 'Destek türü'
            })
            .setChoices(
                {
                    name: 'Support',
                    value: 'support'
                },
                {
                    name: 'Creator Support',
                    value: 'creator'
                },
                {
                    name: 'Developer Support',
                    value: 'developer'
                }
            )
            .setRequired(true)
        )
        .addStringOption(option => option
            .setName('article')
            .setNameLocalizations({
                tr: 'makale'
            })
            .setDescription('The article to show')
            .setDescriptionLocalizations({
                tr: 'Gösterilecek makale'
            })
            .setAutocomplete(true)
            .setRequired(true)
        ),
    /**
     * @param {ChatInputCommandInteraction} interaction 
     */
    async execute(interaction) {
        await interaction.deferReply();

        let type = interaction.options.getString('type');
        let articleId = parseInt(interaction.options.getString('article'));
        let articles = JSON.parse(readFileSync(`articles/${type === 'support' ? 'support' : type === 'creator' ? 'creatorSupport' : 'developerSupport'}Articles.json`, 'utf-8'));
        let article = articles.filter(article => article.id === articleId)[0];

        await interaction.editReply({
            embeds: [
                new EmbedMaker(interaction.client)
                    .setTitle(article.title)
                    .setFields(
                        {
                            name: 'Link',
                            value: article.html_url,
                            inline: false
                        },
                        {
                            name: 'Id',
                            value: article.id.toString(),
                            inline: true
                        },
                        {
                            name: 'Author Id',
                            value: article.author_id.toString(),
                            inline: true
                        },
                        {
                            name: 'Comments Enabled',
                            value: article.comments_disabled ? '❌' : '✅',
                            inline: true
                        },
                        {
                            name: 'Draft',
                            value: article.draft ? '✅' : '❌',
                            inline: true
                        },
                        {
                            name: 'Section Id',
                            value: article.section_id.toString(),
                            inline: true
                        },
                        {
                            name: 'Created At',
                            value: `<t:${Math.floor(new Date(article.created_at).getTime() / 1000)}:R>`,
                            inline: true
                        },
                        {
                            name: 'Updated At',
                            value: `<t:${Math.floor(new Date(article.updated_at).getTime() / 1000)}:R>`,
                            inline: true
                        },
                        {
                            name: 'Outdated',
                            value: article.outdated ? '✅' : '❌',
                            inline: true
                        },
                        {
                            name: 'Outdated Locales',
                            value: article.outdated_locales.length > 0 ? article.outdated_locales.join(', ') : 'None',
                            inline: true
                        },
                        {
                            name: 'Tags',
                            value: article.label_names.length > 0 ? article.label_names.join(', ') : 'None',
                            inline: true
                        }
                    )
            ]
        });
    },
    /**
     * @param {AutocompleteInteraction} interaction
     */
    async autocomplete(interaction) {
        let type = interaction.options.getString('type');
        let articles = JSON.parse(readFileSync(`articles/${type === 'support' ? 'support' : type === 'creator' ? 'creatorSupport' : 'developerSupport'}Articles.json`, 'utf-8'));
        let search = interaction.options.getFocused().toLowerCase();

        interaction.respond(articles.filter(article => article.name.toLowerCase().includes(search) || article.title.toLowerCase().includes(search)).slice(0, 25).map(article => ({
            name: article.name,
            value: article.id.toString()
        })));
    }
};