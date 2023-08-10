const { EmbedBuilder, Client } = require("discord.js");
const { serverId, useServerIconForFooter } = require("../../config");

module.exports = class EmbedMaker extends EmbedBuilder {
    /**
     * @param {Client} client 
     */
    constructor(client) {
        super();

        this.setColor('5865F2');
        this.setFooter({
            text: `Made with ❤️ by Discord Experiment Hub`,
            iconURL: useServerIconForFooter ? client.guilds.cache.get(serverId).iconURL({ forceStatic: true }) : client.user.displayAvatarURL({ forceStatic: true })
        });
    };
};