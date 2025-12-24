// i18n 类型声明
export interface TranslationResources {
  navbar: {
    title: string;
    menu: string;
    dashboard: string;
    statistics: string;
    settings: string;
    about: string;
  };
  common: {
    language: string;
    chinese: string;
    english: string;
  };
}

declare module 'i18next' {
  interface CustomTypeOptions {
    resources: {
      translation: TranslationResources;
    };
  }
}
