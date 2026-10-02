import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import LanguageDetector from 'i18next-browser-languagedetector'
import HttpBackend from 'i18next-http-backend'
import enSkin from '@/i18n/locales/en/skin.json'
import jaSkin from '@/i18n/locales/ja/skin.json'
import mySkin from '@/i18n/locales/my/skin.json'

i18n
  .use(HttpBackend)
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    fallbackLng: 'en',
    supportedLngs: ['en', 'my', 'ja'],
    debug: import.meta.env.DEV,
    interpolation: {
      escapeValue: false,
    },
    // The `skin` namespace (AI Skin Analysis) ships inside the bundle so those
    // screens never depend on a fetch. Every other namespace is still loaded on
    // demand from /locales/{lng}/{ns}.json.
    resources: {
      en: { skin: enSkin },
      ja: { skin: jaSkin },
      my: { skin: mySkin },
    },
    partialBundledLanguages: true,
    backend: {
      loadPath: '/locales/{{lng}}/{{ns}}.json',
    },
    detection: {
      order: ['localStorage', 'navigator', 'htmlTag'],
      caches: ['localStorage'],
    },
    react: {
      useSuspense: false,
    },
  })

export default i18n
