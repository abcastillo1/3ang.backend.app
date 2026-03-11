import i18next from 'i18next';
import Backend from 'i18next-fs-backend';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readdirSync, lstatSync, readFileSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const translationsPath = join(__dirname, '../assets/translations');

const loadTranslations = () => {
  const resources = {};
  
  try {
    const files = readdirSync(translationsPath);
    
    files.forEach(file => {
      if (file.endsWith('.json')) {
        const lang = file.replace('.json', '');
        const filePath = join(translationsPath, file);
        
        if (lstatSync(filePath).isFile()) {
          const translations = JSON.parse(
            readFileSync(filePath, 'utf8')
          );
          resources[lang] = { translation: translations };
        }
      }
    });
  } catch (error) {
    console.warn('Could not load translations:', error.message);
  }
  
  return resources;
};

i18next
  .use(Backend)
  .init({
    lng: 'es',
    fallbackLng: 'es',
    resources: loadTranslations(),
    interpolation: {
      escapeValue: false
    }
  });

const LANG_MAP = { es: 'es', en: 'en', 'es-EC': 'es', 'es-ES': 'es', 'en-US': 'en', 'en-GB': 'en' };

export function getActivityDescription(key, metadata, locale = 'es') {
  const lang = LANG_MAP[locale] || locale?.slice(0, 2) || 'es';
  const lookupKey = (key === 'activity.project.updated' && metadata?.statusChanged)
    ? 'activity.project.updatedStatus'
    : key;
  i18next.changeLanguage(lang);
  return i18next.t(lookupKey, metadata || {});
}

export default function i18nMiddleware(req, res, next) {
  const acceptLanguage = req.headers['accept-language'];
  let lang = 'es';
  
  if (acceptLanguage) {
    const preferredLang = acceptLanguage.split(',')[0].split('-')[0];
    if (i18next.hasResourceBundle(preferredLang, 'translation')) {
      lang = preferredLang;
    }
  }
  
  i18next.changeLanguage(lang);
  
  req.translate = (key, options = {}) => {
    return i18next.t(key, options);
  };
  
  next();
}
