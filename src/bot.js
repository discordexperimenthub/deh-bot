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
    let code1Old = '';
    let code2Old = '';

    try {
        code1Old = readFileSync('scripts/324c8a951a18de9ee5fb.js').toString();
    } catch (error) {
    };

    try {
        code2Old = readFileSync('scripts/fc2d75812a85e24e2458.js').toString();
    } catch (error) {
    };

    let code1;
    let code2;

    try {
        code1 = await axios.get('https://canary.discord.com/assets/324c8a951a18de9ee5fb.js');
    } catch (error) {
        return logger('error', 'SCRIPT', 'Error while fetching script', '324c8a951a18de9ee5fb.js', `${error.response.status} ${error.response.statusText}\n`, JSON.stringify(error.response.data, null, 4));
    };

    try {
        code2 = await axios.get('https://canary.discord.com/assets/fc2d75812a85e24e2458.js');
    } catch (error) {
        return logger('error', 'SCRIPT', 'Error while fetching script', 'fc2d75812a85e24e2458.js', `${error.response.status} ${error.response.statusText}\n`, JSON.stringify(error.response.data, null, 4));
    };

    if (code1.status === 200) code1 = code1.data;
    else return logger('error', 'SCRIPT', 'Error while fetching script', '324c8a951a18de9ee5fb.js', `${code1.status} ${code1.statusText}\n`, JSON.stringify(code1.data, null, 4));

    if (code2.status === 200) code2 = code2.data;
    else return logger('error', 'SCRIPT', 'Error while fetching script', 'fc2d75812a85e24e2458.js', `${code1.status} ${code1.statusText}\n`, JSON.stringify(code1.data, null, 4));

    writeFileSync('scripts/324c8a951a18de9ee5fb.js', code1);
    writeFileSync('scripts/fc2d75812a85e24e2458.js', code2);

    let options = {
        maxBuffer: 1024 * 1024 * 1000
    };

    code1 = execSync('beautifier ./scripts/324c8a951a18de9ee5fb.js', options).toString();
    code2 = execSync('beautifier ./scripts/fc2d75812a85e24e2458.js', options).toString();

    writeFileSync('scripts/324c8a951a18de9ee5fb.js', code1);
    writeFileSync('scripts/fc2d75812a85e24e2458.js', code2);

    logger('success', 'SCRIPT', 'Fetched script', '324c8a951a18de9ee5fb.js');
    logger('success', 'SCRIPT', 'Fetched script', 'fc2d75812a85e24e2458.js');

    let diff1;
    let diff1Text = '';

    if (code1Old !== '') {
        diff1 = diffChars(code1Old, code1);

        let last = [];
        let added = false;
        let removed = false;

        for (let part of diff1) {
            if (part.added) {
                diff1Text += `${(!added && !removed && last.length > 0) ? '\n\n...\n\n' : ''}${(!added && !removed) ? last.map(line => line).join('\n') : ''}${!added ? '<added>' : ''}${part.value}`;
                added = true;
            } else if (part.removed) {
                diff1Text += `${(!added && !removed && last.length > 0) ? '\n\n...\n\n' : ''}${(!added && !removed) ? last.map(line => line).join('\n') : ''}${!removed ? '<removed>' : ''}${part.value}`;
                removed = true;
            } else {
                last = part.value.split('\n').slice(-15);

                if (added) {
                    diff1Text += '</added>';
                    added = false;
                };
                if (removed) {
                    diff1Text += '</removed>';
                    removed = false;
                };
            };
        };

        writeFileSync('scripts/diff/324c8a951a18de9ee5fb.diff', diff1Text);
        logger('success', 'SCRIPT', 'Generated diff', '324c8a951a18de9ee5fb.diff');
    };

    let diff2;
    let diff2Text = '';

    if (code2Old !== '') {
        diff2 = diffChars(code2Old, code2);

        let last = [];
        let added = false;
        let removed = false;

        for (let part of diff2) {
            if (part.added) {
                diff2Text += `${(!added && !removed && last.length > 0) ? '\n\n...\n\n' : ''}${(!added && !removed) ? last.map(line => line).join('\n') : ''}${!added ? '<added>' : ''}${part.value}`;
                added = true;
            } else if (part.removed) {
                diff2Text += `${(!added && !removed && last.length > 0) ? '\n\n...\n\n' : ''}${(!added && !removed) ? last.map(line => line).join('\n') : ''}${!removed ? '<removed>' : ''}${part.value}`;
                removed = true;
            } else {
                last = part.value.split('\n').slice(-15);

                if (added) {
                    diff2Text += '</added>';
                    added = false;
                };
                if (removed) {
                    diff2Text += '</removed>';
                    removed = false;
                };
            };
        };

        writeFileSync('scripts/diff/fc2d75812a85e24e2458.diff', diff2Text);
        logger('success', 'SCRIPT', 'Generated diff', 'fc2d75812a85e24e2458.diff');
    };

    const extraStuffWebhook = new WebhookClient({
        url: process.env.EXTRA_STUFF_WEBHOOK
    });
    const otherChangesWebhook = new WebhookClient({
        url: process.env.OTHER_CHANGES_WEBHOOK
    });

    let response1;

    if (diff1Text !== '') try {
        response1 = await axios.post('https://beta.purgpt.xyz/openai/chat/completions', {
            model: 'gpt-3.5-turbo-16k',
            messages: [
                {
                    role: 'system',
                    content: 'You are Dataminer. You will analyze the given script and report any changes. Our system will give you last 15 lines of the script before the changes. Codes have special tags for highlighting changes. <added>Added codes</added> and <removed>Removed codes</removed>. You can use these tags to highlight changes in your report.\n\nYou have to respond with DIFF format using this template:\n\n```diff\n+ Added line\n- Removed line\n```'
                },
                {
                    role: 'user',
                    content: diff1Text
                }
            ]
        }, {
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${process.env.PURGPT_API_KEY}`
            }
        });
    } catch (error) {
        return logger('error', 'SCRIPT', 'Error while generating response for', '324c8a951a18de9ee5fb.diff', `${error?.response?.status} ${error?.response?.statusText}\n`, JSON.stringify(error?.response?.data ?? error, null, 4));
    };

    if (response1) {
        logger('success', 'SCRIPT', 'Generated response for', '324c8a951a18de9ee5fb.diff');

        const embed = new EmbedMaker(client)
            .setTitle('Code Changes')
            .setDescription(response1.data.choices[0].message.content)
            .addFields({
                name: 'Script',
                value: '324c8a951a18de9ee5fb.js'
            });

        embed.data.footer.text = 'Powered by purgpt.xyz';

        extraStuffWebhook.send({
            content: `<@&${roleIds.extraStuff}> <@&${roleIds.codeChanges}>`,
            embeds: [embed]
        });
    };

    if (diff2Text !== '') try {
        response1 = await axios.post('https://beta.purgpt.xyz/openai/chat/completions', {
            model: 'gpt-3.5-turbo-16k',
            messages: [
                {
                    role: 'system',
                    content: 'You are Dataminer. You will analyze the given script and report any changes. Our system will give you last 15 lines of the script before the changes. Codes have special tags for highlighting changes. <added>Added codes</added> and <removed>Removed codes</removed>. You can use these tags to highlight changes in your report.\n\nYou have to respond with DIFF format using this template:\n\n```diff\n+ Added line\n- Removed line\n```'
                },
                {
                    role: 'user',
                    content: diff2Text
                }
            ]
        }, {
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${process.env.PURGPT_API_KEY}`
            }
        });
    } catch (error) {
        return logger('error', 'SCRIPT', 'Error while generating response for', 'fc2d75812a85e24e2458.diff', `${error?.response?.status} ${error?.response?.statusText}\n`, JSON.stringify(error?.response?.data ?? error, null, 4));
    };

    if (response1) {
        logger('success', 'SCRIPT', 'Generated response for', 'fc2d75812a85e24e2458.diff');

        const embed = new EmbedMaker(client)
            .setTitle('Code Changes')
            .setDescription(response1.data.choices[0].message.content)
            .addFields({
                name: 'Script',
                value: 'fc2d75812a85e24e2458.js'
            });

        embed.data.footer.text = 'Powered by purgpt.xyz';

        extraStuffWebhook.send({
            content: `<@&${roleIds.extraStuff}> <@&${roleIds.codeChanges}>`,
            embeds: [embed]
        });
    };

    // Wait for 5 seconds

    await new Promise(resolve => setTimeout(resolve, 5000));

    let response;

    if (diff2Text.includes('707801')) try {
        response = await axios.post('https://beta.purgpt.xyz/openai/chat/completions', {
            model: 'gpt-3.5-turbo-16k',
            messages: [
                {
                    role: 'system',
                    content: 'You are Dataminer. You will analyze the given script and report any changes. Our system will give you last 15 lines of the script before the changes. Codes have special tags for highlighting changes. <added>Added codes</added> and <removed>Removed codes</removed>. You can use these tags to highlight changes in your report.\n\nYou have to respond with DIFF format using this template:\n\n```diff\n+ Added line\n- Removed line\n```'
                },
                {
                    role: 'system',
                    content: 'Your current job is catching font changes. You have to report any font changes in the script. Here is an example of font codes:\n```\nvar r = {\n\t".ggsans-400-normal.woff2": [166551, 66551],\n\t...\n}\n```\n\nYou have to respond with JSON format using this template:\n\n```json\n{\t"fontsChanged": true, // Whether fonts changed or not\n\t"changes": "- Removed font\n+ Added font\n+ Added font 2"\n}\n```'
                },
                {
                    role: 'user',
                    content: diff2Text
                }
            ]
        }, {
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${process.env.PURGPT_API_KEY}`
            }
        });
    } catch (error) {
        return logger('error', 'SCRIPT', 'Error while generating response for', 'fc2d75812a85e24e2458.diff', `${error?.response?.status} ${error?.response?.statusText}\n`, JSON.stringify(error?.response?.data ?? error, null, 4));
    };
    if (response) {
        let jsonRegex = /```json\n([\s\S]+?)\n```/g;
        let jsonMatch = jsonRegex.exec(response.data.choices[0].message.content);

        if (jsonMatch) {
            let json = JSON.parse(jsonMatch[1]);

            if (json.fontsChanged) {
                const embed = new EmbedMaker(client)
                    .setTitle('Fonts')
                    .setDescription(`\`\`\`diff\n${json.changes}\n\`\`\``)

                embed.data.footer.text = 'Powered by purgpt.xyz';

                otherChangesWebhook.send({
                    content: `<@&${roleIds.otherChanges}> <@&${roleIds.assets}>`,
                    embeds: [embed]
                });
            };
        };
    };

    response = null;

    await new Promise(resolve => setTimeout(resolve, 3000));

    if (diff2Text !== '') try {
        response = await axios.post('https://beta.purgpt.xyz/openai/chat/completions', {
            model: 'gpt-3.5-turbo-16k',
            messages: [
                {
                    role: 'system',
                    content: 'You are Dataminer. You will analyze the given script and report any changes. Our system will give you last 15 lines of the script before the changes. Codes have special tags for highlighting changes. <added>Added codes</added> and <removed>Removed codes</removed>. You can use these tags to highlight changes in your report.\n\nYou have to respond with DIFF format using this template:\n\n```diff\n+ Added line\n- Removed line\n```'
                },
                {
                    role: 'system',
                    content: 'Your current job is catching en-Us string changes. You have to report any en-US string changes in the script. Here is an example of string codes:\n```\ne.GUILD_CREATE_INVITE_SUGGESTION = "Guild Create Invite Suggestion";\n...\n```\n\nYou have to respond with JSON format using this template:\n\n```json\n{\t"stringsChanged": true, // Whether strings changed or not\n\t"changes": "- REMOVED_STRING_KEY: Removed string value\n+ ADDED_STRING_KEY: Added string value\n+ ADDED_STRING_KEY_2: Added string value 2"\n}\n```'
                },
                {
                    role: 'user',
                    content: diff2Text
                }
            ]
        }, {
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${process.env.PURGPT_API_KEY}`
            }
        });
    } catch (error) {
        return logger('error', 'SCRIPT', 'Error while generating response for', 'fc2d75812a85e24e2458.diff', `${error?.response?.status} ${error?.response?.statusText}\n`, JSON.stringify(error?.response?.data ?? error, null, 4));
    };
    if (response) {
        let jsonRegex = /```json\n([\s\S]+?)\n```/g;
        let jsonMatch = jsonRegex.exec(response.data.choices[0].message.content);

        if (jsonMatch) {
            let json = JSON.parse(jsonMatch[1]);

            if (json.fontsChanged) {
                const embed = new EmbedMaker(client)
                    .setTitle('Strings')
                    .setDescription(`\`\`\`diff\n${json.changes}\n\`\`\``)

                embed.data.footer.text = 'Powered by purgpt.xyz';

                otherChangesWebhook.send({
                    content: `<@&${roleIds.otherChanges}> <@&${roleIds.assets}>`,
                    embeds: [embed]
                });
            };
        };
    };

    response = null;

    await new Promise(resolve => setTimeout(resolve, 3000));

    if (diff2Text !== '') try {
        response = await axios.post('https://beta.purgpt.xyz/openai/chat/completions', {
            model: 'gpt-3.5-turbo-16k',
            messages: [
                {
                    role: 'system',
                    content: 'You are Dataminer. You will analyze the given script and report any changes. Our system will give you last 15 lines of the script before the changes. Codes have special tags for highlighting changes. <added>Added codes</added> and <removed>Removed codes</removed>. You can use these tags to highlight changes in your report.\n\nYou have to respond with DIFF format using this template:\n\n```diff\n+ Added line\n- Removed line\n```'
                },
                {
                    role: 'system',
                    content: 'Your current job is catching asset changes. You have to report any asset changes in the script. Here is an example of asset codes:\n```\n755383: (e, t, n) = > {\n\te.exports = n.p + "f71e975b91ac8ecddbb1a68c6c96e63b.png"\n},\n...\n```\n\nYou have to respond with JSON format using this template:\n\n```json\n{\t"assetsChanged": true, // Whether assets changed or not\n\t"changes": "- https://canary.discord.com/removed_asset.png\n+ https://canary.discord.com/added_asset.png\n+ https://canary.discord.com/added_asset_2.png"\n}\n```'
                },
                {
                    role: 'user',
                    content: diff2Text
                }
            ]
        }, {
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${process.env.PURGPT_API_KEY}`
            }
        });
    } catch (error) {
        return logger('error', 'SCRIPT', 'Error while generating response for', 'fc2d75812a85e24e2458.diff', `${error?.response?.status} ${error?.response?.statusText}\n`, JSON.stringify(error?.response?.data ?? error, null, 4));
    };
    if (response) {
        let jsonRegex = /```json\n([\s\S]+?)\n```/g;
        let jsonMatch = jsonRegex.exec(response.data.choices[0].message.content);

        if (jsonMatch) {
            let json = JSON.parse(jsonMatch[1]);

            if (json.assetsChanged) {
                const embed = new EmbedMaker(client)
                    .setTitle('Desktop Assets')
                    .setDescription(`\`\`\`diff\n${json.changes}\n\`\`\``)

                embed.data.footer.text = 'Powered by purgpt.xyz';

                otherChangesWebhook.send({
                    content: `<@&${roleIds.otherChanges}> <@&${roleIds.assets}>`,
                    embeds: [embed]
                });
            };
        };
    };

    response = null;

    await new Promise(resolve => setTimeout(resolve, 3000));

    if (diff2Text !== '') try {
        response = await axios.post('https://beta.purgpt.xyz/openai/chat/completions', {
            model: 'gpt-3.5-turbo-16k',
            messages: [
                {
                    role: 'system',
                    content: 'You are Dataminer. You will analyze the given script and report any changes. Our system will give you last 15 lines of the script before the changes. Codes have special tags for highlighting changes. <added>Added codes</added> and <removed>Removed codes</removed>. You can use these tags to highlight changes in your report.\n\nYou have to respond with DIFF format using this template:\n\n```diff\n+ Added line\n- Removed line\n```'
                },
                {
                    role: 'system',
                    content: 'Your current job is catching endpoint changes. You have to report any endpoint changes in the script. Here is an example of endpoint codes:\n```\nCHANNEL_FOLLOWER_STATS: function(e) {\n\treturn "/channels/".concat(e, "/follower-stats")\n},\nFRIEND_FINDER: "/friend-finder/find-friends",\n...\n\n```\n\nYou have to respond with JSON format using this template:\n\n```json\n{\t"endpointsChanged": true, // Whether endpoints changed or not\n\t"changes": "- REMOVED_ENDPOINT_KEY: /removed/:parameter1/endpoint\n+ ADDED_ENDPOINT_KEY: /added/:parameter1\n..."\n}\n```'
                },
                {
                    role: 'user',
                    content: diff2Text
                }
            ]
        }, {
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${process.env.PURGPT_API_KEY}`
            }
        });
    } catch (error) {
        return logger('error', 'SCRIPT', 'Error while generating response for', 'fc2d75812a85e24e2458.diff', `${error?.response?.status} ${error?.response?.statusText}\n`, JSON.stringify(error?.response?.data ?? error, null, 4));
    };
    if (response) {
        let jsonRegex = /```json\n([\s\S]+?)\n```/g;
        let jsonMatch = jsonRegex.exec(response.data.choices[0].message.content);

        if (jsonMatch) {
            let json = JSON.parse(jsonMatch[1]);

            if (json.endpointsChanged) {
                const embed = new EmbedMaker(client)
                    .setTitle('Endpoints')
                    .setDescription(`\`\`\`diff\n${json.changes}\n\`\`\``)

                embed.data.footer.text = 'Powered by purgpt.xyz';

                otherChangesWebhook.send({
                    content: `<@&${roleIds.otherChanges}> <@&${roleIds.urlStuff}>`,
                    embeds: [embed]
                });
            };
        };
    };

    response = null;

    await new Promise(resolve => setTimeout(resolve, 3000));

    if (diff2Text !== '') try {
        response = await axios.post('https://beta.purgpt.xyz/openai/chat/completions', {
            model: 'gpt-3.5-turbo-16k',
            messages: [
                {
                    role: 'system',
                    content: 'You are Dataminer. You will analyze the given script and report any changes. Our system will give you last 15 lines of the script before the changes. Codes have special tags for highlighting changes. <added>Added codes</added> and <removed>Removed codes</removed>. You can use these tags to highlight changes in your report.\n\nYou have to respond with DIFF format using this template:\n\n```diff\n+ Added line\n- Removed line\n```'
                },
                {
                    role: 'system',
                    content: 'Your current job is catching error code changes. You have to report any error codes changes in the script. Here is an example of error code codes:\n```\ne[e.UNKNOWN_ERROR = 1e3] = "UNKNOWN_ERROR";\n...\n```\n\nBut be careful, some things may like these codes but may not an error code. You have to respond with JSON format using this template:\n\n```json\n{\t"errorCodesChanged": true, // Whether error codes changed or not\n\t"changes": "- REMOVED_ERROR_NAME: 1003\n+ ADDED_ERROR_NAME: 1035\n}\n```'
                },
                {
                    role: 'user',
                    content: diff2Text
                }
            ]
        }, {
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${process.env.PURGPT_API_KEY}`
            }
        });
    } catch (error) {
        return logger('error', 'SCRIPT', 'Error while generating response for', 'fc2d75812a85e24e2458.diff', `${error?.response?.status} ${error?.response?.statusText}\n`, JSON.stringify(error?.response?.data ?? error, null, 4));
    };
    if (response) {
        let jsonRegex = /```json\n([\s\S]+?)\n```/g;
        let jsonMatch = jsonRegex.exec(response.data.choices[0].message.content);

        if (jsonMatch) {
            let json = JSON.parse(jsonMatch[1]);

            if (json.errorCodesChanged) {
                const embed = new EmbedMaker(client)
                    .setTitle('Error Codes')
                    .setDescription(`\`\`\`diff\n${json.changes}\n\`\`\``)

                embed.data.footer.text = 'Powered by purgpt.xyz';

                otherChangesWebhook.send({
                    content: `<@&${roleIds.otherChanges}> <@&${roleIds.types}>`,
                    embeds: [embed]
                });
            };
        };
    };

    response = null;

    await new Promise(resolve => setTimeout(resolve, 3000));

    if (diff2Text !== '') try {
        response = await axios.post('https://beta.purgpt.xyz/openai/chat/completions', {
            model: 'gpt-3.5-turbo-16k',
            messages: [
                {
                    role: 'system',
                    content: 'You are Dataminer. You will analyze the given script and report any changes. Our system will give you last 15 lines of the script before the changes. Codes have special tags for highlighting changes. <added>Added codes</added> and <removed>Removed codes</removed>. You can use these tags to highlight changes in your report.\n\nYou have to respond with DIFF format using this template:\n\n```diff\n+ Added line\n- Removed line\n```'
                },
                {
                    role: 'system',
                    content: 'Your current job is catching audit log type changes. You have to report any audit log type changes in the script. Here is an example of audit log type codes:\n```\nCHANNEL_CREATE: 10,\n...\n```\n\nBut be careful, some things may like these codes but may not an error code. You have to respond with JSON format using this template:\n\n```json\n{\t"auditLogTypesChanged": true, // Whether audit log types changed or not\n\t"changes": "- REMOVED_LOG_TYPE_NAME: 11\n+ ADDED_LOG_TYPE_NAME: 15\n}\n```'
                },
                {
                    role: 'user',
                    content: diff2Text
                }
            ]
        }, {
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${process.env.PURGPT_API_KEY}`
            }
        });
    } catch (error) {
        return logger('error', 'SCRIPT', 'Error while generating response for', 'fc2d75812a85e24e2458.diff', `${error?.response?.status} ${error?.response?.statusText}\n`, JSON.stringify(error?.response?.data ?? error, null, 4));
    };
    if (diff2Text !== '') if (response) {
        let jsonRegex = /```json\n([\s\S]+?)\n```/g;
        let jsonMatch = jsonRegex.exec(response.data.choices[0].message.content);

        if (jsonMatch) {
            let json = JSON.parse(jsonMatch[1]);

            if (json.auditLogTypesChanged) {
                const embed = new EmbedMaker(client)
                    .setTitle('Audit Log Types')
                    .setDescription(`\`\`\`diff\n${json.changes}\n\`\`\``)

                embed.data.footer.text = 'Powered by purgpt.xyz';

                otherChangesWebhook.send({
                    content: `<@&${roleIds.otherChanges}> <@&${roleIds.types}>`,
                    embeds: [embed]
                });
            };
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