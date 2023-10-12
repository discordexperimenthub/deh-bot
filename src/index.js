const { ShardingManager } = require('discord.js');
const { config } = require('dotenv');
const logger = require('./modules/logger');

config();

const manager = new ShardingManager('src/bot.js', {
	token: process.env.DISCORD_TOKEN,
});

manager.on('shardCreate', (shard) => logger('info', 'SHARD', 'Launched shard', shard.id.toString()));

manager.spawn();
