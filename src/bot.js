const { Client, Collection, WebhookClient } = require('discord.js');
const { readdirSync, writeFileSync, readFileSync, mkdirSync } = require('node:fs');
const { default: axios } = require('axios');
const logger = require('./modules/logger');
const { localize } = require('./modules/localization');
const { ownerId, developerIds, roleIds, colors } = require('../config');
const { diffLines } = require('diff');
const EmbedMaker = require('./modules/embed');

const client = new Client({
    intents: [
        'Guilds'
    ]
});
const extraStuffWebhook = new WebhookClient({
    url: process.env.EXTRA_STUFF_WEBHOOK
});
const otherChangesWebhook = new WebhookClient({
    url: process.env.OTHER_CHANGES_WEBHOOK
});

client.commands = new Collection();

const commandFiles = readdirSync('src/commands').filter(file => file.endsWith('.js'));

if (commandFiles.length > 0) logger('info', 'COMMAND', 'Found', commandFiles.length.toString(), 'commands');
else logger('warning', 'COMMAND', 'No commands found');

for (const file of commandFiles) {
    const command = require(`./commands/${file}`);

    client.commands.set(command.data.name, command);

    logger('success', 'COMMAND', 'Loaded command', command.data.name);
};

async function checkScripts() {
    let currentOld = '';
    let stringsOld = '';
    let endpointsOld = '';

    try {
        currentOld = readFileSync('scripts/current.js').toString();
    } catch (error) {
        logger('error', 'SCRIPT', 'Error while reading code', 'current.js', `${error.code}\n`, JSON.stringify(error, null, 4));
    };

    try {
        stringsOld = readFileSync('scripts/strings.js').toString();
        stringsOld = JSON.parse(stringsOld);
    } catch (error) {
        logger('error', 'SCRIPT', 'Error while reading code', 'strings.js', `${error.code}\n`, JSON.stringify(error, null, 4));
    };

    try {
        endpointsOld = readFileSync('scripts/endpoints.js').toString();
        endpointsOld = JSON.parse(endpointsOld);
    } catch (error) {
        logger('error', 'SCRIPT', 'Error while reading code', 'endpoints.js', `${error.code}\n`, JSON.stringify(error, null, 4));
    };

    let current;
    let strings;
    let endpoints;

    try {
        current = await axios.get('https://raw.githubusercontent.com/Discord-Datamining/Discord-Datamining/master/current.js');
    } catch (error) {
        return logger('error', 'SCRIPT', 'Error while fetching code', 'current.js', `${error.response.status} ${error.response.statusText}\n`, JSON.stringify(error.response.data, null, 4));
    };

    if (current.status === 200) current = current.data;
    else return logger('error', 'SCRIPT', 'Error while fetching code', 'current.js', `${current.status} ${current.statusText}\n`, JSON.stringify(current.data, null, 4));

    writeFileSync('scripts/current.js', current);
    logger('success', 'SCRIPT', 'Fetched code', 'current.js');

    try {
        strings = await axios.get('https://raw.githubusercontent.com/xHyroM/discord-datamining/master/data/client/strings.json');
    } catch (error) {
        return logger('error', 'SCRIPT', 'Error while fetching code', 'strings.js', `${error.response.status} ${error.response.statusText}\n`, JSON.stringify(error.response.data, null, 4));
    };

    if (strings.status === 200) strings = strings.data;
    else return logger('error', 'SCRIPT', 'Error while fetching code', 'strings.js', `${strings.status} ${strings.statusText}\n`, JSON.stringify(strings.data, null, 4));

    writeFileSync('scripts/strings.js', JSON.stringify(strings, null, 4));
    logger('success', 'SCRIPT', 'Fetched code', 'strings.js');

    try {
        endpoints = await axios.get('https://raw.githubusercontent.com/xHyroM/discord-datamining/master/data/client/routes.json');
    } catch (error) {
        return logger('error', 'SCRIPT', 'Error while fetching code', 'endpoints.js', `${error.response.status} ${error.response.statusText}\n`, JSON.stringify(error.response.data, null, 4));
    };

    if (endpoints.status === 200) endpoints = endpoints.data;
    else return logger('error', 'SCRIPT', 'Error while fetching code', 'endpoints.js', `${strings.status} ${strings.statusText}\n`, JSON.stringify(strings.data, null, 4));

    writeFileSync('scripts/endpoints.js', JSON.stringify(endpoints, null, 4));
    logger('success', 'SCRIPT', 'Fetched code', 'endpoints.js');

    /*
    let options = {
        maxBuffer: 1024 * 1024 * 1000
    };

    code1 = execSync('beautifier ./scripts/current.js', options).toString();

    writeFileSync('scripts/current.js', code1);
    */

    let diffCurrent;
    let diffCurrentText = '';

    if (currentOld !== '') {
        diffCurrent = diffChars(currentOld, current);

        let last = [];
        let added = false;
        let removed = false;

        for (let part of diffCurrent) {
            if (part.added) {
                diffCurrentText += `${(!added && !removed && last.length > 0) ? '\n\n...\n\n' : ''}${(!added && !removed) ? last.map(line => line).join('\n') : ''}${!added ? '<added>' : ''}${part.value}`;
                added = true;
            } else if (part.removed) {
                diffCurrentText += `${(!added && !removed && last.length > 0) ? '\n\n...\n\n' : ''}${(!added && !removed) ? last.map(line => line).join('\n') : ''}${!removed ? '<removed>' : ''}${part.value}`;
                removed = true;
            } else {
                last = part.value.split('\n').slice(-15);

                if (added) {
                    diffCurrentText += '</added>';
                    added = false;
                };
                if (removed) {
                    diffCurrentText += '</removed>';
                    removed = false;
                };
            };
        };

        writeFileSync('scripts/diff/current.diff', diffCurrentText);
        logger('success', 'SCRIPT', 'Generated diff for', 'current.js');
    };

    let response1;

    if (diffCurrentText !== '') try {
        response1 = await axios.post('https://beta.purgpt.xyz/openai/chat/completions', {
            model: 'gpt-3.5-turbo-16k',
            messages: [
                {
                    role: 'system',
                    content: 'You are Dataminer. You will analyze the given script and report any changes. Our system will give you last 15 lines of the script before the changes. Codes have special tags for highlighting changes. <added>Added codes</added> and <removed>Removed codes</removed>. You can use these tags to highlight changes in your report.\n\nYou have to respond with DIFF format using this template:\n\n```diff\n+ Added line\n- Removed line\n```'
                },
                {
                    role: 'user',
                    content: diffCurrentText.length > 3500 ? `${diffCurrentText.slice(0, 3500)}...` : diffCurrentText
                }
            ]
        }, {
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${process.env.PURGPT_API_KEY}`
            }
        });
    } catch (error) {
        return logger('error', 'SCRIPT', 'Error while generating response for', 'current.diff', `${error?.response?.status} ${error?.response?.statusText}\n`, JSON.stringify(error?.response?.data ?? error, null, 4));
    };
    if (response1) {
        logger('success', 'SCRIPT', 'Generated response for', 'current.diff');

        response1 = response1.data.choices[0].message.content;

        if (response1.length > 3500) response1 = `${response1.slice(0, 3500)}...`;

        const embed = new EmbedMaker(client)
            .setTitle('Code Changes')
            .setDescription(response1);

        embed.data.footer.text = 'Powered by Discord-Datamining/Discord-Datamining & purgpt.xyz';

        extraStuffWebhook.send({
            content: `<@&${roleIds.extraStuff}> <@&${roleIds.codeChanges}>`,
            embeds: [embed]
        });
    };
    if (stringsOld !== '') {
        let removed = [];
        let added = [];
        let changed = [];

        for (let key in strings) {
            if (!stringsOld[key]) added.push(key);
        };

        for (let key in stringsOld) {
            if (!strings[key]) removed.push(key);
        };

        for (let key in strings) {
            if (stringsOld[key] && stringsOld[key] !== strings[key]) changed.push(key);
        };

        logger('success', 'SCRIPT', 'Generated diff for', 'strings.js');

        if (added.length > 0 || removed.length > 0 || changed.length > 0) {
            const embed = new EmbedMaker(client)
                .setTitle('Strings')
                .setDescription(`\`\`\`diff\n${removed.map(s => `- ${s}: ${stringsOld[s]}`).join('\n')}\n${changed.map(s => `- ${s}: ${stringsOld[s]}\n+ ${s}: ${strings[s]}`).join('\n')}\n${added.map(s => `+ ${s}: ${strings[s]}`).join('\n')}\n\`\`\``);

            embed.data.footer.text = 'Powered by xHyroM/discord-datamining';

            extraStuffWebhook.send({
                content: `<@&${roleIds.extraStuff}> <@&${roleIds.stringChanges}>`,
                embeds: [embed]
            });

            logger('success', 'SCRIPT', 'Generated response for', 'strings.js');
        };
    };
    if (endpointsOld !== '') {
        let removed = [];
        let added = [];
        let changed = [];

        for (let key in endpoints) {
            if (!endpointsOld[key]) added.push(key);
        };

        for (let key in endpointsOld) {
            if (!endpoints[key]) removed.push(key);
        };

        for (let key in endpoints) {
            if (endpointsOld[key] && endpointsOld[key].url !== endpoints[key].url) changed.push(key);
        };

        logger('success', 'SCRIPT', 'Generated diff for', 'endpoints.js');

        if (added.length > 0 || removed.length > 0) {
            const embed = new EmbedMaker(client)
                .setTitle('Endpoints')
                .setDescription(`\`\`\`diff\n${removed.map(endpoint => `- ${endpoint}: ${endpointsOld[endpoint].url}`).join('\n')}\n${changed.map(endpoint => `- ${endpoint}: ${endpointsOld[endpoint].url}\n+ ${endpoint}: ${endpoints[endpoint].url}`).join('\n')}\n${added.map(endpoint => `+ ${endpoint}: ${endpoints[endpoint].url}`).join('\n')}\n\`\`\``);

            embed.data.footer.text = 'Powered by xHyroM/discord-datamining';

            otherChangesWebhook.send({
                content: `<@&${roleIds.otherChanges}> <@&${roleIds.urlStuff}>`,
                embeds: [embed]
            });

            logger('success', 'SCRIPT', 'Generated response for', 'endpoints.js');
        };
    };
};

