const { Client, Collection, WebhookClient } = require('discord.js');
const { readdirSync, writeFileSync, readFileSync } = require('node:fs');
const { default: axios } = require('axios');
const logger = require('./modules/logger');
const { localize } = require('./modules/localization');
const { ownerId, developerIds, roleIds } = require('../config');
const { execSync } = require('node:child_process');
const { diffChars } = require('diff');
const EmbedMaker = require('./modules/embed');

const client = new Client({
    intents: [
        'Guilds'
    ]
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

    try {
        currentOld = readFileSync('scripts/current.js').toString();
    } catch (error) {
        logger('error', 'SCRIPT', 'Error while reading script', 'current.js', `${error.code}\n`, JSON.stringify(error, null, 4));
    };

    try {
        stringsOld = readFileSync('scripts/strings.js').toString();
        stringsOld = JSON.parse(stringsOld);
    } catch (error) {
        logger('error', 'SCRIPT', 'Error while reading script', 'strings.js', `${error.code}\n`, JSON.stringify(error, null, 4));
    };

    let current;
    let strings;

    try {
        current = await axios.get('https://raw.githubusercontent.com/Discord-Datamining/Discord-Datamining/master/current.js');
    } catch (error) {
        return logger('error', 'SCRIPT', 'Error while fetching script', 'current.js', `${error.response.status} ${error.response.statusText}\n`, JSON.stringify(error.response.data, null, 4));
    };

    if (current.status === 200) current = current.data;
    else return logger('error', 'SCRIPT', 'Error while fetching script', 'current.js', `${current.status} ${current.statusText}\n`, JSON.stringify(current.data, null, 4));

    writeFileSync('scripts/current.js', current);
    logger('success', 'SCRIPT', 'Fetched code', 'current.js');

    try {
        strings = await axios.get('https://raw.githubusercontent.com/xHyroM/discord-datamining/master/data/client/strings.json');
    } catch (error) {
        return logger('error', 'SCRIPT', 'Error while fetching script', 'strings.js', `${error.response.status} ${error.response.statusText}\n`, JSON.stringify(error.response.data, null, 4));
    };

    if (strings.status === 200) strings = strings.data;
    else return logger('error', 'SCRIPT', 'Error while fetching script', 'strings.js', `${strings.status} ${strings.statusText}\n`, JSON.stringify(strings.data, null, 4));

    writeFileSync('scripts/strings.js', strings);
    logger('success', 'SCRIPT', 'Fetched code', 'strings.js');

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
        diff1 = diffChars(code1Old, code1);

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

    const extraStuffWebhook = new WebhookClient({
        url: process.env.EXTRA_STUFF_WEBHOOK
    });

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
                    content: diffCurrentText
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

        const embed = new EmbedMaker(client)
            .setTitle('Code Changes')
            .setDescription(response1.data.choices[0].message.content);

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

        if (added.length > 0 || removed.length > 0) {
            const embed = new EmbedMaker(client)
                .setTitle('Strings')
                .setDescription(`\`\`\`diff\n${removed.map(s => `- ${s}: ${stringsOld[s]}`).join('\n')}\n${changed.map(s => `- ${s}: ${stringsOld[s]}\n+ ${s}: ${strings[s]}`)}\n${added.map(s => `+ ${s}: ${strings[s]}`)}\n\`\`\``);

            embed.data.footer.text = 'Powered by xHyroM/discord-datamining';

            extraStuffWebhook.send({
                content: `<@&${roleIds.extraStuff}> <@&${roleIds.stringChanges}>`,
                embeds: [embed]
            });

            logger('success', 'SCRIPT', 'Generated response for', 'strings.js');
        };
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
    setInterval(checkScripts, 1000 * 60 * 3);
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
        if (command.category === 'Developer' && !developerIds.includes(interaction.user.id)) {
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

                    return interaction.reply({
                        content: localize(interaction.locale, 'NOT_FOUND', 'Message component'),
                        ephemeral: true
                    });
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