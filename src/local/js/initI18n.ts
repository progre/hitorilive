import debug from 'debug';
import i18n from 'i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import Backend from 'i18next-xhr-backend';

export default async function initI18n() {
  await new Promise((resolve, reject) => {
    const opts: i18n.InitOptions = {
      backend: {
        loadPath: 'locales/{{lng}}.json',
      },
      fallbackLng: 'en',

      ns: ['translations'],
      defaultNS: 'translations',

      debug: debug.enabled('hitorilive:*'),

      interpolation: {
        escapeValue: false, // not needed for react!!
      },

      react: {
        wait: true,
      },
    };
    i18n
      .use(Backend)
      .use(LanguageDetector)
      .init(opts, resolve);
  });
}
