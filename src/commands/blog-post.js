const { SlashCommandBuilder, ChatInputCommandInteraction, AutocompleteInteraction } = require('discord.js');
const { readFileSync } = require('node:fs');
const EmbedMaker = require('../modules/embed');

module.exports = {
    category: 'General',
    data: new SlashCommandBuilder()
        .setName('blog-post')
        .setDescription('Shows a blog post')
        .setDescriptionLocalizations({
            tr: 'Bir blog gönderisi gösterir'
        })
        .addStringOption(option => option
            .setName('post')
            .setNameLocalizations({
                tr: 'gönderi'
            })
            .setDescription('The post to show')
            .setDescriptionLocalizations({
                tr: 'Gösterilecek gönderi'
            })
            .setAutocomplete(true)
            .setRequired(true)
        ),
    /**
     * @param {ChatInputCommandInteraction} interaction 
     */
    async execute(interaction) {
        await interaction.deferReply();

        let postId = interaction.options.getString('post');
        let posts = JSON.parse(readFileSync('blog/posts.json', 'utf-8'));
        let post = posts.filter(p => p.id === postId)[0];

        await interaction.editReply({
            embeds: [
                new EmbedMaker(interaction.client)
                    .setTitle(post.title)
                    .setDescription(post.description)
                    .setFields(
                        {
                            name: 'Link',
                            value: post.link.toString(),
                            inline: false
                        },
                        {
                            name: 'Id',
                            value: post.id.toString(),
                            inline: true
                        },
                        {
                            name: 'Published At',
                            value: `<t:${Math.floor(new Date(post.pubDate).getTime() / 1000)}:R>`,
                            inline: true
                        }
                    )
                    .setImage(post['media:thumbnail'])
                    .setFooterText('Powered by xHyroM/discord-datamining')
            ]
        });
    },
    /**
     * @param {AutocompleteInteraction} interaction
     */
    async autocomplete(interaction) {
        let posts = JSON.parse(readFileSync('blog/posts.json', 'utf-8'));
        let search = interaction.options.getFocused().toLowerCase();

        interaction.respond(posts.filter(post => post).filter(post => (post.id).toLowerCase().includes(search) || post.title.toLowerCase().includes(search) || post.description.toLowerCase().includes(search)).slice(0, 25).map(article => ({
            name: article.title,
            value: article.id
        })));
    }
};