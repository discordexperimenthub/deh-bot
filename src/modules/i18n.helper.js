const { locales } = require("./localization");
const logger = require("./logger");

function getUntranslatedKeys(locale) {
  let localeKeys = Object.keys(locales["en-US"]);
  let percentage = 0;

  for (let key of localeKeys) {
    if (locales[locale]?.[key]) {
      percentage++;
    } else {
      logger("info", "I18N", `Untranslated Key (${locale}):`, key);
    }
  }

  return logger(
    "success",
    "I18N",
    `Translated (${locale}):`,
    Math.round((percentage / localeKeys.length) * 100) + "%"
  );
}

(() => {
  const mode = process.argv[2];

  if (Object.keys(locales).includes(mode)) {
    const locale = process.argv[2];

    if (locale && locales[locale]) {
      return getUntranslatedKeys(locale);
    } else {
      return logger(
        "warning",
        "I18N",
        `Can not find "${
          locale ?? "Unknown"
        }"! Current supported locales: ${Object.keys(locales).join(", ")}`
      );
    }
  }

  if (mode === "all") {
    Object.keys(locales).forEach((key) => {
      getUntranslatedKeys(key);
    });
    return logger("success", "I18N", `Everything done!`);
  } else {
    return logger("error", "I18N", `No valid mode or lang was provided`);
  }
})();
