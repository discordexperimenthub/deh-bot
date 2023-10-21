const {
	Client,
	Collection,
	WebhookClient,
	ActionRowBuilder,
	ButtonBuilder,
	ButtonStyle,
	ChannelType,
	PermissionFlagsBits,
	ChannelSelectMenuBuilder,
	ModalBuilder,
	TextInputBuilder,
	TextInputStyle,
	RoleSelectMenuBuilder,
	StringSelectMenuBuilder,
	StringSelectMenuOptionBuilder,
	OverwriteType,
	PermissionsBitField,
	UserSelectMenuBuilder,
	MessageType,
} = require('discord.js');
const { readdirSync, writeFileSync, readFileSync, mkdirSync, writeFile } = require('node:fs');
const { default: axios } = require('axios');
const logger = require('./modules/logger');
const { localize } = require('./modules/localization');
const { ownerId, developerIds, roleIds, colors, emojis, beta, serverId } = require('../config');
const { diffLines } = require('diff');
const EmbedMaker = require('./modules/embed');
const { execSync } = require('node:child_process');
const { QuickDB } = require('quick.db');
const timer = require('./modules/timer');
const Home = require('./modules/home');
const AutoMod = require('./modules/automod');
const { automodSettings, homeSettings, automodAIConfigure, automodBadContentConfigure, automodToxicContentConfigure } = require('./modules/settings');
const BugFixTools = require("./modules/bugFixTools");
const { bugFixToolsSettings } = require("./modules/settings");

const client = new Client({
	intents: ['Guilds', 'GuildMessages', 'MessageContent', 'GuildMessageReactions', 'DirectMessages'],
});
const webhooks = {
	extraStuff: new WebhookClient({
		url: process.env.EXTRA_STUFF_WEBHOOK,
	}),
	otherChanges: new WebhookClient({
		url: process.env.OTHER_CHANGES_WEBHOOK,
	}),
};
const db = new QuickDB();

async function checkFirstDayOfMonth() {
	let today = new Date();

	if (today.getDate() === 1) {
		let users = await db.get('clyde');

		for (let user of Object.keys(users)) {
			let userFound = await client.user.fetch(user).catch(() => null);

			if (!userFound) {
				await db.delete(`clyde.${user}`);

				client.channels.cache
					.get('1089842190840246342')
					.send(`User **${user}** was removed from the database because they no longer exist.`);
			}
		}

		let servers = await db.get('guilds');

		for (let server of Object.keys(servers)) {
			let serverFound = await client.guilds.fetch(server).catch(() => null);

			if (!serverFound) {
				await db.delete(`guilds.${server}`);

				client.channels.cache
					.get('1089842190840246342')
					.send(`Server **${server}** was removed from the database because it no longer exists.`);
			}
		}
	}
}

client.commands = new Collection();

const commandFiles = readdirSync('src/commands').filter((file) => file.endsWith('.js'));

if (commandFiles.length > 0) logger('info', 'COMMAND', 'Found', commandFiles.length.toString(), 'commands');
else logger('warning', 'COMMAND', 'No commands found');

for (const file of commandFiles) {
	const command = require(`./commands/${file}`);

	client.commands.set(command.data.name, command);

	logger('success', 'COMMAND', 'Loaded command', command.data.name);
}

async function fetchSupportArticles(file, title, url) {
	let oldSupportArticles = '';

	try {
		oldSupportArticles = readFileSync(`articles/${file}.json`, 'utf-8');
	} catch (error) {
		logger('error', 'ARTICLE', 'Error while reading', `articles/${file}.json`, error);
	}

	let supportArticles = (await axios.get(url)).data?.articles;

	writeFileSync(`articles/${file}.json`, JSON.stringify(supportArticles, null, 4), 'utf-8');
	logger('success', 'ARTICLE', `Fetched ${title} articles`);

	if (oldSupportArticles !== '') {
		oldSupportArticles = JSON.parse(oldSupportArticles);

		let removed = [];
		let added = [];
		let changed = [];

		for (let data of supportArticles) {
			if (!oldSupportArticles.filter((s) => s.id === data.id)[0]) added.push(data);
		}

		for (let data of oldSupportArticles) {
			if (!supportArticles.filter((s) => s.id === data.id)[0]) removed.push(data);
		}

		for (let data of supportArticles) {
			if (
				oldSupportArticles.filter((s) => s.id === data.id)[0] &&
				(oldSupportArticles.filter((s) => s.id === data.id)[0].name !== data.name ||
					oldSupportArticles.filter((s) => s.id === data.id)[0].body !== data.body ||
					oldSupportArticles.filter((s) => s.id === data.id)[0].title !== data.title)
			)
				changed.push(data);
		}

		logger('success', 'ARTICLE', 'Generated diff for', `${file}.json`);

		if (added.length > 0 || removed.length > 0 || changed.length > 0) {
			for (let data of added) {
				const embed = new EmbedMaker(client)
					.setColor(colors.green)
					.setTitle(`Added ${title} Article`)
					.setFields(
						{
							name: 'Link',
							value: data.html_url,
							inline: false,
						},
						{
							name: 'Id',
							value: data.id.toString(),
							inline: true,
						},
						{
							name: 'Author Id',
							value: data.author_id.toString(),
							inline: true,
						},
						{
							name: 'Comments Enabled',
							value: data.comments_disabled ? '❌' : '✅',
							inline: true,
						},
						{
							name: 'Draft',
							value: data.draft ? '✅' : '❌',
							inline: true,
						},
						{
							name: 'Section Id',
							value: data.section_id.toString(),
							inline: true,
						},
						{
							name: 'Created At',
							value: `<t:${Math.floor(new Date(data.created_at).getTime() / 1000)}:R>`,
							inline: true,
						},
						{
							name: 'Name',
							value: data.name,
							inline: true,
						},
						{
							name: 'Title',
							value: data.title,
							inline: true,
						},
						{
							name: 'Outdated',
							value: data.outdated ? '✅' : '❌',
							inline: true,
						},
						{
							name: 'Outdated Locales',
							value: data.outdated_locales.length > 0 ? data.outdated_locales.join(', ') : 'None',
							inline: true,
						},
						{
							name: 'Tags',
							value: data.label_names.length > 0 ? data.label_names.join(', ') : 'None',
							inline: true,
						},
					);

				webhooks.otherChanges.send({
					content: `<@&${roleIds.otherChanges}> <@&${roleIds.urlStuff}>`,
					embeds: [embed],
				});

				// Wait 3 seconds to prevent ratelimit
				await new Promise((resolve) => setTimeout(resolve, 3000));
			}

			for (let data of changed) {
				let diffSupportArticleText = '';
				let diffSupportArticle = diffLines(
					oldSupportArticles.filter((s) => s.id === data.id)[0].body,
					data.body,
				).filter((l) => l.added || l.removed);

				diffSupportArticleText = diffSupportArticle
					.map((line) =>
						line.added
							? '+ ' +
							  line.value
									.split('\n')
									.filter((l) => l !== '')
									.join('\n+ ')
							: '- ' +
							  line.value
									.split('\n')
									.filter((l) => l !== '')
									.join('\n- '),
					)
					.join('\n');

				const embed = new EmbedMaker(client)
					.setColor(colors.yellow)
					.setTitle(`Updated ${title} Article`)
					.setFields(
						{
							name: 'Link',
							value: data.html_url,
							inline: false,
						},
						{
							name: 'Id',
							value: data.id.toString(),
							inline: true,
						},
						{
							name: 'Author Id',
							value: data.author_id.toString(),
							inline: true,
						},
						{
							name: 'Comments Enabled',
							value: data.comments_disabled ? '❌' : '✅',
							inline: true,
						},
						{
							name: 'Draft',
							value: data.draft ? '✅' : '❌',
							inline: true,
						},
						{
							name: 'Section Id',
							value: data.section_id.toString(),
							inline: true,
						},
						{
							name: 'Created At',
							value: `<t:${Math.floor(new Date(data.created_at).getTime() / 1000)}:R>`,
							inline: true,
						},
						{
							name: 'Updated At',
							value: `<t:${Math.floor(new Date(data.updated_at).getTime() / 1000)}:R>`,
							inline: true,
						},
						{
							name: 'Name',
							value: data.name,
							inline: true,
						},
						{
							name: 'Title',
							value: data.title,
							inline: true,
						},
						{
							name: 'Outdated',
							value: data.outdated ? '✅' : '❌',
							inline: true,
						},
						{
							name: 'Outdated Locales',
							value: data.outdated_locales.length > 0 ? data.outdated_locales.join(', ') : 'None',
							inline: true,
						},
						{
							name: 'Tags',
							value: data.label_names.length > 0 ? data.label_names.join(', ') : 'None',
							inline: true,
						},
					);

				if (diffSupportArticleText !== '')
					embed.setDescription(
						`\`\`\`diff\n${
							diffSupportArticleText.length > 3500
								? `${diffSupportArticleText.slice(0, 3500)}...`
								: diffSupportArticleText
						}\`\`\``,
					);

				webhooks.otherChanges.send({
					content: `<@&${roleIds.otherChanges}> <@&${roleIds.urlStuff}>`,
					embeds: [embed],
				});

				// Wait 3 seconds to prevent ratelimit
				await new Promise((resolve) => setTimeout(resolve, 3000));
			}

			for (let data of removed) {
				const embed = new EmbedMaker(client)
					.setColor(colors.red)
					.setTitle(`Removed ${title} Article`)
					.setFields(
						{
							name: 'Link',
							value: data.html_url,
							inline: false,
						},
						{
							name: 'Id',
							value: data.id.toString(),
							inline: true,
						},
						{
							name: 'Author Id',
							value: data.author_id.toString(),
							inline: true,
						},
						{
							name: 'Comments Enabled',
							value: data.comments_disabled ? '❌' : '✅',
							inline: true,
						},
						{
							name: 'Draft',
							value: data.draft ? '✅' : '❌',
							inline: true,
						},
						{
							name: 'Section Id',
							value: data.section_id.toString(),
							inline: true,
						},
						{
							name: 'Created At',
							value: `<t:${Math.floor(new Date(data.created_at).getTime() / 1000)}:R>`,
							inline: true,
						},
						{
							name: 'Updated At',
							value: `<t:${Math.floor(new Date(data.updated_at).getTime() / 1000)}:R>`,
							inline: true,
						},
						{
							name: 'Name',
							value: data.name,
							inline: true,
						},
						{
							name: 'Title',
							value: data.title,
							inline: true,
						},
						{
							name: 'Outdated',
							value: data.outdated ? '✅' : '❌',
							inline: true,
						},
						{
							name: 'Outdated Locales',
							value: data.outdated_locales.length > 0 ? data.outdated_locales.join(', ') : 'None',
							inline: true,
						},
						{
							name: 'Tags',
							value: data.label_names.length > 0 ? data.label_names.join(', ') : 'None',
							inline: true,
						},
					);

				webhooks.otherChanges.send({
					content: `<@&${roleIds.otherChanges}> <@&${roleIds.urlStuff}>`,
					embeds: [embed],
				});

				// Wait 3 seconds to prevent ratelimit
				await new Promise((resolve) => setTimeout(resolve, 3000));
			}

			logger('success', 'ARTICLE', 'Generated response for', `${file}.json`);
		}
	}
}

