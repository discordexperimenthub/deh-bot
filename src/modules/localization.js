const logger = require('./logger.js');

const locales = {
    'en-US': require('../i18n/en-US.js'),
    tr: require('../i18n/tr.js'),
    de: require('../i18n/de.js'),
    'es-ES': require('../i18n/es-ES.js'),
};

module.exports.locales = locales;

/**
 * @param {string} locale 
 * @param {string} id 
 * @returns {string}
 */
module.exports.localize = (locale, id, ...params) => {
    let localized = locales?.[locale]?.[id];

    if (!localized) {
        logger('warning', 'LOCALIZATION', 'Localization of', id, 'for', locale, 'not found');

        localized = locales['en-US'][id];
    };
    if (!localized) {
        logger('error', 'LOCALIZATION', 'Localization of', id, 'for', 'en-US', 'not found');

        localized = 'Localization not found';
    };

    if (localized) if (params.length > 0) for (let i = 0; i < params.length; i++) {
        localized = localized.replace(`{{${i}}}`, params[i]);
    };

    return localized;
};

/**
 * @param {string} locale 
 * @returns {number}
 */
module.exports.getPercentage = (locale) => {
    let localeKeys = Object.keys(locales['en-US']);
    let percentage = 0;

    for (let key of localeKeys) {
        if (locales[locale]?.[key]) percentage++;
    };

    return Math.round(percentage / localeKeys.length * 100);
};
