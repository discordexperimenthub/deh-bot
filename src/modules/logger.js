const { color, write, useColor } = require("@tolga1452/logchu");

const LogType = {
    Info: 'info',
    Success: 'success',
    Warning: 'warning',
    Error: 'error',
    Debug: 'debug'
};

function color(c) {
    try {
        return useColor(c);
    } catch (error) {
        let config = require('../../logchu.config');

        return config.customColorPresets[c];
    };
};

/**
 * @param {LogType} level 
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
                useDefault: true
            });

            at = 1;
        } else if (at === 1) {
            text.push({
                text: `${message} `,
                color: level === LogType.Info ? color('infoItem') : level === LogType.Success ? color('successItem') : level === LogType.Warning ? color('warningItem') : level === LogType.Error ? color('errorItem') : level === LogType.Debug ? color('debugItem') : color('infoItem'),
                bold: true
            });

            at = 0;
        };
    };

    write(
        {
            type: type,
            color: level === LogType.Info ? color('info') : level === LogType.Success ? color('success') : level === LogType.Warning ? color('warning') : level === LogType.Error ? color('error') : level === LogType.Debug ? color('debug') : color('info'),
            italic: type === LogType.Debug
        },
        {
            text: ` ${type} `,
            color: level === LogType.Info ? color('infoBackground') : level === LogType.Success ? color('successBackground') : level === LogType.Warning ? color('warningBackground') : level === LogType.Error ? color('errorBackground') : level === LogType.Debug ? color('debugBackground') : color('infoBackground'),
            bold: true
        },
        {
            text: ' ',
            useDefault: true
        },
        ...text
    );
};