async function fetchSupportSections(file, title, url) {
	let oldSupportSections = '';

	try {
		oldSupportSections = readFileSync(`articles/${file}.json`, 'utf-8');
	} catch (error) {
		try {
			writeFileSync(`articles/${file}.json`, '', 'utf-8');

			oldSupportSections = readFileSync(`articles/${file}.json`, 'utf-8');
		} catch (error) {
			mkdirSync('articles');
			writeFileSync(`articles/${file}.json`, '', 'utf-8');

			oldSupportSections = readFileSync(`articles/${file}.json`, 'utf-8');
		}
	}

	let supportSections = (await axios.get(url)).data?.sections;

	writeFileSync(`articles/${file}.json`, JSON.stringify(supportSections, null, 4), 'utf-8');
	logger('success', 'ARTICLE', `Fetched ${title} sections`);

	if (oldSupportSections !== '') {
		oldSupportSections = JSON.parse(oldSupportSections);

		let removed = [];
		let added = [];
		let changed = [];

		for (let data of supportSections) {
			if (!oldSupportSections.filter((s) => s.id === data.id)[0]) added.push(data);
		}

		for (let data of oldSupportSections) {
			if (!supportSections.filter((s) => s.id === data.id)[0]) removed.push(data);
		}

		for (let data of supportSections) {
			if (
				oldSupportSections.filter((s) => s.id === data.id)[0] &&
				oldSupportSections.filter((s) => s.id === data.id)[0].name !== data.name
			)
				changed.push(data);
		}

		logger('success', 'ARTICLE', 'Generated diff for', `${file}.json`);

		if (added.length > 0 || removed.length > 0 || changed.length > 0) {
			for (let data of added) {
				const embed = new EmbedMaker(client)
					.setColor(colors.green)
					.setTitle(`Added ${title} Section`)
					.setFields(
						{
							name: 'Link',
							value: data.html_url,
							inline: false,
						},
						{
							name: 'Id',
							value: data.id.toString(),
							inline: true,
						},
						{
							name: 'Category Id',
							value: data.category_id.toString(),
							inline: true,
						},
						{
							name: 'Created At',
							value: `<t:${Math.floor(new Date(data.created_at).getTime() / 1000)}:R>`,
							inline: true,
						},
						{
							name: 'Name',
							value: data.name,
							inline: true,
						},
						{
							name: 'Description',
							value: data.description === '' ? 'None' : data.description,
							inline: true,
						},
						{
							name: 'Outdated',
							value: data.outdated ? '✅' : '❌',
							inline: true,
						},
						{
							name: 'Parent Section Id',
							value: data.parent_section_id ?? 'None',
							inline: true,
						},
						{
							name: 'Theme Template',
							value: data.theme_template,
							inline: true,
						},
					);

				webhooks.otherChanges.send({
					content: `<@&${roleIds.otherChanges}> <@&${roleIds.urlStuff}>`,
					embeds: [embed],
				});

				// Wait 3 seconds to prevent ratelimit
				await new Promise((resolve) => setTimeout(resolve, 3000));
			}

			for (let data of changed) {
				const embed = new EmbedMaker(client)
					.setColor(colors.yellow)
					.setTitle(`Updated ${title} Section`)
					.setFields(
						{
							name: 'Link',
							value: data.html_url,
							inline: false,
						},
						{
							name: 'Id',
							value: data.id.toString(),
							inline: true,
						},
						{
							name: 'Category Id',
							value: data.category_id.toString(),
							inline: true,
						},
						{
							name: 'Created At',
							value: `<t:${Math.floor(new Date(data.created_at).getTime() / 1000)}:R>`,
							inline: true,
						},
						{
							name: 'Updated At',
							value: `<t:${Math.floor(new Date(data.updated_at).getTime() / 1000)}:R>`,
							inline: true,
						},
						{
							name: 'Name',
							value: data.name,
							inline: true,
						},
						{
							name: 'Description',
							value: data.description === '' ? 'None' : data.description,
							inline: true,
						},
						{
							name: 'Outdated',
							value: data.outdated ? '✅' : '❌',
							inline: true,
						},
						{
							name: 'Parent Section Id',
							value: data.parent_section_id ?? 'None',
							inline: true,
						},
						{
							name: 'Theme Template',
							value: data.theme_template,
							inline: true,
						},
					);

				webhooks.otherChanges.send({
					content: `<@&${roleIds.otherChanges}> <@&${roleIds.urlStuff}>`,
					embeds: [embed],
				});

				// Wait 3 seconds to prevent ratelimit
				await new Promise((resolve) => setTimeout(resolve, 3000));
			}

			for (let data of removed) {
				const embed = new EmbedMaker(client)
					.setColor(colors.red)
					.setTitle(`Removed ${title} Section`)
					.setFields(
						{
							name: 'Link',
							value: data.html_url,
							inline: false,
						},
						{
							name: 'Id',
							value: data.id.toString(),
							inline: true,
						},
						{
							name: 'Category Id',
							value: data.category_id.toString(),
							inline: true,
						},
						{
							name: 'Created At',
							value: `<t:${Math.floor(new Date(data.created_at).getTime() / 1000)}:R>`,
							inline: true,
						},
						{
							name: 'Updated At',
							value: `<t:${Math.floor(new Date(data.updated_at).getTime() / 1000)}:R>`,
							inline: true,
						},
						{
							name: 'Name',
							value: data.name,
							inline: true,
						},
						{
							name: 'Description',
							value: data.description === '' ? 'None' : data.description,
							inline: true,
						},
						{
							name: 'Outdated',
							value: data.outdated ? '✅' : '❌',
							inline: true,
						},
						{
							name: 'Parent Section Id',
							value: data.parent_section_id ?? 'None',
							inline: true,
						},
						{
							name: 'Theme Template',
							value: data.theme_template,
							inline: true,
						},
					);

				webhooks.otherChanges.send({
					content: `<@&${roleIds.otherChanges}> <@&${roleIds.urlStuff}>`,
					embeds: [embed],
				});

				// Wait 3 seconds to prevent ratelimit
				await new Promise((resolve) => setTimeout(resolve, 3000));
			}

			logger('success', 'ARTICLE', 'Generated response for', `${file}.json`);
		}
	}
}

async function checkArticles() {
	try {
		await fetchSupportSections(
			'supportSections',
			'Support',
			'https://hammerandchisel.zendesk.com/api/v2/help_center/en-us/sections',
		);
		await fetchSupportSections(
			'creatorSupportSections',
			'Creator Support',
			'https://discordcreatorsupport.zendesk.com/api/v2/help_center/en-us/sections',
		);
		await fetchSupportSections(
			'developerSupportSections',
			'Developer Support',
			'https://discorddevs.zendesk.com/api/v2/help_center/en-us/sections',
		);
		await fetchSupportArticles(
			'supportArticles',
			'Support',
			'https://hammerandchisel.zendesk.com/api/v2/help_center/en-us/articles',
		);
		await fetchSupportArticles(
			'creatorSupportArticles',
			'Creator Support',
			'https://discordcreatorsupport.zendesk.com/api/v2/help_center/en-us/articles',
		);
		await fetchSupportArticles(
			'developerSupportArticles',
			'Developer Support',
			'https://discorddevs.zendesk.com/api/v2/help_center/en-us/articles',
		);
	} catch (error) {
		return logger(
			'error',
			'ARTICLE',
			'Error checking articles',
			`${error?.response?.status} ${error?.response?.statusText}\n`,
			error,
		);
	}
}

async function checkBlogPosts() {
	let oldBlogPosts = '';

	try {
		oldBlogPosts = readFileSync('blog/posts.json', 'utf-8');
	} catch (error) {
		try {
			writeFileSync('blog/posts.json', '[]');

			oldBlogPosts = readFileSync('blog/posts.json', 'utf-8');
			oldBlogPosts = JSON.parse(oldBlogPosts);
		} catch (error) {
			try {
				mkdirSync('blog');
				writeFileSync('blog/posts.json', '[]');

				oldBlogPosts = readFileSync('blog/posts.json', 'utf-8');
				oldBlogPosts = JSON.parse(oldBlogPosts);
			} catch (error) {
				return logger('error', 'BLOG', 'Error checking blog posts', '\n', error);
			}
		}
	}

	let blogPosts = (
		await axios.get('https://raw.githubusercontent.com/xHyroM/discord-datamining/master/data/blog/posts.json')
	).data;

	writeFileSync('blog/posts.json', JSON.stringify(blogPosts, null, 4));

	if (typeof oldBlogPosts === 'string') oldBlogPosts = JSON.parse(oldBlogPosts);
	if (oldBlogPosts.length === 0) return logger('success', 'BLOG', 'No blog posts found');

	logger('info', 'BLOG', 'Found', blogPosts.length, 'blog posts');

	let removed = [];
	let added = [];
	let changed = [];

	for (let data of blogPosts) {
		if (!oldBlogPosts.filter((s) => s.id === data.id)[0]) added.push(data);
	}

	for (let data of oldBlogPosts) {
		if (!blogPosts.filter((s) => s.id === data.id)[0]) removed.push(data);
	}

	for (let data of blogPosts) {
		if (
			oldBlogPosts.filter((s) => s.id === data.id)[0] &&
			(oldBlogPosts.filter((s) => s.id === data.id)[0].title !== data.title ||
				oldBlogPosts.filter((s) => s.id === data.id)[0].description !== data.description ||
				oldBlogPosts.filter((s) => s.id === data.id)[0].body !== data.body)
		)
			changed.push(data);
	}

	logger('success', 'BLOG', 'Generated diff for', 'posts.json');

	if (added.length > 0 || removed.length > 0 || changed.length > 0) {
		for (let data of added) {
			try {
				const embed = new EmbedMaker(client)
					.setColor(colors.green)
					.setTitle('Added Blog Post')
					.setFields(
						{
							name: 'Link',
							value: data.link.toString(),
							inline: false,
						},
						{
							name: 'Id',
							value: data.id.toString(),
							inline: true,
						},
						{
							name: 'Title',
							value: data.title.toString(),
							inline: true,
						},
						{
							name: 'Description',
							value: data.description.toString(),
							inline: false,
						},
						{
							name: 'Published At',
							value: `<t:${Math.floor(new Date(data.pubDate).getTime() / 1000)}:R>`,
							inline: true,
						},
					)
					.setImage(data['media:thumbnail']);

				embed.data.footer.text = 'Powered by xHyroM/discord-datamining';

				webhooks.otherChanges.send({
					content: `<@&${roleIds.otherChanges}> <@&${roleIds.urlStuff}>`,
					embeds: [embed],
				});
			} catch (error) {
				logger('error', 'BLOG', 'Error sending webhook', '\n', error, JSON.stringify(data, null, 4));
			}

			// Wait 3 seconds to prevent ratelimit
			await new Promise((resolve) => setTimeout(resolve, 3000));
		}

		for (let data of changed) {
			let diffBlogPostText = '';
			let diffBlogPost = diffLines(oldBlogPosts.filter((s) => s.id === data.id)[0].body, data.body).filter(
				(l) => l.added || l.removed,
			);

			diffBlogPostText = diffBlogPost
				.map((line) =>
					line.added
						? '+ ' +
						  line.value
								.split('\n')
								.filter((l) => l !== '')
								.join('\n+ ')
						: '- ' +
						  line.value
								.split('\n')
								.filter((l) => l !== '')
								.join('\n- '),
				)
				.join('\n');

			const embed = new EmbedMaker(client)
				.setColor(colors.yellow)
				.setTitle('Updated Blog Post')
				.setFields(
					{
						name: 'Link',
						value: data.link.toString(),
						inline: false,
					},
					{
						name: 'Id',
						value: data.id.toString(),
						inline: true,
					},
					{
						name: 'Title',
						value: data.title.toString(),
						inline: true,
					},
					{
						name: 'Description',
						value: data.description.toString(),
						inline: false,
					},
					{
						name: 'Published At',
						value: `<t:${Math.floor(new Date(data.pubDate).getTime() / 1000)}:R>`,
						inline: true,
					},
				)
				.setImage(data['media:thumbnail']);

			embed.data.footer.text = 'Powered by xHyroM/discord-datamining';

			if (diffBlogPost !== '') embed.setDescription(`\`\`\`diff\n${diffBlogPostText}\`\`\``);

			webhooks.otherChanges.send({
				content: `<@&${roleIds.otherChanges}> <@&${roleIds.urlStuff}>`,
				embeds: [embed],
			});

			// Wait 3 seconds to prevent ratelimit
			await new Promise((resolve) => setTimeout(resolve, 3000));
		}

		for (let data of removed) {
			const embed = new EmbedMaker(client)
				.setColor(colors.red)
				.setTitle('Removed Blog Post')
				.setFields(
					{
						name: 'Link',
						value: data.link.toString(),
						inline: false,
					},
					{
						name: 'Id',
						value: data.id.toString(),
						inline: true,
					},
					{
						name: 'Title',
						value: data.title.toString(),
						inline: true,
					},
					{
						name: 'Description',
						value: data.description.toString(),
						inline: false,
					},
					{
						name: 'Published At',
						value: `<t:${Math.floor(new Date(data.pubDate).getTime() / 1000)}:R>`,
						inline: true,
					},
				)
				.setImage(data['media:thumbnail']);

			embed.data.footer.text = 'Powered by xHyroM/discord-datamining';

			webhooks.otherChanges.send({
				content: `<@&${roleIds.otherChanges}> <@&${roleIds.urlStuff}>`,
				embeds: [embed],
			});

			// Wait 3 seconds to prevent ratelimit
			await new Promise((resolve) => setTimeout(resolve, 3000));
		}

		logger('success', 'ARTICLE', 'Generated response for', `posts.json`);
	}
}

