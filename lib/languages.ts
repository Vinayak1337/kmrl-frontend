// Centralized definitions for Indian and supported languages in DocSetu

export interface LanguageDefinition {
	code: string;
	name: string;
	nativeName: string;
}

export const SUPPORTED_LANGUAGES: LanguageDefinition[] = [
	{ code: 'hi', name: 'Hindi', nativeName: 'हिन्दी' },
	{ code: 'ml', name: 'Malayalam', nativeName: 'മലയാളം' },
	{ code: 'ta', name: 'Tamil', nativeName: 'தமிழ்' },
	{ code: 'te', name: 'Telugu', nativeName: 'తెలుగు' },
	{ code: 'kn', name: 'Kannada', nativeName: 'ಕನ್ನಡ' },
	{ code: 'bn', name: 'Bengali', nativeName: 'বাংলা' },
	{ code: 'mr', name: 'Marathi', nativeName: 'मराठी' },
	{ code: 'gu', name: 'Gujarati', nativeName: 'ગુજરાતી' },
	{ code: 'pa', name: 'Punjabi', nativeName: 'ਪੰਜਾਬੀ' },
	{ code: 'or', name: 'Odia', nativeName: 'ଓଡ଼ିଆ' },
	{ code: 'as', name: 'Assamese', nativeName: 'অসমীয়া' },
	{ code: 'ur', name: 'Urdu', nativeName: 'اردو' },
	{ code: 'sa', name: 'Sanskrit', nativeName: 'संस्कृतम्' },
	{ code: 'en', name: 'English', nativeName: 'English' }
];

export const VALID_LANGUAGES = SUPPORTED_LANGUAGES.map(l => l.name);

export const LANGUAGE_CODE_MAP: Record<string, string> = SUPPORTED_LANGUAGES.reduce(
	(acc, lang) => {
		acc[lang.name] = lang.code;
		return acc;
	},
	{} as Record<string, string>
);

export const CODE_TO_LANGUAGE_MAP: Record<string, string> = SUPPORTED_LANGUAGES.reduce(
	(acc, lang) => {
		acc[lang.code] = lang.name;
		return acc;
	},
	{} as Record<string, string>
);

export function getLanguageCode(languageName: string): string {
	return SUPPORTED_LANGUAGES.find(language => [language.code, language.name.toLowerCase()].includes(languageName.trim().toLowerCase()))?.code || 'en';
}

export function getLanguageName(codeOrName: string): string {
	return SUPPORTED_LANGUAGES.find(language => [language.code, language.name.toLowerCase()].includes(codeOrName.trim().toLowerCase()))?.name || codeOrName;
}