async function checkArticles() {
    try {
        let oldSupportSections = '';

        try {
            oldSupportSections = readFileSync('articles/supportSections.json', 'utf-8');
        } catch (error) {
            try {
                writeFileSync('articles/supportSections.json', '', 'utf-8');

                oldSupportSections = readFileSync('articles/supportSections.json', 'utf-8');
            } catch (error) {
                mkdirSync('articles');
                writeFileSync('articles/supportSections.json', '', 'utf-8');

                oldSupportSections = readFileSync('articles/supportSections.json', 'utf-8');
            };
        };

        let supportSections = (await axios.get('https://hammerandchisel.zendesk.com/api/v2/help_center/en-us/sections')).data?.sections;

        writeFileSync('articles/supportSections.json', JSON.stringify(supportSections, null, 4), 'utf-8');
        logger('success', 'SCRIPT', 'Fetched support sections');

        let oldSupportArticles = '';

        try {
            oldSupportArticles = readFileSync('articles/supportArticles.json', 'utf-8');
        } catch (error) {
            logger('error', 'SCRIPT', 'Error while reading', 'articles/supportArticles.json', error);
        };

        let supportArticles = (await axios.get('https://hammerandchisel.zendesk.com/api/v2/help_center/en-us/articles')).data?.articles;

        writeFileSync('articles/supportArticles.json', JSON.stringify(supportArticles, null, 4), 'utf-8');
        logger('success', 'SCRIPT', 'Fetched support articles');

        if (oldSupportSections !== '') {
            oldSupportSections = JSON.parse(oldSupportSections);

            let removed = [];
            let added = [];
            let changed = [];

            for (let data of supportSections) {
                if (!oldSupportSections.filter(s => s.id === data.id)[0]) added.push(data);
            };

            for (let data of oldSupportSections) {
                if (!supportSections.filter(s => s.id === data.id)[0]) removed.push(data);
            };

            for (let data of supportSections) {
                if (oldSupportSections.filter(s => s.id === data.id)[0] && oldSupportSections.filter(s => s.id === data.id)[0].name !== data.name) changed.push(data);
            };

            logger('success', 'SCRIPT', 'Generated diff for', 'supportSections.js');

            if (added.length > 0 || removed.length > 0 || changed.length > 0) {
                for (let data of added) {
                    const embed = new EmbedMaker(client)
                        .setColor(colors.green)
                        .setTitle('Added Support Section')
                        .setFields(
                            {
                                name: 'Link',
                                value: data.html_url,
                                inline: false
                            },
                            {
                                name: 'Id',
                                value: data.id.toString(),
                                inline: true
                            },
                            {
                                name: 'Category Id',
                                value: data.category_id.toString(),
                                inline: true
                            },
                            {
                                name: 'Created At',
                                value: `<t:${Math.floor(new Date(data.created_at).getTime() / 1000)}:R>`,
                                inline: true
                            },
                            {
                                name: 'Name',
                                value: data.name,
                                inline: true
                            },
                            {
                                name: 'Description',
                                value: data.description === '' ? 'None' : data.description,
                                inline: true
                            },
                            {
                                name: 'Outdated',
                                value: data.outdated ? '✅' : '❌',
                                inline: true
                            },
                            {
                                name: 'Parent Section Id',
                                value: data.parent_section_id ?? 'None',
                                inline: true
                            },
                            {
                                name: 'Theme Template',
                                value: data.theme_template,
                                inline: true
                            }
                        )

                    otherChangesWebhook.send({
                        content: `<@&${roleIds.otherChanges}> <@&${roleIds.urlStuff}>`,
                        embeds: [embed]
                    });

                    // Wait 3 seconds to prevent ratelimit
                    await new Promise(resolve => setTimeout(resolve, 3000));
                };

                for (let data of changed) {
                    const embed = new EmbedMaker(client)
                        .setColor(colors.yellow)
                        .setTitle('Updated Support Section')
                        .setFields(
                            {
                                name: 'Link',
                                value: data.html_url,
                                inline: false
                            },
                            {
                                name: 'Id',
                                value: data.id.toString(),
                                inline: true
                            },
                            {
                                name: 'Category Id',
                                value: data.category_id.toString(),
                                inline: true
                            },
                            {
                                name: 'Created At',
                                value: `<t:${Math.floor(new Date(data.created_at).getTime() / 1000)}:R>`,
                                inline: true
                            },
                            {
                                name: 'Updated At',
                                value: `<t:${Math.floor(new Date(data.updated_at).getTime() / 1000)}:R>`,
                                inline: true
                            },
                            {
                                name: 'Name',
                                value: data.name,
                                inline: true
                            },
                            {
                                name: 'Description',
                                value: data.description === '' ? 'None' : data.description,
                                inline: true
                            },
                            {
                                name: 'Outdated',
                                value: data.outdated ? '✅' : '❌',
                                inline: true
                            },
                            {
                                name: 'Parent Section Id',
                                value: data.parent_section_id ?? 'None',
                                inline: true
                            },
                            {
                                name: 'Theme Template',
                                value: data.theme_template,
                                inline: true
                            }
                        )

                    otherChangesWebhook.send({
                        content: `<@&${roleIds.otherChanges}> <@&${roleIds.urlStuff}>`,
                        embeds: [embed]
                    });

                    // Wait 3 seconds to prevent ratelimit
                    await new Promise(resolve => setTimeout(resolve, 3000));
                };

                for (let data of removed) {
                    const embed = new EmbedMaker(client)
                        .setColor(colors.red)
                        .setTitle('Removed Support Section')
                        .setFields(
                            {
                                name: 'Link',
                                value: data.html_url,
                                inline: false
                            },
                            {
                                name: 'Id',
                                value: data.id.toString(),
                                inline: true
                            },
                            {
                                name: 'Category Id',
                                value: data.category_id.toString(),
                                inline: true
                            },
                            {
                                name: 'Created At',
                                value: `<t:${Math.floor(new Date(data.created_at).getTime() / 1000)}:R>`,
                                inline: true
                            },
                            {
                                name: 'Updated At',
                                value: `<t:${Math.floor(new Date(data.updated_at).getTime() / 1000)}:R>`,
                                inline: true
                            },
                            {
                                name: 'Name',
                                value: data.name,
                                inline: true
                            },
                            {
                                name: 'Description',
                                value: data.description === '' ? 'None' : data.description,
                                inline: true
                            },
                            {
                                name: 'Outdated',
                                value: data.outdated ? '✅' : '❌',
                                inline: true
                            },
                            {
                                name: 'Parent Section Id',
                                value: data.parent_section_id ?? 'None',
                                inline: true
                            },
                            {
                                name: 'Theme Template',
                                value: data.theme_template,
                                inline: true
                            }
                        )

                    otherChangesWebhook.send({
                        content: `<@&${roleIds.otherChanges}> <@&${roleIds.urlStuff}>`,
                        embeds: [embed]
                    });

                    // Wait 3 seconds to prevent ratelimit
                    await new Promise(resolve => setTimeout(resolve, 3000));
                };

                logger('success', 'SCRIPT', 'Generated response for', 'supportSections.js');
            };
        };
        if (oldSupportArticles !== '') {
            oldSupportArticles = JSON.parse(oldSupportArticles);

            let removed = [];
            let added = [];
            let changed = [];

            for (let data of supportArticles) {
                if (!oldSupportArticles.filter(s => s.id === data.id)[0]) added.push(data);
            };

            for (let data of oldSupportArticles) {
                if (!supportArticles.filter(s => s.id === data.id)[0]) removed.push(data);
            };

            for (let data of supportArticles) {
                if (oldSupportArticles.filter(s => s.id === data.id)[0] && (oldSupportArticles.filter(s => s.id === data.id)[0].name !== data.name || oldSupportArticles.filter(s => s.id === data.id)[0].body !== data.body || oldSupportArticles.filter(s => s.id === data.id)[0].title !== data.title)) changed.push(data);
            };

            logger('success', 'SCRIPT', 'Generated diff for', 'supportSections.js');

            if (added.length > 0 || removed.length > 0 || changed.length > 0) {
                for (let data of added) {
                    const embed = new EmbedMaker(client)
                        .setColor(colors.green)
                        .setTitle('Added Support Article')
                        .setFields(
                            {
                                name: 'Link',
                                value: data.html_url,
                                inline: false
                            },
                            {
                                name: 'Id',
                                value: data.id.toString(),
                                inline: true
                            },
                            {
                                name: 'Author Id',
                                value: data.author_id.toString(),
                                inline: true
                            },
                            {
                                name: 'Comments Enabled',
                                value: data.comments_disabled ? '❌' : '✅',
                                inline: true
                            },
                            {
                                name: 'Draft',
                                value: data.draft ? '✅' : '❌',
                                inline: true
                            },
                            {
                                name: 'Section Id',
                                value: data.section_id.toString(),
                                inline: true
                            },
                            {
                                name: 'Created At',
                                value: `<t:${Math.floor(new Date(data.created_at).getTime() / 1000)}:R>`,
                                inline: true
                            },
                            {
                                name: 'Name',
                                value: data.name,
                                inline: true
                            },
                            {
                                name: 'Title',
                                value: data.title,
                                inline: true
                            },
                            {
                                name: 'Outdated',
                                value: data.outdated ? '✅' : '❌',
                                inline: true
                            },
                            {
                                name: 'Outdated Locales',
                                value: data.outdated_locales.length > 0 ? data.outdated_locales.join(', ') : 'None',
                                inline: true
                            },
                            {
                                name: 'Tags',
                                value: data.label_names.length > 0 ? data.label_names.join(', ') : 'None',
                                inline: true
                            }
                        );

                    otherChangesWebhook.send({
                        content: `<@&${roleIds.otherChanges}> <@&${roleIds.urlStuff}>`,
                        embeds: [embed]
                    });

                    // Wait 3 seconds to prevent ratelimit
                    await new Promise(resolve => setTimeout(resolve, 3000));
                };

                for (let data of changed) {
                    let diffSupportArticleText = '';
                    let diffSupportArticle = diffLines(oldSupportArticles.filter(s => s.id === data.id)[0].body, data.body).filter(l => l.added || l.removed);

                    diffSupportArticleText = diffSupportArticle.map(article => `${article.added ? '+' : '-'} ${article.value}`).join('\n');

                    const embed = new EmbedMaker(client)
                        .setColor(colors.yellow)
                        .setTitle('Updated Support Article')
                        .setFields(
                            {
                                name: 'Link',
                                value: data.html_url,
                                inline: false
                            },
                            {
                                name: 'Id',
                                value: data.id.toString(),
                                inline: true
                            },
                            {
                                name: 'Author Id',
                                value: data.author_id.toString(),
                                inline: true
                            },
                            {
                                name: 'Comments Enabled',
                                value: data.comments_disabled ? '❌' : '✅',
                                inline: true
                            },
                            {
                                name: 'Draft',
                                value: data.draft ? '✅' : '❌',
                                inline: true
                            },
                            {
                                name: 'Section Id',
                                value: data.section_id.toString(),
                                inline: true
                            },
                            {
                                name: 'Created At',
                                value: `<t:${Math.floor(new Date(data.created_at).getTime() / 1000)}:R>`,
                                inline: true
                            },
                            {
                                name: 'Updated At',
                                value: `<t:${Math.floor(new Date(data.updated_at).getTime() / 1000)}:R>`,
                                inline: true
                            },
                            {
                                name: 'Name',
                                value: data.name,
                                inline: true
                            },
                            {
                                name: 'Title',
                                value: data.title,
                                inline: true
                            },
                            {
                                name: 'Outdated',
                                value: data.outdated ? '✅' : '❌',
                                inline: true
                            },
                            {
                                name: 'Outdated Locales',
                                value: data.outdated_locales.length > 0 ? data.outdated_locales.join(', ') : 'None',
                                inline: true
                            },
                            {
                                name: 'Tags',
                                value: data.label_names.length > 0 ? data.label_names.join(', ') : 'None',
                                inline: true
                            }
                        );

                    if (diffSupportArticleText !== '') embed.setDescription(`\`\`\`diff\n${diffSupportArticleText.length > 3500 ? `${diffSupportArticleText.slice(0, 3500)}...` : diffSupportArticleText}\`\`\``);

                    otherChangesWebhook.send({
                        content: `<@&${roleIds.otherChanges}> <@&${roleIds.urlStuff}>`,
                        embeds: [embed]
                    });

                    // Wait 3 seconds to prevent ratelimit
                    await new Promise(resolve => setTimeout(resolve, 3000));
                };

                for (let data of removed) {
                    const embed = new EmbedMaker(client)
                        .setColor(colors.red)
                        .setTitle('Removed Support Article')
                        .setFields(
                            {
                                name: 'Link',
                                value: data.html_url,
                                inline: false
                            },
                            {
                                name: 'Id',
                                value: data.id.toString(),
                                inline: true
                            },
                            {
                                name: 'Author Id',
                                value: data.author_id.toString(),
                                inline: true
                            },
                            {
                                name: 'Comments Enabled',
                                value: data.comments_disabled ? '❌' : '✅',
                                inline: true
                            },
                            {
                                name: 'Draft',
                                value: data.draft ? '✅' : '❌',
                                inline: true
                            },
                            {
                                name: 'Section Id',
                                value: data.section_id.toString(),
                                inline: true
                            },
                            {
                                name: 'Created At',
                                value: `<t:${Math.floor(new Date(data.created_at).getTime() / 1000)}:R>`,
                                inline: true
                            },
                            {
                                name: 'Updated At',
                                value: `<t:${Math.floor(new Date(data.updated_at).getTime() / 1000)}:R>`,
                                inline: true
                            },
                            {
                                name: 'Name',
                                value: data.name,
                                inline: true
                            },
                            {
                                name: 'Title',
                                value: data.title,
                                inline: true
                            },
                            {
                                name: 'Outdated',
                                value: data.outdated ? '✅' : '❌',
                                inline: true
                            },
                            {
                                name: 'Outdated Locales',
                                value: data.outdated_locales.length > 0 ? data.outdated_locales.join(', ') : 'None',
                                inline: true
                            },
                            {
                                name: 'Tags',
                                value: data.label_names.length > 0 ? data.label_names.join(', ') : 'None',
                                inline: true
                            }
                        )

                    otherChangesWebhook.send({
                        content: `<@&${roleIds.otherChanges}> <@&${roleIds.urlStuff}>`,
                        embeds: [embed]
                    });

                    // Wait 3 seconds to prevent ratelimit
                    await new Promise(resolve => setTimeout(resolve, 3000));
                };

                logger('success', 'SCRIPT', 'Generated response for', 'supportSections.js');
            };
        };
    } catch (error) {
        return logger('error', 'SCRIPT', 'Error checking articles', `${error?.response?.status} ${error?.response?.statusText}\n`, JSON.stringify(error?.response?.data ?? error, null, 4));
    };
};

