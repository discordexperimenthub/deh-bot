const { ColorPreset, fromChalk } = require('@tolga1452/logchu');
const chalk = require('chalk');

const config = {
	customColorPresets: {
		info: fromChalk(chalk.cyan(' ')),
		success: fromChalk(chalk.green(' ')),
		warning: fromChalk(chalk.yellow(' ')),
		error: fromChalk(chalk.red(' ')),
		debug: fromChalk(chalk.dim.magenta(' ')),
		infoItem: fromChalk(chalk.cyanBright(' ')),
		successItem: fromChalk(chalk.greenBright(' ')),
		infoBackground: fromChalk(chalk.bgBlue(' ')),
		debugBackground: fromChalk(chalk.dim.bgMagenta(' ')),
		debugItem: fromChalk(chalk.dim.magentaBright(' ')),
		successBackground: fromChalk(chalk.bgGreen(' ')),
		errorItem: fromChalk(chalk.redBright(' ')),
		errorBackground: fromChalk(chalk.bgRed(' ')),
		warningItem: fromChalk(chalk.yellowBright(' ')),
		warningBackground: fromChalk(chalk.bgYellow(' ')),
	},
};

module.exports = config;
