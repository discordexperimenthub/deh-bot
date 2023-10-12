const { write, useColor, LogType } = require('@tolga1452/logchu');

const LogType2 = {
	Info: 'info',
	Success: 'success',
	Warning: 'warning',
	Error: 'error',
	Debug: 'debug',
};

function color(c) {
	try {
		return useColor(c);
	} catch (error) {
		let config = require('../../logchu.config');

		return config.customColorPresets[c];
	}
}

/**
 * @param {LogType2} level
 * @param {string} type
 * @param  {...string} messages
 * @returns {void}
 */
module.exports = (level, type, ...messages) => {
	let text = [];
	let at = 0;

	for (let message of messages) {
		if (at === 0) {
			text.push({
				text: `${message} `,
				useDefault: true,
			});

			at = 1;
		} else if (at === 1) {
			text.push({
				text: `${message} `,
				color:
					level === LogType2.Info
						? color('infoItem')
						: level === LogType2.Success
						? color('successItem')
						: level === LogType2.Warning
						? color('warningItem')
						: level === LogType2.Error
						? color('errorItem')
						: level === LogType2.Debug
						? color('debugItem')
						: color('infoItem'),
				bold: true,
			});

			at = 0;
		}
	}

	write(
		{
			type:
				type === LogType2.Debug
					? LogType.Debug
					: type === LogType2.Error
					? LogType.Error
					: type === LogType2.Info
					? LogType.Info
					: type === LogType2.Warning
					? LogType.Warning
					: LogType.Normal,
			color:
				level === LogType2.Info
					? color('info')
					: level === LogType2.Success
					? color('success')
					: level === LogType2.Warning
					? color('warning')
					: level === LogType2.Error
					? color('error')
					: level === LogType2.Debug
					? color('debug')
					: color('info'),
			italic: type === LogType2.Debug,
		},
		{
			text: ` ${type} `,
			color:
				level === LogType2.Info
					? color('infoBackground')
					: level === LogType2.Success
					? color('successBackground')
					: level === LogType2.Warning
					? color('warningBackground')
					: level === LogType2.Error
					? color('errorBackground')
					: level === LogType2.Debug
					? color('debugBackground')
					: color('infoBackground'),
			bold: true,
		},
		{
			text: ' ',
			useDefault: true,
		},
		...text,
	);
};