async function checkSubdomains() {
	try {
		let oldSubdomains = '';

		try {
			oldSubdomains = JSON.parse(readFileSync('domain/subdomains.json'));
		} catch (error) {
			try {
				writeFileSync('domain/subdomains.json', '[]');

				oldSubdomains = JSON.parse(readFileSync('domain/subdomains.json'));
			} catch (error) {
				try {
					mkdirSync('domain');
					writeFileSync('domain/subdomains.json', '[]');

					oldSubdomains = JSON.parse(readFileSync('domain/subdomains.json'));
				} catch (error) {
					logger('error', 'SUBDOMAIN', 'Error while checking subdomains', '\n', error);
				}
			}
		}

		let subdomains = (
			await axios.get(
				'https://raw.githubusercontent.com/xHyroM/discord-datamining/master/data/domains/discord.com.json',
			)
		).data?.subdomains;

		writeFileSync('domain/subdomains.json', JSON.stringify(subdomains, null, 4));

		if (oldSubdomains === '') return logger('error', 'SUBDOMAIN', 'Subdomains empty');

		let added = subdomains.filter((s) => !oldSubdomains.includes(s));
		let removed = oldSubdomains.filter((s) => !subdomains.includes(s));

		if (added.length === 0 && removed.length === 0) return logger('warning', 'SUBDOMAIN', 'No subdomain changes');

		logger('info', 'SUBDOMAIN', 'Subdomain changes', `${added.length} added, ${removed.length} removed`);

		webhooks.otherChanges
			.send({
				content: `<@&${roleIds.otherChanges}> <@&${roleIds.urlStuff}>`,
				embeds: [
					new EmbedMaker(client)
						.setTitle('Subdomains')
						.setDescription(
							`\`\`\`diff\n${removed.map((s) => `- https://${s}.discord.com`).join('\n')}\n${added
								.map((s) => `+ https://${s}.discord.com`)
								.join('\n')}\n\`\`\``,
						)
						.setFooterText('Powered by xHyroM/discord-datamining'),
				],
			})
			.catch((error) => logger('error', 'SUBDOMAIN', 'Error while sending webhook', '\n', error));

		logger('success', 'SUBDOMAIN', 'Generated response for', 'subdomains.json');
	} catch (error) {
		logger('error', 'SUBDOMAIN', 'Error while checking subdomains', '\n', error?.rawError);
	}
}

async function check() {
	await checkArticles();
	await checkBlogPosts();
	await checkSubdomains();
}

client.on('ready', async () => {
	logger('info', 'BOT', 'Logged in as', client.user.tag);
	logger('info', 'COMMAND', 'Registering commands');

	axios
		.put(
			`https://discord.com/api/v10/applications/${client.user.id}/commands`,
			client.commands.map((command) => command.data.toJSON()),
			{
				headers: {
					'Content-Type': 'application/json',
					Authorization: `Bot ${process.env.DISCORD_TOKEN}`,
				},
			},
		)
		.then(() => logger('success', 'COMMAND', 'Registered commands'))
		.catch((error) =>
			logger(
				'error',
				'COMMAND',
				'Error while registering commands',
				`${error?.response?.status} ${error?.response?.statusText}\n`,
				JSON.stringify(error?.response?.data ?? error, null, 4),
			),
		);

	check();
	setInterval(check, 1000 * 60 * 5);
	checkFirstDayOfMonth();
});

