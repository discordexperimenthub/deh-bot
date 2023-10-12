const { SlashCommandBuilder, ChatInputCommandInteraction } = require('discord.js');
const { readFileSync } = require('node:fs');
const EmbedMaker = require('../modules/embed');

module.exports = {
	category: 'General',
	data: new SlashCommandBuilder()
		.setName('support-sections')
		.setDescription('Shows the support sections')
		.setDescriptionLocalizations({
			tr: 'Destek kategorilerini gösterir',
		})
		.addStringOption((option) =>
			option
				.setName('type')
				.setNameLocalizations({
					tr: 'tür',
				})
				.setDescription('Support type')
				.setDescriptionLocalizations({
					tr: 'Destek türü',
				})
				.setChoices(
					{
						name: 'Support',
						value: 'support',
					},
					{
						name: 'Creator Support',
						value: 'creator',
					},
					{
						name: 'Developer Support',
						value: 'developer',
					},
				)
				.setRequired(true),
		),
	/**
	 * @param {ChatInputCommandInteraction} interaction
	 */
	async execute(interaction) {
		await interaction.deferReply();

		let type = interaction.options.getString('type');
		let sections = JSON.parse(
			readFileSync(
				`articles/${
					type === 'support' ? 'support' : type === 'creator' ? 'creatorSupport' : 'developerSupport'
				}Sections.json`,
				'utf-8',
			),
		);

		await interaction.editReply({
			embeds: [
				new EmbedMaker(interaction.client)
					.setTitle(
						`${type === 'support' ? 'Support' : type === 'creator' ? 'Creator Support' : 'Developer Support'} Sections`,
					)
					.setDescription(sections.map((section) => section.name).join(', ')),
			],
		});
	},
};