client.on('ready', () => {
    logger('info', 'BOT', 'Logged in as', client.user.tag);
    logger('info', 'COMMAND', 'Registering commands');

    axios.put(`https://discord.com/api/v10/applications/${client.user.id}/commands`, client.commands.map(command => command.data.toJSON()), {
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bot ${process.env.DISCORD_TOKEN}`
        }
    }).then(() => logger('success', 'COMMAND', 'Registered commands')).catch(error => logger('error', 'COMMAND', 'Error while registering commands', `${error?.response?.status} ${error?.response?.statusText}\n`, JSON.stringify(error?.response?.data ?? error, null, 4)));

    checkScripts();
    checkArticles();
    setInterval(() => {
        checkScripts();
        checkArticles();
    }, 1000 * 60 * 3);
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
            }));
        };
    } else if (interaction.isMessageComponent()) {
        logger('debug', 'COMMAND', 'Received message component', `${interaction.customId} (${interaction.componentType})`, 'from', interaction.guild ? `${interaction.guild.name} (${interaction.guild.id})` : 'DMs', 'by', `${interaction.user.tag} (${interaction.user.id})`);

        try {
            switch (interaction.customId) {
                default: {
                    logger('warning', 'COMMAND', 'Message component', interaction.customId, 'not found');
                }
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
            switch (interaction.customId) {
                default: {
                    logger('warning', 'COMMAND', 'Modal', interaction.customId, 'not found');

                    return interaction.reply({
                        content: localize(interaction.locale, 'NOT_FOUND', 'Modal'),
                        ephemeral: true
                    });
                }
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
    };
});

client.login(process.env.DISCORD_TOKEN);