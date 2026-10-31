import {english} from './english.mjs?v=5.10.0';
// Exact lookup for developer-authored interface text only, never user or database content.
export const uiText=(german,language)=>language==='en'?(english[german]??german):german;
export const chooseText=(german,turkish,language)=>language==='tr'?turkish:uiText(german,language);
export const languageLocale=language=>({de:'de-DE',en:'en-GB',tr:'tr-TR'}[language]||'tr-TR');
export const nextLanguage=language=>({tr:'de',de:'en',en:'tr'}[language]||'tr');