client.on('interactionCreate', async interaction => {
    if (interaction.isCommand() || interaction.isContextMenuCommand()) {
        logger('debug', 'COMMAND', 'Received command', `${interaction.commandName} (${interaction.commandId})`, 'from', interaction.guild ? `${interaction.guild.name} (${interaction.guild.id})` : 'DMs', 'by', `${interaction.user.tag} (${interaction.user.id})`);

        const command = client.commands.get(interaction.commandName);

        if (!command) {
            logger('warning', 'COMMAND', 'Command ', interaction.commandName, 'not found');

            return interaction.reply({
                content: localize(interaction.locale, 'NOT_FOUND', 'Command'),
                ephemeral: true
            });
        };
        if (command.category === 'Owner' && interaction.user.id !== ownerId) {
            logger('debug', 'COMMAND', 'Command', interaction.commandName, 'blocked for', interaction.user.tag, 'because it is owner only');

            return interaction.reply({
                content: localize(interaction.locale, 'OWNER_ONLY'),
                ephemeral: true
            });
        };
        if (command.category === 'Developer' && !developerIds.includes(interaction.user.id) && interaction.user.id !== ownerId) {
            logger('debug', 'COMMAND', 'Command', interaction.commandName, 'blocked for', interaction.user.tag, 'because it is developer only');

            return interaction.reply({
                content: localize(interaction.locale, 'DEVELOPER_ONLY'),
                ephemeral: true
            });
        };

        try {
            await command.execute(interaction);
        } catch (error) {
            logger('error', 'COMMAND', 'Error while executing command:', `${error.message}\n`, error.stack);

            return interaction.reply({
                content: localize(interaction.locale, 'COMMAND_ERROR', 'command', error.message),
                ephemeral: true
            }).catch(() => interaction.editReply({
                content: localize(interaction.locale, 'COMMAND_ERROR', 'command', error.message)
            }).catch(() => logger('error', 'COMMAND', 'Error while sending error message', '\n', error)));
        };
    } else if (interaction.isMessageComponent()) {
        logger('debug', 'COMMAND', 'Received message component', `${interaction.customId} (${interaction.componentType})`, 'from', interaction.guild ? `${interaction.guild.name} (${interaction.guild.id})` : 'DMs', 'by', `${interaction.user.tag} (${interaction.user.id})`);

        try {
            let [userId, customId, ...args] = interaction.customId.split(':');
            let locale = interaction.locale;

            if (userId !== 'everyone' && userId !== interaction.user.id) return interaction.reply({
                content: localize(locale, 'COMPONENT_NOT_YOURS'),
                ephemeral: true
            });

            let guildId = interaction.guildId;

            const home = await new Home(guildId).setup();
            const automod = await new AutoMod(guildId).setup();
            const bugFixTools = await new BugFixTools(guildId).setup();

            switch (customId) {
                case 'settings':
                    switch (interaction.values[0]) {
                        case 'home':
                            await interaction.deferUpdate();

                            homeSettings(interaction, home, locale);
                            break;
                        case 'automod':
                            await interaction.deferUpdate();

                            automodSettings(interaction, automod, locale);
                            break;
                        case 'bugFixTools':
                            await interaction.deferUpdate();

                            bugFixToolsSettings(interaction, bugFixTools, locale);
                            break;
                    };
                    break;
                case 'home_setup':
                    await interaction.deferUpdate();

                    if (!interaction.member.permissions.has('ManageChannels')) return interaction.followUp({
                        content: localize(locale, 'USER_MISSING_PERMISSIONS', 'Manage Channels'),
                        ephemeral: true
                    });
                    if (!interaction.appPermissions.has('ManageChannels') || !interaction.appPermissions.has('ManageWebhooks') || !interaction.appPermissions.has('ManageMessages')) return interaction.followUp({
                        content: localize(interaction.locale, 'BOT_MISSING_PERMISSIONS', 'Manage Channels, Manage Webhooks, Manage Messages'),
                        ephemeral: true
                    });

                    await interaction.followUp({
                        content: 'Setting up home...',
                        ephemeral: true
                    });

                    let channel = await interaction.guild.channels.create({
                        type: ChannelType.GuildText,
                        name: 'home',
                        permissionOverwrites: [
                            {
                                id: interaction.guildId,
                                deny: PermissionFlagsBits.SendMessages
                            }
                        ]
                    });
                    let webhook = await channel.createWebhook({ name: 'home' });

                    channel.send('**There are no Highlights to show you yet!**\nBut you could write some!').catch(() => { });

                    await home.setChannel(channel.id);
                    await home.setWebhook(webhook.url);
                    await home.toggle();
                    await interaction.followUp({
                        content: localize(locale, 'HOME_SETUP_SUCCESS', `<#${channel.id}>`),
                        ephemeral: true
                    });

                    homeSettings(interaction, home, locale);
                    break;
                case 'home_toggle':
                    await interaction.deferUpdate();
                    await home.toggle();
                    await interaction.followUp({
                        content: localize(locale, `SETTING_${home.data.enabled ? 'ENABLE' : 'DISABLE'}_SUCCESS`, localize(locale, 'HOME')),
                        ephemeral: true
                    });

                    homeSettings(interaction, home, locale);
                    break;
                case 'home_channel':
                    interaction.update({
                        embeds: [],
                        components: [
                            new ActionRowBuilder()
                                .setComponents(
                                    new ChannelSelectMenuBuilder()
                                        .setCustomId(`${interaction.user.id}:home_channel_select`)
                                        .setPlaceholder(localize(locale, 'CHANNEL_SELECT'))
                                        .setChannelTypes(ChannelType.GuildText)
                                )
                        ]
                    });
                    break;
                case 'home_channel_select':
                    await interaction.deferUpdate();

                    let channelId = interaction.values[0];
                    let webhook2 = await client.channels.cache.get(channelId).createWebhook({ name: 'home' });

                    client.channels.cache.get(channelId).send('**There are no Highlights to show you yet!**\nBut you could write some!').catch(() => { });

                    await home.setChannel(channelId);
                    await home.setWebhook(webhook2.url);
                    await interaction.followUp({
                        content: localize(locale, 'SETTING_CHANNEL_SUCCESS', localize(locale, 'HOME'), `<#${channelId}>`),
                        ephemeral: true
                    });

                    homeSettings(interaction, home, locale);
                    break;
                case 'home_reset':
                    await interaction.deferUpdate();
                    await home.delete();
                    await interaction.editReply({
                        content: localize(locale, 'SETTING_RESET_SUCCESS', localize(locale, 'HOME')),
                        ephemeral: true
                    });

                    homeSettings(interaction, home, locale);
                    break;
                case 'home_min_interactions':
                    interaction.showModal(
                        new ModalBuilder()
                            .setCustomId(`home_min_interactions_modal:${guildId}`)
                            .setTitle(localize(locale, 'SET_MIN_INTERACTIONS'))
                            .setComponents(
                                new ActionRowBuilder()
                                    .setComponents(
                                        new TextInputBuilder()
                                            .setCustomId('count')
                                            .setLabel(localize(locale, 'MIN_INTERACTIONS'))
                                            .setPlaceholder('5')
                                            .setValue(home.data.minInteractions.toString())
                                            .setRequired(true)
                                            .setMinLength(1)
                                            .setMaxLength(2)
                                            .setStyle(TextInputStyle.Short)
                                    )
                            )
                    );
                    break;
                case 'automod_configure':
                    await interaction.deferUpdate();

                    let category2 = interaction.values[0];

                    if (category2 === 'ai') automodAIConfigure(interaction, automod, locale);
                    else if (category2 === 'bad_content') automodBadContentConfigure(interaction, automod, locale);
                    else if (category2 === 'toxic_content') automodToxicContentConfigure(interaction, automod, locale);
                    break;
                case 'automod_ai_sync_rules':
                    await interaction.deferUpdate();

                    if (!interaction.memberPermissions.has('ManageMessages')) return interaction.followUp({
                        content: localize(locale, 'USER_MISSING_PERMISSIONS', 'Manage Messages'),
                        ephemeral: true
                    });

                    await interaction.followUp({
                        content: localize(locale, 'SYNCING_RULES'),
                        ephemeral: true
                    });

                    let rulesChannel2 = interaction.guild.rulesChannel;
                    let messages2 = await rulesChannel2.messages.fetch({ limit: 50 });
                    let rules;

                    try {
                        rules = (await axios.post('https://beta.purgpt.xyz/openai/chat/completions', {
                            model: 'gpt-3.5-turbo-16k',
                            messages: [
                                {
                                    role: 'system',
                                    content: 'You have to return with an array of rules. Nothing else. Do not include if something is not a rule. Do not break the order of the rules.'
                                },
                                {
                                    role: 'user',
                                    content: '* No spamming\n2. No NSFW\n:three: No advertising\n* No harassment\nblablabla hey\nPing @Cat'
                                },
                                {
                                    role: 'assistant',
                                    content: '["No spamming", "No NSFW", "No advertising", "No harassment", "Ping @Cat"]'
                                },
                                {
                                    role: 'user',
                                    content: messages2.filter(m => m.content || m.embeds[0]?.description).map(m => m.content === '' ? m.embeds[0]?.description : '').join('\n')
                                }
                            ]
                        }, {
                            headers: {
                                'Content-Type': 'application/json',
                                Authorization: `Bearer ${automod.data.purgptKey ?? process.env.PURGPT_API_KEY}`
                            },
                            timeout: 20000
                        })).data.choices[0].message.content;
                        rules = JSON.parse(rules);
                    } catch (error) {
                        logger('error', 'AUTOMOD', 'Failed to sync rules with AI:', error);

                        return interaction.followUp({
                            content: localize(locale, 'SYNC_RULES_ERROR'),
                            ephemeral: true
                        });
                    };

                    await automod.syncAIRules(rules);
                    await interaction.followUp({
                        content: localize(locale, 'SYNC_RULES_SUCCESS'),
                        ephemeral: true
                    });

                    automodAIConfigure(interaction, automod, locale);
                    break;
                case 'automod_toggle':
                    await interaction.deferUpdate();

                    let category = args[0];

                    await automod.toggle(category);
                    await interaction.followUp({
                        content: localize(locale, `AUTOMOD_${category.toLocaleUpperCase()}_${automod.data[category].enabled ? 'ENABLE' : 'DISABLE'}_SUCCESS`, localize(locale, 'AUTOMOD')),
                        ephemeral: true
                    });

                    automodSettings(interaction, automod, locale);
                    break;
                case 'automod_reset':
                    await interaction.deferUpdate();
                    await automod.delete();
                    await interaction.followUp({
                        content: localize(locale, 'SETTING_RESET_SUCCESS', localize(locale, 'AUTOMOD')),
                        ephemeral: true
                    });

                    automodSettings(interaction, automod, locale);
                    break;
                case 'automod_ai_alert_channel':
                    if (!interaction.memberPermissions.has('ManageChannels')) return interaction.followUp({
                        content: localize(locale, 'USER_MISSING_PERMISSIONS', 'Manage Channels'),
                        ephemeral: true
                    });

                    interaction.update({
                        embeds: [],
                        components: [
                            new ActionRowBuilder()
                                .setComponents(
                                    new ChannelSelectMenuBuilder()
                                        .setCustomId(`${interaction.user.id}:automod_ai_alert_channel_select`)
                                        .setPlaceholder(localize(locale, 'CHANNEL_SELECT'))
                                        .setChannelTypes(ChannelType.GuildText)
                                )
                        ]
                    });
                    break;
                case 'automod_ai_alert_channel_select':
                    await interaction.deferUpdate();

                    let channelId2 = interaction.values[0];

                    await automod.setAIAlertChannel(channelId2);
                    await interaction.followUp({
                        content: localize(locale, 'SETTING_SUCCESS', localize(locale, 'ALERT_CHANNEL'), `<#${channelId2}>`),
                        ephemeral: true
                    });

                    automodAIConfigure(interaction, automod, locale);
                    break;
                case 'automod_bad_content_alert_channel':
                    if (!interaction.memberPermissions.has('ManageChannels')) return interaction.followUp({
                        content: localize(locale, 'USER_MISSING_PERMISSIONS', 'Manage Channels'),
                        ephemeral: true
                    });

                    interaction.update({
                        embeds: [],
                        components: [
                            new ActionRowBuilder()
                                .setComponents(
                                    new ChannelSelectMenuBuilder()
                                        .setCustomId(`${interaction.user.id}:automod_bad_content_alert_channel_select`)
                                        .setPlaceholder(localize(locale, 'CHANNEL_SELECT'))
                                        .setChannelTypes(ChannelType.GuildText)
                                )
                        ]
                    });
                    break;
                case 'automod_toxic_content_alert_channel':
                    if (!interaction.memberPermissions.has('ManageChannels')) return interaction.followUp({
                        content: localize(locale, 'USER_MISSING_PERMISSIONS', 'Manage Channels'),
                        ephemeral: true
                    });

                    interaction.update({
                        embeds: [],
                        components: [
                            new ActionRowBuilder()
                                .setComponents(
                                    new ChannelSelectMenuBuilder()
                                        .setCustomId(`${interaction.user.id}:automod_toxic_content_alert_channel_select`)
                                        .setPlaceholder(localize(locale, 'CHANNEL_SELECT'))
                                        .setChannelTypes(ChannelType.GuildText)
                                )
                        ]
                    });
                    break;
                case 'automod_bad_content_alert_channel_select':
                    await interaction.deferUpdate();

                    let channelId3 = interaction.values[0];

                    await automod.setBadContentAlertChannel(channelId3);
                    await interaction.followUp({
                        content: localize(locale, 'SETTING_SUCCESS', localize(locale, 'ALERT_CHANNEL'), `<#${channelId3}>`),
                        ephemeral: true
                    });

                    automodBadContentConfigure(interaction, automod, locale);
                    break;
                case 'automod_toxic_content_alert_channel_select':
                    await interaction.deferUpdate();

                    let channelId4 = interaction.values[0];

                    await automod.setToxicContentAlertChannel(channelId4);
                    await interaction.followUp({
                        content: localize(locale, 'SETTING_SUCCESS', localize(locale, 'ALERT_CHANNEL'), `<#${channelId4}>`),
                        ephemeral: true
                    });

                    automodToxicContentConfigure(interaction, automod, locale);
                    break;
                case 'automod_ai_model':
                    interaction.update({
                        content: localize(locale, 'AI_MODEL_KEY'),
                        embeds: [],
                        components: [
                            new ActionRowBuilder()
                                .setComponents(
                                    new ButtonBuilder()
                                        .setCustomId(`${interaction.user.id}:automod_ai_model_set_key`)
                                        .setEmoji(emojis.important.split(':')[2].replace('>', ''))
                                        .setLabel(localize(locale, 'SET_KEY'))
                                        .setStyle(ButtonStyle.Primary)
                                )
                        ]
                    });
                    break;
                case 'automod_ai_model_key':
                    interaction.update({
                        embeds: [],
                        components: [
                            new ActionRowBuilder()
                                .setComponents(
                                    new StringSelectMenuBuilder()
                                        .setCustomId(`${interaction.user.id}:automod_ai_model_key_select`)
                                        .setPlaceholder(localize(locale, 'SELECT_MODEL'))
                                        .setOptions(
                                            new StringSelectMenuOptionBuilder()
                                                .setLabel('gpt-4-32k-0613')
                                                .setDescription('by OpenAI')
                                                .setValue('openai:gpt-4-32k-0613')
                                                .setDefault(automod.data.ai.model.name === 'gpt-4-32k-0613'),
                                            new StringSelectMenuOptionBuilder()
                                                .setLabel('gpt-4-32k')
                                                .setDescription('by OpenAI')
                                                .setValue('openai:gpt-4-32k')
                                                .setDefault(automod.data.ai.model.name === 'gpt-4-32k'),
                                            new StringSelectMenuOptionBuilder()
                                                .setLabel('gpt-4-0613')
                                                .setDescription('by OpenAI')
                                                .setValue('openai:gpt-4-0613')
                                                .setDefault(automod.data.ai.model.name === 'gpt-4-0613'),
                                            new StringSelectMenuOptionBuilder()
                                                .setLabel('gpt-4-0314')
                                                .setDescription('by OpenAI')
                                                .setValue('openai:gpt-4-0314')
                                                .setDefault(automod.data.ai.model.name === 'gpt-4-0314'),
                                            new StringSelectMenuOptionBuilder()
                                                .setLabel('gpt-4')
                                                .setDescription('by OpenAI')
                                                .setValue('openai:gpt-4')
                                                .setDefault(automod.data.ai.model.name === 'gpt-4'),
                                            new StringSelectMenuOptionBuilder()
                                                .setLabel('gpt-3.5-turbo-16k-0613')
                                                .setDescription('by OpenAI')
                                                .setValue('openai:gpt-3.5-turbo-16k-0613')
                                                .setDefault(automod.data.ai.model.name === 'gpt-3.5-turbo-16k-0613'),
                                            new StringSelectMenuOptionBuilder()
                                                .setLabel('gpt-3.5-turbo-16k')
                                                .setDescription('by OpenAI')
                                                .setValue('openai:gpt-3.5-turbo-16k')
                                                .setDefault(automod.data.ai.model.name === 'gpt-3.5-turbo-16k'),
                                            new StringSelectMenuOptionBuilder()
                                                .setLabel('gpt-3.5-turbo-0613')
                                                .setDescription('by OpenAI')
                                                .setValue('openai:gpt-3.5-turbo-0613')
                                                .setDefault(automod.data.ai.model.name === 'gpt-3.5-turbo-0613'),
                                            new StringSelectMenuOptionBuilder()
                                                .setLabel('gpt-3.5-turbo')
                                                .setDescription('by OpenAI')
                                                .setValue('openai:gpt-3.5-turbo')
                                                .setDefault(automod.data.ai.model.name === 'gpt-3.5-turbo'),
                                            new StringSelectMenuOptionBuilder()
                                                .setLabel('text-davinci-003')
                                                .setDescription('by OpenAI')
                                                .setValue('openai:text-davinci-003')
                                                .setDefault(automod.data.ai.model.name === 'text-davinci-003'),
                                            new StringSelectMenuOptionBuilder()
                                                .setLabel('chat-bison-001')
                                                .setDescription('by OpenAI')
                                                .setValue('openai:chat-bison-001')
                                                .setDefault(automod.data.ai.model.name === 'chat-bison-001'),
                                            new StringSelectMenuOptionBuilder()
                                                .setLabel('claude-2')
                                                .setDescription('by Anthropic')
                                                .setValue('anthropic:claude-2')
                                                .setDefault(automod.data.ai.model.name === 'claude-2'),
                                            new StringSelectMenuOptionBuilder()
                                                .setLabel('claude-1')
                                                .setDescription('by Anthropic')
                                                .setValue('anthropic:claude-1')
                                                .setDefault(automod.data.ai.model.name === 'claude-1'),
                                            new StringSelectMenuOptionBuilder()
                                                .setLabel('claude-instant-1')
                                                .setDescription('by Anthropic')
                                                .setValue('anthropic:claude-instant-1')
                                                .setDefault(automod.data.ai.model.name === 'claude-instant-1'),
                                            new StringSelectMenuOptionBuilder()
                                                .setLabel('llama-2-70b-chat')
                                                .setDescription('by Llama')
                                                .setValue('llama:llama-2-70b-chat')
                                                .setDefault(automod.data.ai.model.name === 'llama-2-70b-chat'),
                                            new StringSelectMenuOptionBuilder()
                                                .setLabel('llama-2-13b-chat')
                                                .setDescription('by Llama')
                                                .setValue('llama:llama-2-13b-chat')
                                                .setDefault(automod.data.ai.model.name === 'llama-2-13b-chat'),
                                            new StringSelectMenuOptionBuilder()
                                                .setLabel('llama-2-7b-chat')
                                                .setDescription('by Llama')
                                                .setValue('llama:llama-2-7b-chat')
                                                .setDefault(automod.data.ai.model.name === 'llama-2-7b-chat'),
                                            new StringSelectMenuOptionBuilder()
                                                .setLabel('bing')
                                                .setDescription('by Microsoft')
                                                .setValue('microsoft:bing')
                                                .setDefault(automod.data.ai.model.name === 'bing'),
                                            new StringSelectMenuOptionBuilder()
                                                .setLabel('you-chat')
                                                .setDescription('by You')
                                                .setValue('you:you-chat')
                                                .setDefault(automod.data.ai.model.name === 'you-chat'),
                                            new StringSelectMenuOptionBuilder()
                                                .setLabel('flan-t5-xxl')
                                                .setDescription('by Vercel')
                                                .setValue('vercel:flan-t5-xxl')
                                                .setDefault(automod.data.ai.model.name === 'flan-t5-xxl'),
                                        )
                                )
                        ]
                    });
                    break;
                case 'automod_bad_content_model_key':
                    interaction.update({
                        embeds: [],
                        components: [
                            new ActionRowBuilder()
                                .setComponents(
                                    new StringSelectMenuBuilder()
                                        .setCustomId(`${interaction.user.id}:automod_bad_content_model_key_select`)
                                        .setPlaceholder(localize(locale, 'SELECT_MODEL'))
                                        .setOptions(
                                            new StringSelectMenuOptionBuilder()
                                                .setLabel('text-moderation-latest')
                                                .setDescription('by OpenAI')
                                                .setValue('openai:text-moderation-latest')
                                                .setDefault(automod.data.badContent.model.name === 'text-moderation-latest'),
                                            new StringSelectMenuOptionBuilder()
                                                .setLabel('text-moderation-stable')
                                                .setDescription('by OpenAI')
                                                .setValue('openai:text-moderation-stable')
                                                .setDefault(automod.data.badContent.model.name === 'text-moderation-stable'),
                                        )
                                )
                        ]
                    });
                    break;
                case 'automod_toxic_content_model_key':
                    interaction.update({
                        embeds: [],
                        components: [
                            new ActionRowBuilder()
                                .setComponents(
                                    new StringSelectMenuBuilder()
                                        .setCustomId(`${interaction.user.id}:automod_toxic_content_model_key_select`)
                                        .setPlaceholder(localize(locale, 'SELECT_MODEL'))
                                        .setOptions(
                                            new StringSelectMenuOptionBuilder()
                                                .setLabel('perspective-v1alpha1')
                                                .setDescription('by Google')
                                                .setValue('google:perspective-v1alpha1')
                                                .setDefault(automod.data.toxicContent.model.name === 'perspective-v1alpha1'),
                                            new StringSelectMenuOptionBuilder()
                                                .setLabel('perspective-v1')
                                                .setDescription('by Google')
                                                .setValue('google:perspective-v1')
                                                .setDefault(automod.data.toxicContent.model.name === 'perspective-v1'),
                                        )
                                )
                        ]
                    });
                    break;
                case 'automod_ai_model_key_select':
                    await interaction.deferUpdate();

                    let [owner, model] = interaction.values[0].split(':');

                    await automod.setAIModel(model, owner);
                    await interaction.followUp({
                        content: localize(locale, 'AUTOMOD_AI_MODEL_SET_SUCCESS', model),
                        ephemeral: true
                    });

                    automodAIConfigure(interaction, automod, locale);
                    break;
                case 'automod_bad_content_model_key_select':
                    await interaction.deferUpdate();

                    let [owner2, model2] = interaction.values[0].split(':');

                    await automod.setBadContentModel(model2, owner2);
                    await interaction.followUp({
                        content: localize(locale, 'BAD_CONTENT_AI_MODEL_SET_SUCCESS', model2),
                        ephemeral: true
                    });

                    automodBadContentConfigure(interaction, automod, locale);
                    break;
                case 'automod_toxic_content_model_key_select':
                    await interaction.deferUpdate();

                    let [owner3, model3] = interaction.values[0].split(':');

                    await automod.setToxicContentModel(model3, owner3);
                    await interaction.followUp({
                        content: localize(locale, 'TOXIC_CONTENT_AI_MODEL_SET_SUCCESS', model3),
                        ephemeral: true
                    });

                    automodToxicContentConfigure(interaction, automod, locale);
                    break;
                case 'automod_ai_model_set_key':
                    interaction.showModal(
                        new ModalBuilder()
                            .setCustomId('automod_ai_model_set_key_modal')
                            .setTitle(localize(locale, 'SET_KEY'))
                            .setComponents(
                                new ActionRowBuilder()
                                    .setComponents(
                                        new TextInputBuilder()
                                            .setCustomId('key')
                                            .setLabel(localize(locale, 'API_KEY'))
                                            .setPlaceholder('purgpt-XXXXXX')
                                            .setRequired(false)
                                            .setStyle(TextInputStyle.Short)
                                    )
                            )
                    );
                    break;
                case 'automod_ai_toggle_fallbacks':
                    await interaction.deferUpdate();
                    await automod.toggleAIFallbacks();
                    await interaction.followUp({
                        content: localize(locale, `${automod.data.ai.allowFallbacks ? 'ENABLE' : 'DISABLE'}_FALLBACKS_SUCCESS`),
                        ephemeral: true
                    });

                    automodAIConfigure(interaction, automod, locale);
                    break;
                case 'automod_ai_test':
                    interaction.showModal(
                        new ModalBuilder()
                            .setCustomId('automod_ai_test_modal')
                            .setTitle(localize(locale, 'TEST'))
                            .setComponents(
                                new ActionRowBuilder()
                                    .setComponents(
                                        new TextInputBuilder()
                                            .setCustomId('message')
                                            .setLabel(localize(locale, 'TEST_MESSAGE'))
                                            .setStyle(TextInputStyle.Paragraph)
                                            .setRequired(true)
                                    )
                            )
                    );
                    break;
                case 'automod_bad_content_test':
                    interaction.showModal(
                        new ModalBuilder()
                            .setCustomId('automod_bad_content_test_modal')
                            .setTitle(localize(locale, 'TEST'))
                            .setComponents(
                                new ActionRowBuilder()
                                    .setComponents(
                                        new TextInputBuilder()
                                            .setCustomId('message')
                                            .setLabel(localize(locale, 'TEST_MESSAGE'))
                                            .setStyle(TextInputStyle.Paragraph)
                                            .setRequired(true)
                                    )
                            )
                    );
                    break;
                case 'automod_toxic_content_test':
                    interaction.showModal(
                        new ModalBuilder()
                            .setCustomId('automod_toxic_content_test_modal')
                            .setTitle(localize(locale, 'TEST'))
                            .setComponents(
                                new ActionRowBuilder()
                                    .setComponents(
                                        new TextInputBuilder()
                                            .setCustomId('message')
                                            .setLabel(localize(locale, 'TEST_MESSAGE'))
                                            .setStyle(TextInputStyle.Paragraph)
                                            .setRequired(true)
                                    )
                            )
                    );
                    break;
                case 'automod_ai_add_rule':
                    if (!interaction.memberPermissions.has('ManageMessages')) return interaction.reply({
                        content: localize(locale, 'USER_MISSING_PERMISSIONS', 'Manage Messages'),
                        ephemeral: true
                    });

                    interaction.showModal(
                        new ModalBuilder()
                            .setCustomId('automod_ai_add_rule_modal')
                            .setTitle(localize(locale, 'ADD_RULE'))
                            .setComponents(
                                new ActionRowBuilder()
                                    .setComponents(
                                        new TextInputBuilder()
                                            .setCustomId('rule')
                                            .setLabel(localize(locale, 'RULE'))
                                            .setPlaceholder('No swearing allowed.')
                                            .setRequired(true)
                                            .setStyle(TextInputStyle.Paragraph)
                                    )
                            )
                    );
                    break;
                case 'automod_ai_remove_rule':
                    if (!interaction.memberPermissions.has('ManageMessages')) return interaction.reply({
                        content: localize(locale, 'USER_MISSING_PERMISSIONS', 'Manage Messages'),
                        ephemeral: true
                    });

                    interaction.showModal(
                        new ModalBuilder()
                            .setCustomId('automod_ai_remove_rule_modal')
                            .setTitle(localize(locale, 'REMOVE_RULE'))
                            .setComponents(
                                new ActionRowBuilder()
                                    .setComponents(
                                        new TextInputBuilder()
                                            .setCustomId('rule')
                                            .setLabel(localize(locale, 'RULE_INDEX'))
                                            .setPlaceholder('1')
                                            .setRequired(true)
                                            .setMinLength(1)
                                            .setMaxLength(2)
                                            .setStyle(TextInputStyle.Short)
                                    )
                            )
                    );
                    break;
                case 'automod_ai_add_blacklist_roles':
                    if (!interaction.memberPermissions.has('ManageRoles')) return interaction.reply({
                        content: localize(locale, 'USER_MISSING_PERMISSIONS', 'Manage Roles'),
                        ephemeral: true
                    });

                    interaction.update({
                        embeds: [],
                        components: [
                            new ActionRowBuilder()
                                .setComponents(
                                    new RoleSelectMenuBuilder()
                                        .setCustomId(`${interaction.user.id}:automod_ai_add_blacklist_roles_select`)
                                        .setPlaceholder(localize(locale, 'ROLES_SELECT'))
                                        .setMaxValues(interaction.guild.roles.cache.size > 25 ? 25 : interaction.guild.roles.cache.size)
                                )
                        ]
                    });
                    break;
                case 'automod_ai_add_blacklist_roles_select':
                    await interaction.deferUpdate();

                    let roleIds = interaction.values;

                    await automod.addBlacklistRoles('ai', roleIds);
                    await interaction.followUp({
                        content: localize(locale, 'ADD_BLACKLIST_ROLES_SUCCESS', roleIds.map(id => `<@&${id}>`).join(', ')),
                        ephemeral: true
                    });

                    automodAIConfigure(interaction, automod, locale);
                    break;
                case 'automod_ai_remove_blacklist_roles':
                    if (!interaction.memberPermissions.has('ManageRoles')) return interaction.reply({
                        content: localize(locale, 'USER_MISSING_PERMISSIONS', 'Manage Roles'),
                        ephemeral: true
                    });

                    interaction.update({
                        embeds: [],
                        components: [
                            new ActionRowBuilder()
                                .setComponents(
                                    new RoleSelectMenuBuilder()
                                        .setCustomId(`${interaction.user.id}:automod_ai_remove_blacklist_roles_select`)
                                        .setPlaceholder(localize(locale, 'ROLES_SELECT'))
                                        .setMaxValues(interaction.guild.roles.cache.size > 25 ? 25 : interaction.guild.roles.cache.size)
                                )
                        ]
                    });
                    break;
                case 'automod_ai_remove_blacklist_roles_select':
                    await interaction.deferUpdate();

                    let roleIds2 = interaction.values;

                    await automod.removeBlacklistRoles('ai', roleIds2);
                    await interaction.followUp({
                        content: localize(locale, 'REMOVE_BLACKLIST_ROLES_SUCCESS', roleIds2.map(id => `<@&${id}>`).join(', ')),
                        ephemeral: true
                    });

                    automodAIConfigure(interaction, automod, locale);
                    break;
                case 'automod_ai_add_blacklist_channels':
                    if (!interaction.memberPermissions.has('ManageChannels')) return interaction.reply({
                        content: localize(locale, 'USER_MISSING_PERMISSIONS', 'Manage Channels'),
                        ephemeral: true
                    });

                    interaction.update({
                        embeds: [],
                        components: [
                            new ActionRowBuilder()
                                .setComponents(
                                    new ChannelSelectMenuBuilder()
                                        .setCustomId(`${interaction.user.id}:automod_ai_add_blacklist_channels_select`)
                                        .setPlaceholder(localize(locale, 'CHANNELS_SELECT'))
                                        .setMaxValues(interaction.guild.channels.cache.size > 25 ? 25 : interaction.guild.channels.cache.size)
                                        .setChannelTypes(ChannelType.GuildText, ChannelType.GuildForum, ChannelType.GuildCategory)
                                )
                        ]
                    });
                    break;
                case 'automod_ai_add_blacklist_channels_select':
                    await interaction.deferUpdate();

                    let channelIds = interaction.values;

                    await automod.addBlacklistChannels('ai', channelIds);
                    await interaction.followUp({
                        content: localize(locale, 'ADD_BLACKLIST_CHANNELS_SUCCESS', channelIds.map(id => `<#${id}>`).join(', ')),
                        ephemeral: true
                    });

                    automodAIConfigure(interaction, automod, locale);
                    break;
                case 'automod_ai_remove_blacklist_channels':
                    if (!interaction.memberPermissions.has('ManageChannels')) return interaction.reply({
                        content: localize(locale, 'USER_MISSING_PERMISSIONS', 'Manage Channels'),
                        ephemeral: true
                    });

                    interaction.update({
                        embeds: [],
                        components: [
                            new ActionRowBuilder()
                                .setComponents(
                                    new ChannelSelectMenuBuilder()
                                        .setCustomId(`${interaction.user.id}:automod_ai_remove_blacklist_channels_select`)
                                        .setPlaceholder(localize(locale, 'CHANNELS_SELECT'))
                                        .setMaxValues(interaction.guild.channels.cache.size > 25 ? 25 : interaction.guild.channels.cache.size)
                                        .setChannelTypes(ChannelType.GuildText, ChannelType.GuildForum, ChannelType.GuildCategory)
                                )
                        ]
                    });
                    break;
                case 'automod_ai_remove_blacklist_channels_select':
                    await interaction.deferUpdate();

                    let channelIds2 = interaction.values;

                    await automod.removeBlacklistChannels('ai', channelIds2);
                    await interaction.followUp({
                        content: localize(locale, 'REMOVE_BLACKLIST_CHANNELS_SUCCESS', channelIds2.map(id => `<#${id}>`).join(', ')),
                        ephemeral: true
                    });

                    automodAIConfigure(interaction, automod, locale);
                    break;
                case 'automod_bad_content_add_blacklist_roles':
                    if (!interaction.memberPermissions.has('ManageRoles')) return interaction.reply({
                        content: localize(locale, 'USER_MISSING_PERMISSIONS', 'Manage Roles'),
                        ephemeral: true
                    });

                    interaction.update({
                        embeds: [],
                        components: [
                            new ActionRowBuilder()
                                .setComponents(
                                    new RoleSelectMenuBuilder()
                                        .setCustomId(`${interaction.user.id}:automod_bad_content_add_blacklist_roles_select`)
                                        .setPlaceholder(localize(locale, 'ROLES_SELECT'))
                                        .setMaxValues(interaction.guild.roles.cache.size > 25 ? 25 : interaction.guild.roles.cache.size)
                                )
                        ]
                    });
                    break;
                case 'automod_toxic_content_add_blacklist_roles':
                    if (!interaction.memberPermissions.has('ManageRoles')) return interaction.reply({
                        content: localize(locale, 'USER_MISSING_PERMISSIONS', 'Manage Roles'),
                        ephemeral: true
                    });

                    interaction.update({
                        embeds: [],
                        components: [
                            new ActionRowBuilder()
                                .setComponents(
                                    new RoleSelectMenuBuilder()
                                        .setCustomId(`${interaction.user.id}:automod_toxic_content_add_blacklist_roles_select`)
                                        .setPlaceholder(localize(locale, 'ROLES_SELECT'))
                                        .setMaxValues(interaction.guild.roles.cache.size > 25 ? 25 : interaction.guild.roles.cache.size)
                                )
                        ]
                    });
                    break;
                case 'automod_bad_content_add_blacklist_roles_select':
                    await interaction.deferUpdate();

                    let roleIds3 = interaction.values;

                    await automod.addBlacklistRoles('badContent', roleIds3);
                    await interaction.followUp({
                        content: localize(locale, 'ADD_BLACKLIST_ROLES_SUCCESS', roleIds3.map(id => `<@&${id}>`).join(', ')),
                        ephemeral: true
                    });

                    automodBadContentConfigure(interaction, automod, locale);
                    break;
                case 'automod_toxic_content_add_blacklist_roles_select':
                    await interaction.deferUpdate();

                    let roleIds5 = interaction.values;

                    await automod.addBlacklistRoles('toxicContent', roleIds5);
                    await interaction.followUp({
                        content: localize(locale, 'ADD_BLACKLIST_ROLES_SUCCESS', roleIds5.map(id => `<@&${id}>`).join(', ')),
                        ephemeral: true
                    });

                    automodToxicContentConfigure(interaction, automod, locale);
                    break;
                case 'automod_bad_content_remove_blacklist_roles':
                    if (!interaction.memberPermissions.has('ManageRoles')) return interaction.reply({
                        content: localize(locale, 'USER_MISSING_PERMISSIONS', 'Manage Roles'),
                        ephemeral: true
                    });

                    interaction.update({
                        embeds: [],
                        components: [
                            new ActionRowBuilder()
                                .setComponents(
                                    new RoleSelectMenuBuilder()
                                        .setCustomId(`${interaction.user.id}:automod_bad_content_remove_blacklist_roles_select`)
                                        .setPlaceholder(localize(locale, 'ROLES_SELECT'))
                                        .setMaxValues(interaction.guild.roles.cache.size > 25 ? 25 : interaction.guild.roles.cache.size)
                                )
                        ]
                    });
                    break;
                case 'automod_toxic_content_remove_blacklist_roles':
                    if (!interaction.memberPermissions.has('ManageRoles')) return interaction.reply({
                        content: localize(locale, 'USER_MISSING_PERMISSIONS', 'Manage Roles'),
                        ephemeral: true
                    });

                    interaction.update({
                        embeds: [],
                        components: [
                            new ActionRowBuilder()
                                .setComponents(
                                    new RoleSelectMenuBuilder()
                                        .setCustomId(`${interaction.user.id}:automod_toxic_content_remove_blacklist_roles_select`)
                                        .setPlaceholder(localize(locale, 'ROLES_SELECT'))
                                        .setMaxValues(interaction.guild.roles.cache.size > 25 ? 25 : interaction.guild.roles.cache.size)
                                )
                        ]
                    });
                    break;
                case 'automod_bad_content_remove_blacklist_roles_select':
                    await interaction.deferUpdate();

                    let roleIds4 = interaction.values;

                    await automod.removeBlacklistRoles('toxicContent', roleIds4);
                    await interaction.followUp({
                        content: localize(locale, 'REMOVE_BLACKLIST_ROLES_SUCCESS', roleIds4.map(id => `<@&${id}>`).join(', ')),
                        ephemeral: true
                    });

                    automodToxicContentConfigure(interaction, automod, locale);
                    break;
                case 'automod_toxic_content_remove_blacklist_roles_select':
                    await interaction.deferUpdate();

                    let roleIds6 = interaction.values;

                    await automod.removeBlacklistRoles('toxicContent', roleIds6);
                    await interaction.followUp({
                        content: localize(locale, 'REMOVE_BLACKLIST_ROLES_SUCCESS', roleIds6.map(id => `<@&${id}>`).join(', ')),
                        ephemeral: true
                    });

                    automodBadContentConfigure(interaction, automod, locale);
                    break;
                case 'automod_bad_content_add_blacklist_channels':
                    if (!interaction.memberPermissions.has('ManageChannels')) return interaction.reply({
                        content: localize(locale, 'USER_MISSING_PERMISSIONS', 'Manage Channels'),
                        ephemeral: true
                    });

                    interaction.update({
                        embeds: [],
                        components: [
                            new ActionRowBuilder()
                                .setComponents(
                                    new ChannelSelectMenuBuilder()
                                        .setCustomId(`${interaction.user.id}:automod_bad_content_add_blacklist_channels_select`)
                                        .setPlaceholder(localize(locale, 'CHANNELS_SELECT'))
                                        .setMaxValues(interaction.guild.channels.cache.size > 25 ? 25 : interaction.guild.channels.cache.size)
                                        .setChannelTypes(ChannelType.GuildText, ChannelType.GuildForum, ChannelType.GuildCategory)
                                )
                        ]
                    });
                    break;
                case 'automod_toxic_content_add_blacklist_channels':
                    if (!interaction.memberPermissions.has('ManageChannels')) return interaction.reply({
                        content: localize(locale, 'USER_MISSING_PERMISSIONS', 'Manage Channels'),
                        ephemeral: true
                    });

                    interaction.update({
                        embeds: [],
                        components: [
                            new ActionRowBuilder()
                                .setComponents(
                                    new ChannelSelectMenuBuilder()
                                        .setCustomId(`${interaction.user.id}:automod_toxic_content_add_blacklist_channels_select`)
                                        .setPlaceholder(localize(locale, 'CHANNELS_SELECT'))
                                        .setMaxValues(interaction.guild.channels.cache.size > 25 ? 25 : interaction.guild.channels.cache.size)
                                        .setChannelTypes(ChannelType.GuildText, ChannelType.GuildForum, ChannelType.GuildCategory)
                                )
                        ]
                    });
                    break;
                case 'automod_bad_content_add_blacklist_channels_select':
                    await interaction.deferUpdate();

                    let channelIds3 = interaction.values;

                    await automod.addBlacklistChannels('badContent', channelIds3);
                    await interaction.followUp({
                        content: localize(locale, 'ADD_BLACKLIST_CHANNELS_SUCCESS', channelIds3.map(id => `<#${id}>`).join(', ')),
                        ephemeral: true
                    });

                    automodBadContentConfigure(interaction, automod, locale);
                    break;
                case 'automod_toxic_content_add_blacklist_channels_select':
                    await interaction.deferUpdate();

                    let channelIds5 = interaction.values;

                    await automod.addBlacklistChannels('toxicContent', channelIds5);
                    await interaction.followUp({
                        content: localize(locale, 'ADD_BLACKLIST_CHANNELS_SUCCESS', channelIds5.map(id => `<#${id}>`).join(', ')),
                        ephemeral: true
                    });

                    automodToxicContentConfigure(interaction, automod, locale);
                    break;
                case 'automod_bad_content_remove_blacklist_channels':
                    if (!interaction.memberPermissions.has('ManageChannels')) return interaction.reply({
                        content: localize(locale, 'USER_MISSING_PERMISSIONS', 'Manage Channels'),
                        ephemeral: true
                    });

                    interaction.update({
                        embeds: [],
                        components: [
                            new ActionRowBuilder()
                                .setComponents(
                                    new ChannelSelectMenuBuilder()
                                        .setCustomId(`${interaction.user.id}:automod_bad_content_remove_blacklist_channels_select`)
                                        .setPlaceholder(localize(locale, 'CHANNELS_SELECT'))
                                        .setMaxValues(interaction.guild.channels.cache.size > 25 ? 25 : interaction.guild.channels.cache.size)
                                        .setChannelTypes(ChannelType.GuildText, ChannelType.GuildForum, ChannelType.GuildCategory)
                                )
                        ]
                    });
                    break;
                case 'automod_toxic_content_remove_blacklist_channels':
                    if (!interaction.memberPermissions.has('ManageChannels')) return interaction.reply({
                        content: localize(locale, 'USER_MISSING_PERMISSIONS', 'Manage Channels'),
                        ephemeral: true
                    });

                    interaction.update({
                        embeds: [],
                        components: [
                            new ActionRowBuilder()
                                .setComponents(
                                    new ChannelSelectMenuBuilder()
                                        .setCustomId(`${interaction.user.id}:automod_toxic_content_remove_blacklist_channels_select`)
                                        .setPlaceholder(localize(locale, 'CHANNELS_SELECT'))
                                        .setMaxValues(interaction.guild.channels.cache.size > 25 ? 25 : interaction.guild.channels.cache.size)
                                        .setChannelTypes(ChannelType.GuildText, ChannelType.GuildForum, ChannelType.GuildCategory)
                                )
                        ]
                    });
                    break;
                case 'automod_bad_content_remove_blacklist_channels_select':
                    await interaction.deferUpdate();

                    let channelIds4 = interaction.values;

                    await automod.removeBlacklistChannels('badContent', channelIds4);
                    await interaction.followUp({
                        content: localize(locale, 'REMOVE_BLACKLIST_CHANNELS_SUCCESS', channelIds4.map(id => `<#${id}>`).join(', ')),
                        ephemeral: true
                    });

                    automodBadContentConfigure(interaction, automod, locale);
                    break;
                case 'automod_toxic_content_remove_blacklist_channels_select':
                    await interaction.deferUpdate();

                    let channelIds6 = interaction.values;

                    await automod.removeBlacklistChannels('toxicContent', channelIds6);
                    await interaction.followUp({
                        content: localize(locale, 'REMOVE_BLACKLIST_CHANNELS_SUCCESS', channelIds6.map(id => `<#${id}>`).join(', ')),
                        ephemeral: true
                    });

                    automodToxicContentConfigure(interaction, automod, locale);
                    break;
                case 'automod_bad_content_set_filters':
                    interaction.update({
                        embeds: [],
                        components: [
                            new ActionRowBuilder()
                                .setComponents(
                                    new StringSelectMenuBuilder()
                                        .setCustomId(`${interaction.user.id}:automod_bad_content_set_filters_select`)
                                        .setPlaceholder(localize(locale, 'FILTERS_SELECT'))
                                        .setOptions(
                                            new StringSelectMenuOptionBuilder()
                                                .setLabel(localize(locale, 'SEXUAL'))
                                                .setValue('sexual')
                                                .setDefault(automod.data.badContent.filters === 'all' || automod.data.badContent.filters.includes('sexual')),
                                            new StringSelectMenuOptionBuilder()
                                                .setLabel(localize(locale, 'HATE'))
                                                .setValue('hate')
                                                .setDefault(automod.data.badContent.filters === 'all' || automod.data.badContent.filters.includes('hate')),
                                            new StringSelectMenuOptionBuilder()
                                                .setLabel(localize(locale, 'HARASSMENT'))
                                                .setValue('harassment')
                                                .setDefault(automod.data.badContent.filters === 'all' || automod.data.badContent.filters.includes('harassment')),
                                            new StringSelectMenuOptionBuilder()
                                                .setLabel(localize(locale, 'SELF_HARM'))
                                                .setValue('self-harm')
                                                .setDefault(automod.data.badContent.filters === 'all' || automod.data.badContent.filters.includes('self-harm')),
                                            new StringSelectMenuOptionBuilder()
                                                .setLabel(localize(locale, 'SEXUAL_MINORS'))
                                                .setValue('sexual/minors')
                                                .setDefault(automod.data.badContent.filters === 'all' || automod.data.badContent.filters.includes('sexual/minors')),
                                            new StringSelectMenuOptionBuilder()
                                                .setLabel(localize(locale, 'HATE_THREATENING'))
                                                .setValue('hate/threatening')
                                                .setDefault(automod.data.badContent.filters === 'all' || automod.data.badContent.filters.includes('hate/threatening')),
                                            new StringSelectMenuOptionBuilder()
                                                .setLabel(localize(locale, 'VIOLENCE_GRAPHIC'))
                                                .setValue('violence/graphic')
                                                .setDefault(automod.data.badContent.filters === 'all' || automod.data.badContent.filters.includes('violence/graphic')),
                                            new StringSelectMenuOptionBuilder()
                                                .setLabel(localize(locale, 'SELF_HARM_INTENT'))
                                                .setValue('self-harm/intent')
                                                .setDefault(automod.data.badContent.filters === 'all' || automod.data.badContent.filters.includes('self-harm/intent')),
                                            new StringSelectMenuOptionBuilder()
                                                .setLabel(localize(locale, 'SELF_HARM_INSTRUCTIONS'))
                                                .setValue('self-harm/instructions')
                                                .setDefault(automod.data.badContent.filters === 'all' || automod.data.badContent.filters.includes('self-harm/instructions')),
                                            new StringSelectMenuOptionBuilder()
                                                .setLabel(localize(locale, 'HARASSMENT_THREATENING'))
                                                .setValue('harassment/threatening')
                                                .setDefault(automod.data.badContent.filters === 'all' || automod.data.badContent.filters.includes('harassment/threatening')),
                                            new StringSelectMenuOptionBuilder()
                                                .setLabel(localize(locale, 'VIOLENCE'))
                                                .setValue('violence')
                                                .setDefault(automod.data.badContent.filters === 'all' || automod.data.badContent.filters.includes('violence'))
                                        )
                                        .setMaxValues(11)
                                )
                        ]
                    });
                    break;
                case 'automod_toxic_content_set_filters':
                    interaction.update({
                        embeds: [],
                        components: [
                            new ActionRowBuilder()
                                .setComponents(
                                    new StringSelectMenuBuilder()
                                        .setCustomId(`${interaction.user.id}:automod_toxic_content_set_filters_select`)
                                        .setPlaceholder(localize(locale, 'FILTERS_SELECT'))
                                        .setOptions(
                                            new StringSelectMenuOptionBuilder()
                                                .setLabel(localize(locale, 'TOXICITY'))
                                                .setValue('toxicity')
                                                .setDefault(automod.data.toxicContent.filters === 'all' || automod.data.toxicContent.filters.includes('toxicity')),
                                            new StringSelectMenuOptionBuilder()
                                                .setLabel(localize(locale, 'SEVERE_TOXICITY'))
                                                .setValue('severe-toxicity')
                                                .setDefault(automod.data.toxicContent.filters === 'all' || automod.data.toxicContent.filters.includes('severe-toxicity')),
                                            new StringSelectMenuOptionBuilder()
                                                .setLabel(localize(locale, 'IDENTITY_ATTACK'))
                                                .setValue('identity-attack')
                                                .setDefault(automod.data.toxicContent.filters === 'all' || automod.data.toxicContent.filters.includes('identity-attack')),
                                            new StringSelectMenuOptionBuilder()
                                                .setLabel(localize(locale, 'INSULT'))
                                                .setValue('insult')
                                                .setDefault(automod.data.toxicContent.filters === 'all' || automod.data.toxicContent.filters.includes('insult')),
                                            new StringSelectMenuOptionBuilder()
                                                .setLabel(localize(locale, 'PROFANITY'))
                                                .setValue('profanity')
                                                .setDefault(automod.data.badContent.filters === 'all' || automod.data.toxicContent.filters.includes('profanity')),
                                            new StringSelectMenuOptionBuilder()
                                                .setLabel(localize(locale, 'THREAT'))
                                                .setValue('threat')
                                                .setDefault(automod.data.toxicContent.filters === 'all' || automod.data.toxicContent.filters.includes('threat'))
                                        )
                                        .setMaxValues(6)
                                )
                        ]
                    });
                    break;
                case 'automod_bad_content_set_filters_select':
                    await interaction.deferUpdate();

                    let filters = interaction.values;

                    if (filters.length === 11) filters = 'all';

                    await automod.setBadContentFilters(filters);
                    await interaction.followUp({
                        content: localize(locale, 'SET_FILTERS_SUCCESS'),
                        ephemeral: true
                    });

                    automodBadContentConfigure(interaction, automod, locale);
                    break;
                case 'automod_toxic_content_set_filters_select':
                    await interaction.deferUpdate();

                    let filters2 = interaction.values;

                    if (filters2.length === 11) filters2 = 'all';

                    await automod.setToxicContentFilters(filters2);
                    await interaction.followUp({
                        content: localize(locale, 'SET_TOXIC_CONTENT_FILTERS_SUCCESS'),
                        ephemeral: true
                    });

                    automodToxicContentConfigure(interaction, automod, locale);
                    break;
                case 'clyde_private_channel':
                    await interaction.deferReply({ ephemeral: true });

                    if (interaction.guildId !== '1086707622759125053') return interaction.editReply(localize(locale, 'COMPONENT_NOT_AVAILABLE', localize(locale, 'SERVER')));

                    let dehMember = await client.guilds.cache.get(serverId).members.fetch(interaction.user.id);

                    if (!dehMember) return interaction.editReply(localize(locale, 'ACTION_REQUIRES_DEH_MEMBER'));
                    if (!dehMember.roles.cache.has('1150833323267084359') && !developerIds.includes(interaction.user.id)) return interaction.editReply(localize(locale, 'ACTION_REQUIRES_TIER_1'));
                    if (await db.get(`clyde.${interaction.user.id}.privateChannel`)) return interaction.editReply(localize(locale, 'PRIVATE_CHANNEL_ALREADY_EXISTS'));

                    let privateChannel = await interaction.guild.channels.create({
                        name: interaction.user.username,
                        type: ChannelType.GuildText,
                        parent: '1152525974878031933',
                        permissionOverwrites: [
                            {
                                type: OverwriteType.Role,
                                id: '1086707622759125053',
                                deny: new PermissionsBitField().add(PermissionFlagsBits.ViewChannel)
                            },
                            {
                                type: OverwriteType.Member,
                                id: interaction.user.id,
                                allow: new PermissionsBitField().add(PermissionFlagsBits.ViewChannel)
                            }
                        ]
                    });

                    let sentMessage = await privateChannel.send({
                        components: [
                            new ActionRowBuilder()
                                .setComponents(
                                    new ButtonBuilder()
                                        .setCustomId(`${interaction.user.id}:clyde_private_add`)
                                        .setEmoji(emojis.add)
                                        .setLabel(localize(locale, 'ADD_MEMBERS'))
                                        .setStyle(ButtonStyle.Secondary),
                                    new ButtonBuilder()
                                        .setCustomId(`${interaction.user.id}:clyde_private_remove`)
                                        .setEmoji(emojis.remove)
                                        .setLabel(localize(locale, 'REMOVE_MEMBERS'))
                                        .setStyle(ButtonStyle.Secondary)
                                ),
                            new ActionRowBuilder()
                                .setComponents(
                                    new ButtonBuilder()
                                        .setCustomId(`${interaction.user.id}:clyde_private_delete`)
                                        .setLabel(localize(locale, 'DELETE_CHANNEL'))
                                        .setStyle(ButtonStyle.Danger)
                                )
                        ]
                    });

                    sentMessage.pin();

                    await db.set(`clyde.${interaction.user.id}.privateChannel`, privateChannel.id);

                    interaction.editReply(localize(locale, 'PRIVATE_CHANNEL_CREATED', `<#${privateChannel.id}>`));
                    break;
                case 'clyde_private_add':
                    await interaction.deferReply({ ephemeral: true });

                    if (interaction.guildId !== '1086707622759125053') return interaction.editReply(localize(locale, 'COMPONENT_NOT_AVAILABLE', localize(locale, 'SERVER')));
                    if (args[0] === 'selected') {
                        let members = interaction.values;

                        for (let member of members) {
                            await interaction.channel.permissionOverwrites.create(member, {
                                ViewChannel: true
                            });
                            await new Promise(resolve => setTimeout(resolve, 1000));
                        };

                        return interaction.editReply(localize(locale, 'ADD_MEMBERS_SUCCESS', members.map(id => `<@${id}>`).join(', ')));
                    } else interaction.editReply({
                        components: [
                            new ActionRowBuilder()
                                .setComponents(
                                    new UserSelectMenuBuilder()
                                        .setCustomId(`${interaction.user.id}:clyde_private_add:selected`)
                                        .setPlaceholder(localize(locale, 'MEMBERS_SELECT'))
                                        .setMaxValues(interaction.guild.members.cache.size > 25 ? 25 : interaction.guild.members.cache.size)
                                )
                        ]
                    });
                    break;
                case 'clyde_private_remove':
                    await interaction.deferReply({ ephemeral: true });

                    if (interaction.guildId !== '1086707622759125053') return interaction.editReply(localize(locale, 'COMPONENT_NOT_AVAILABLE', localize(locale, 'SERVER')));
                    if (args[0] === 'selected') {
                        let members = interaction.values;

                        for (let member of members) {
                            await interaction.channel.permissionOverwrites.delete(member);
                            await new Promise(resolve => setTimeout(resolve, 1000));
                        };

                        return interaction.editReply(localize(locale, 'REMOVE_MEMBERS_SUCCESS', members.map(id => `<@${id}>`).join(', ')));
                    } else interaction.editReply({
                        components: [
                            new ActionRowBuilder()
                                .setComponents(
                                    new UserSelectMenuBuilder()
                                        .setCustomId(`${interaction.user.id}:clyde_private_remove:selected`)
                                        .setPlaceholder(localize(locale, 'MEMBERS_SELECT'))
                                        .setMaxValues(interaction.guild.members.cache.size > 25 ? 25 : interaction.guild.members.cache.size)
                                )
                        ]
                    });
                    break;
                case 'clyde_private_delete':
                    await interaction.deferReply({ ephemeral: true });

                    if (interaction.guildId !== '1086707622759125053') return interaction.editReply(localize(locale, 'COMPONENT_NOT_AVAILABLE', localize(locale, 'SERVER')));

                    await interaction.channel.delete();
                    await db.delete(`clyde.${interaction.user.id}`);
                    break;
                case 'bugfixtools_toggle':
                    await interaction.deferUpdate();
                    await bugFixTools.toggle(args[0]);

                    bugFixToolsSettings(interaction, bugFixTools, locale);
                    break;
                default:
                    logger('warning', 'COMMAND', 'Message component', interaction.customId, 'not found');
            };
        } catch (error) {
            logger('error', 'COMMAND', 'Error while executing message component:', `${error.message}\n`, error.stack);

            return interaction.reply({
                content: localize(interaction.locale, 'COMMAND_ERROR', 'message component', error.message),
                ephemeral: true
            }).catch(() => interaction.editReply({
                content: localize(interaction.locale, 'COMMAND_ERROR', 'message component', error.message)
            }));
        }
    } else if (interaction.isModalSubmit()) {
        logger('debug', 'COMMAND', 'Received modal submit', interaction.customId, 'from', interaction.guild ? `${interaction.guild.name} (${interaction.guild.id})` : 'DMs', 'by', `${interaction.user.tag} (${interaction.user.id})`);

        try {
            let [customId, ...args] = interaction.customId.split(':');
            let locale = interaction.locale;

            const home = await new Home(interaction.guildId).setup();
            const automod = await new AutoMod(interaction.guildId).setup();

            switch (customId) {
                case 'home_min_interactions_modal':
                    await interaction.deferUpdate();

                    let minInteractions = parseInt(interaction.fields.getTextInputValue('count'));

                    if (isNaN(minInteractions)) return interaction.editReply(localize(interaction.locale, 'INVALID_NUMBER'));

                    await home.setMinInteractions(minInteractions);

                    interaction.editReply({
                        content: localize(locale, 'SETTING_MIN_INTERACTIONS_SUCCESS', minInteractions),
                        embeds: [],
                        components: []
                    });
                    break;
                case 'automod_ai_test_modal':
                    await interaction.deferReply({ ephemeral: true });

                    let message = interaction.fields.getTextInputValue('message');
                    let result = await automod.ai({
                        content: message,
                        author: interaction.user,
                        channel: {
                            name: 'test-channel'
                        }
                    }, true);

                    interaction.editReply(`${localize(locale, 'AUTOMOD_AI_RESPONSE')}\n${result}`);
                    break;
                case 'automod_bad_content_test_modal':
                    await interaction.deferReply({ ephemeral: true });

                    let message2 = interaction.fields.getTextInputValue('message');
                    let result2 = await automod.badContent({
                        content: message2
                    }, true);

                    interaction.editReply(`${localize(locale, 'BAD_CONTENT_FILTER_RESPONSE')}\n${result2 ?? localize(locale, 'API_IS_DOWN')}`);
                    break;
                case 'automod_toxic_content_test_modal':
                    await interaction.deferReply({ ephemeral: true });

                    let message3 = interaction.fields.getTextInputValue('message');
                    let result3 = await automod.toxicContent({
                        content: message3
                    }, true);

                    interaction.editReply(`${localize(locale, 'TOXIC_CONTENT_FILTER_RESPONSE')}\n${result3 ?? localize(locale, 'API_IS_DOWN')}`);
                    break;
                case 'automod_ai_add_rule_modal':
                    await interaction.deferUpdate();

                    let rule = interaction.fields.getTextInputValue('rule');

                    await automod.addAIRule(rule);
                    await interaction.followUp({
                        content: localize(locale, 'SETTING_ADD_RULE_SUCCESS', rule),
                        ephemeral: true
                    });

                    automodAIConfigure(interaction, automod, locale);
                    break;
                case 'automod_ai_remove_rule_modal':
                    await interaction.deferUpdate();

                    let index = parseInt(interaction.fields.getTextInputValue('rule'));

                    if (isNaN(index)) return interaction.editReply(localize(interaction.locale, 'INVALID_NUMBER'));

                    await automod.removAIRule(index - 1);
                    await interaction.followUp({
                        content: localize(locale, 'SETTING_REMOVE_RULE_SUCCESS'),
                        ephemeral: true
                    });

                    automodAIConfigure(interaction, automod, locale);
                    break;
                case 'automod_ai_model_set_key_modal':
                    await interaction.deferUpdate();
                    await interaction.followUp({
                        content: localize(locale, 'CHECKING_KEY'),
                        ephemeral: true
                    });

                    let key = interaction.fields.getTextInputValue('key') ?? '';

                    if (key === '') {
                        await automod.setPurGPTKey(null);
                        await interaction.followUp({
                            content: localize(locale, 'SET_KEY_SUCCESS'),
                            ephemeral: true
                        });

                        return automodAIConfigure(interaction, automod, locale);
                    };

                    let response;

                    try {
                        response = await axios.post('https://beta.purgpt.xyz/openai/chat/completions', {
                            model: 'gpt-3.5-turbo',
                            messages: [
                                {
                                    role: 'user',
                                    content: 'Hello, world!'
                                }
                            ]
                        }, {
                            headers: {
                                'Content-Type': 'application/json',
                                Authorization: `Bearer ${key}`
                            }
                        });
                    } catch (error) {
                        return interaction.followUp({
                            content: localize(locale, 'INVALID_KEY'),
                            ephemeral: true
                        });
                    };

                    if (response.status !== 200) return interaction.followUp({
                        content: localize(locale, 'INVALID_KEY'),
                        ephemeral: true
                    });

                    await new Promise(resolve => setTimeout(resolve, 1000));

                    try {
                        response = await axios.post('https://beta.purgpt.xyz/openai/chat/completions', {
                            model: 'gpt-3.5-turbo',
                            messages: [
                                {
                                    role: 'user',
                                    content: 'Hello, world!'
                                }
                            ]
                        }, {
                            headers: {
                                'Content-Type': 'application/json',
                                Authorization: `Bearer ${key}`
                            }
                        });
                    } catch (error) {
                        return interaction.followUp({
                            content: localize(locale, 'INVALID_KEY'),
                            ephemeral: true
                        });
                    };

                    if (response.status !== 200) return interaction.followUp({
                        content: localize(locale, 'INVALID_KEY'),
                        ephemeral: true
                    });

                    await automod.setPurGPTKey(key);
                    await interaction.followUp({
                        content: localize(locale, 'SET_KEY_SUCCESS'),
                        ephemeral: true
                    });

                    automodAIConfigure(interaction, automod, locale);
                    break;
                default:
                    logger('warning', 'COMMAND', 'Modal', interaction.customId, 'not found');

                    return interaction.reply({
                        content: localize(interaction.locale, 'NOT_FOUND', 'Modal'),
                        ephemeral: true
                    });
            };
        } catch (error) {
            logger('error', 'COMMAND', 'Error while executing modal:', `${error.message}\n`, error.stack);

            return interaction.reply({
                content: localize(interaction.locale, 'COMMAND_ERROR', 'modal', error.message),
                ephemeral: true
            }).catch(() => interaction.editReply({
                content: localize(interaction.locale, 'COMMAND_ERROR', 'modal', error.message)
            }));
        };
    } else if (interaction.isAutocomplete()) {
        logger('debug', 'COMMAND', 'Received autocomplete of', `${interaction.commandName} (${interaction.commandId})`, 'from', interaction.guild ? `${interaction.guild.name} (${interaction.guild.id})` : 'DMs', 'by', `${interaction.user.tag} (${interaction.user.id})`);

        const command = client.commands.get(interaction.commandName);

        if (!command) return logger('warning', 'COMMAND', 'Command', interaction.commandName, 'not found');

        try {
            await command.autocomplete(interaction);
        } catch (error) {
            logger('error', 'COMMAND', 'Error while executing autocomplete:', `${error.message}\n`, error.stack);
        };
    };
});

