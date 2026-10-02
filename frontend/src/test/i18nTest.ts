import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import enRaw from '../i18n/locales/en/skin.json?raw'

let initialized = false

/**
 * Boots the real i18next instance with the shipped `en/skin.json` bundle so
 * component tests assert on the actual copy users see.
 */
export async function initTestI18n(): Promise<void> {
  if (initialized) return

  i18n.use(initReactI18next)
  await i18n.init({
    lng: 'en',
    fallbackLng: 'en',
    defaultNS: 'skin',
    ns: ['skin'],
    resources: {
      en: { skin: JSON.parse(enRaw) as Record<string, unknown> },
    },
    interpolation: { escapeValue: false },
    returnNull: false,
  })

  initialized = true
}
