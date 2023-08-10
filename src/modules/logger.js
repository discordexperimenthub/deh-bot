const { useColor, write } = require("@tolga1452/logchu");

const LogType = {
    Info: 'info',
    Success: 'success',
    Warning: 'warning',
    Error: 'error',
    Debug: 'debug'
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
                color: level === LogType.Info ? useColor('infoItem') : level === LogType.Success ? useColor('successItem') : level === LogType.Warning ? useColor('warningItem') : level === LogType.Error ? useColor('errorItem') : level === LogType.Debug ? useColor('debugItem') : useColor('infoItem'),
                bold: true
            });

            at = 0;
        };
    };

    write(
        {
            type: type,
            color: level === LogType.Info ? useColor('info') : level === LogType.Success ? useColor('success') : level === LogType.Warning ? useColor('warning') : level === LogType.Error ? useColor('error') : level === LogType.Debug ? useColor('debug') : useColor('info'),
            italic: type === LogType.Debug
        },
        {
            text: ` ${type} `,
            color: level === LogType.Info ? useColor('infoBackground') : level === LogType.Success ? useColor('successBackground') : level === LogType.Warning ? useColor('warningBackground') : level === LogType.Error ? useColor('errorBackground') : level === LogType.Debug ? useColor('debugBackground') : useColor('infoBackground'),
            bold: true
        },
        {
            text: ' ',
            useDefault: true
        },
        ...text
    );
};