client.on('messageCreate', async (message) => {
	try {
		if (!message.guild || !message.member) return;
		if (message.type === MessageType.Reply && message.content !== '' && message.reference?.messageId) {
			const home = await new Home(message.guildId).setup();

			home.check('reply', message);
		}
		if (
			message.type === 0 &&
			message.content !== '' &&
			!message.author.bot &&
			!message.member.permissions.has('ManageMessages') &&
			message.channel.type !== ChannelType.GuildAnnouncement
		) {
			const automod = await new AutoMod(message.guildId).setup();

			let blocked = false;

			if (
				!blocked &&
				automod.data.ai.enabled &&
				!automod.data.ai.channelBlacklist.includes(message.channelId) &&
				!automod.data.ai.channelBlacklist.includes(message.channel.parentId) &&
				!automod.data.ai.roleBlacklist.filter((role) => message.member.roles.cache.get(role))[0]
			)
				blocked = await automod.ai(message);
			if (
				!blocked &&
				automod.data.badContent.enabled &&
				!automod.data.badContent.channelBlacklist.includes(message.channelId) &&
				!automod.data.badContent.channelBlacklist.includes(message.channel.parentId) &&
				!automod.data.badContent.roleBlacklist.filter((role) => message.member.roles.cache.get(role))[0]
			)
				blocked = await automod.badContent(message);
			if (
				!blocked &&
				automod.data.toxicContent.enabled &&
				!automod.data.toxicContent.channelBlacklist.includes(message.channelId) &&
				!automod.data.toxicContent.channelBlacklist.includes(message.channel.parentId) &&
				!automod.data.toxicContent.roleBlacklist.filter((role) => message.member.roles.cache.get(role))[0]
			)
				blocked = await automod.toxicContent(message);
		}
	} catch (error) {
		logger('error', 'EVENT', 'Error while executing messageCreate:', `${error.message}\n`, error.stack);
	}
});

