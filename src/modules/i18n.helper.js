const { locales } = require("./localization");
const logger = require('./logger');

function getUntranslatedKeys(locale) {
  let localeKeys = Object.keys(locales["en-US"]);
  let percentage = 0;

  for (let key of localeKeys) {
    if (locales[locale]?.[key]) {
      percentage++;
    } else {
        logger('info', 'I18N', `Untranslated Key (${locale}):`, key);
    }
  }

  return logger('success', 'I18N', `Translated (${locale}):`,  Math.round((percentage / localeKeys.length) * 100) + "%")
}

(() => {
  const locale = process.argv[2];
  if(locale && locales[locale]) {
    getUntranslatedKeys(locale);
  }
  else {
    logger('warning', 'I18N', `Can not find "${locale ?? "Not provided"}"!`,  "Using default locale: \"de\"")
    getUntranslatedKeys("de");
  }
})();
