import * as vscode from "vscode";
import * as fs from "fs";
import * as path from "path";

let extensionPath: string | undefined;

export const setExtensionPath = (path: string): void => {
  extensionPath = path;
};

interface Translations {
  [key: string]: string | Translations;
}

const loadTranslations = (lang: string): Translations => {
  let translationsPath: string;
  
  if (extensionPath) {
    translationsPath = path.join(extensionPath, "out", "i18n", `${lang}.json`);
  } else {
    translationsPath = path.join(__dirname, "..", "i18n", `${lang}.json`);
  }
  
  try {
    const fileContent = fs.readFileSync(translationsPath, "utf-8");
    const parsed = JSON.parse(fileContent) as unknown;
    return parsed as Translations;
  } catch {
    const defaultPath = extensionPath
      ? path.join(extensionPath, "out", "i18n", "en.json")
      : path.join(__dirname, "..", "i18n", "en.json");
    
    try {
      const fileContent = fs.readFileSync(defaultPath, "utf-8");
      return JSON.parse(fileContent) as Translations;
    } catch {
      return {} as Translations;
    }
  }
};

type TranslationKey = string;

const translationsCache: Record<string, Translations> = {};

const getTranslations = (lang: string): Translations => {
  if (!translationsCache[lang]) {
    translationsCache[lang] = loadTranslations(lang);
  }
  return translationsCache[lang];
};

export const getLanguage = (): string => {
  const config = vscode.workspace.getConfiguration("task-time-tracker");
  return config.get<string>("language", "en");
};

const getNestedValue = (
  obj: Translations,
  path: string
): string | undefined => {
  const keys = path.split(".");
  let current: Translations | string = obj;

  for (const key of keys) {
    if (current && typeof current === "object" && !Array.isArray(current) && key in current) {
      current = current[key];
    } else {
      return undefined;
    }
  }

  return typeof current === "string" ? current : undefined;
};

const formatString = (template: string, ...args: string[]): string => {
  return template.replace(/{(\d+)}/g, (match: string, index: string) => {
    const argIndex = parseInt(index, 10);
    return args[argIndex] !== undefined ? args[argIndex] : match;
  });
};

export const t = (key: TranslationKey, ...args: string[]): string => {
  const language = getLanguage();
  const translation = getTranslations(language);
  const fallbackTranslation = getTranslations("en");

  const value = getNestedValue(translation, key);

  if (!value) {
    const fallbackValue = getNestedValue(fallbackTranslation, key);
    if (fallbackValue) {
      return formatString(fallbackValue, ...args);
    }
    return key;
  }

  return formatString(value, ...args);
};