client.on('messageReactionAdd', async (reaction, user) => {
	if (!reaction.message.guild) return;

	const home = await new Home(reaction.message.guildId).setup();

	home.check('reaction', reaction, user);
});

client.on('guildMemberUpdate', async (oldMember, newMember) => {
	let subscriber = false;
	let premium = false;
	let beast = false;

	if (!oldMember.roles.cache.has('1150833335199875126') && newMember.roles.cache.has('1150833335199875126'))
		subscriber = true;
	if (!oldMember.roles.cache.has('1150839581273489479') && newMember.roles.cache.has('1150839581273489479'))
		premium = true;
	if (!oldMember.roles.cache.has('1150840476589633658') && newMember.roles.cache.has('1150840476589633658'))
		beast = true;
	if (subscriber || premium || beast)
		client.channels.cache.get('1151920854175862784').send({
			content: `Thanks to <@${newMember.id}> for buying **${
				subscriber ? 'Subscriber (Tier 1)' : premium ? 'Premium (Tier 2)' : 'Beast (Tier 3)'
			}** subscription!`,
			allowedMentions: {
				parse: [],
			},
		});
});

client.on('guildMemberAdd', async (member) => {
	if (member.guild.id !== '1086707622759125053') return;

	await member.guild.members.fetch();

	if (member.guild.members.cache.size >= 100) {
		await member.guild.members.prune({
			days: 0,
			roles: ['1087086754537934938'],
		});

		client.channels.cache
			.get('1089807623496421417')
			.send(
				"# <a:a_dehClyde:1098205219575300108> Clyde's Home\n(<@&1089850303031033937>)\n---\n**Clyde's Home** has been cleared! You can rejoin the server [here](https://canary.discord.com/channels/1089540433010491392/1117827130236096622).",
			);
	} else if (member.guild.members.cache.size >= 90)
		client.channels.cache
			.get('1090658895531352194')
			.send(
				'**There are only 10 members left to reach 100 members! This means the server will be cleared soon! Please join our main server to rejoin here: https://discord.gg/experiments **',
			);
});

client.on('guildMemberRemove', async (member) => {
	if (member.guild.id !== '1086707622759125053') return;

	let channel = await db.get(`clyde.${member.id}.privateChannel`);

	client.channels.cache
		.get(channel)
		.delete()
		.catch(() => null);

	await db.delete(`clyde.${member.id}`);
});

client.on('messageCreate', async (message) => {
	if (message.author.bot) return;

	let user = (await db.get(`users.${message.author.id}`)) ?? {};

	if (!user.real) user.real = 0;
	if (message.content.toLowerCase().includes('real')) {
		user.real++;

		await db.set(`users.${message.author.id}`, user);

        if (message.guildId === '1089540433010491392') message.reply(`You have said real **${user.real}** times.`);
    };
});

client.on('messageCreate', async message => {
    if (message.type !== MessageType.UserJoin) return;

    let bugFixTools = await new BugFixTools(message.guildId).setup();

    if (bugFixTools.data.lastJoin === message.author.id) return message.delete().catch(() => null);

    bugFixTools.setLastJoin(message.author.id);
});

client.login(process.env.DISCORD_TOKEN);

// Set an interval to check if it's the first day of the month every day
setInterval(checkFirstDayOfMonth, 86400000);
