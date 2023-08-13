const { EmbedBuilder, Client } = require("discord.js");
const { serverId, useServerIconForFooter, colors } = require("../../config");

module.exports = class EmbedMaker extends EmbedBuilder {
    /**
     * @param {Client} client 
     */
    constructor(client) {
        super();

        this.setColor(colors.blurple);
        this.setFooter({
            text: `Made with ❤️ by Discord Experiment Hub`,
            iconURL: useServerIconForFooter ? client.guilds.cache.get(serverId).iconURL({ forceStatic: true }) : client.user.displayAvatarURL({ forceStatic: true })
        });
    };

    /**
     * @param {string} text 
     */
    setFooterText(text) {
        this.data.footer.text = text;

        return this;
    };
};