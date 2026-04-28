 
import React, { createContext, useContext, useState, useEffect } from 'react';
import { safeStorage } from '../utils/storage';

type Language = 'id' | 'en' | 'ja' | 'es' | 'fr' | 'de' | 'ko' | 'zh' | 'ar' | 'ru' | 'pt' | 'hi';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const translations: Record<Language, Record<string, string>> = {
  id: {
    'settings.title': 'PENGATURAN',
    'settings.general': 'Umum',
    'settings.api': 'Konfigurasi API',
    'settings.privacy': 'Privasi & Keamanan',
    'settings.appearance': 'Tampilan & Tema',
    'settings.performance': 'Kinerja AI',
    'settings.content': 'Konten & Izin',
    'settings.autofill': 'Isi Otomatis',
    'settings.downloads': 'Download',
    'settings.about': 'Tentang Ham',
    'settings.brain': 'Install Otak (GGUF)',
    'settings.searchEngine': 'Mesin Pencari Default',
    'settings.searchEngineDesc': 'Pilih mesin pencari utama untuk omnibox',
    'settings.language': 'Bahasa',
    'settings.languageDesc': 'Bahasa antarmuka pengguna',
    'settings.defaultBrowser': 'Browser Default',
    'settings.defaultBrowserDesc': 'Jadikan Ham Browser sebagai default',
    'settings.reset': 'Reset Pengaturan',
    'settings.resetDesc': 'Kembalikan ke pengaturan awal pabrik',
    'settings.setAsDefault': 'Jadikan Default',
    'settings.installed': 'Terpasang',
    'settings.resetBtn': 'Reset Default',
    'browser.searchPlaceholder': 'Telusuri Google atau ketik URL',
    'browser.openExternal': 'Buka di Browser Eksternal',
  },
  en: {
    'settings.title': 'SETTINGS',
    'settings.general': 'General',
    'settings.api': 'API Configuration',
    'settings.privacy': 'Privacy & Security',
    'settings.appearance': 'Appearance & Theme',
    'settings.performance': 'AI Performance',
    'settings.content': 'Content & Permissions',
    'settings.autofill': 'Autofill',
    'settings.downloads': 'Downloads',
    'settings.about': 'About Ham',
    'settings.brain': 'Install Brain (GGUF)',
    'settings.searchEngine': 'Default Search Engine',
    'settings.searchEngineDesc': 'Choose the main search engine for the omnibox',
    'settings.language': 'Language',
    'settings.languageDesc': 'User interface language',
    'settings.defaultBrowser': 'Default Browser',
    'settings.defaultBrowserDesc': 'Make Ham Browser the default',
    'settings.reset': 'Reset Settings',
    'settings.resetDesc': 'Restore to factory default settings',
    'settings.setAsDefault': 'Set as Default',
    'settings.installed': 'Installed',
    'settings.resetBtn': 'Reset Default',
    'browser.searchPlaceholder': 'Search Google or type a URL',
    'browser.openExternal': 'Open in External Browser',
  },
  ja: {
    'settings.title': '設定',
    'settings.general': '一般',
    'settings.api': 'API設定',
    'settings.privacy': 'プライバシーとセキュリティ',
    'settings.appearance': '外観とテーマ',
    'settings.performance': 'AIパフォーマンス',
    'settings.content': 'コンテンツと権限',
    'settings.autofill': '自動入力',
    'settings.downloads': 'ダウンロード',
    'settings.about': 'Hamについて',
    'settings.brain': '脳をインストール (GGUF)',
    'settings.searchEngine': 'デフォルトの検索エンジン',
    'settings.searchEngineDesc': 'オムニボックスのメイン検索エンジンを選択',
    'settings.language': '言語',
    'settings.languageDesc': 'ユーザーインターフェース言語',
    'settings.defaultBrowser': 'デフォルトブラウザ',
    'settings.defaultBrowserDesc': 'Hamブラウザをデフォルトにする',
    'settings.reset': '設定をリセット',
    'settings.resetDesc': '工場出荷時のデフォルト設定に戻す',
    'settings.setAsDefault': 'デフォルトに設定',
    'settings.installed': 'インストール済み',
    'settings.resetBtn': 'デフォルトにリセット',
    'browser.searchPlaceholder': 'Googleで検索するかURLを入力',
    'browser.openExternal': '外部ブラウザで開く',
  },
  es: {
    'settings.title': 'AJUSTES',
    'settings.general': 'General',
    'settings.api': 'Configuración de API',
    'settings.privacy': 'Privacidad y Seguridad',
    'settings.appearance': 'Apariencia y Tema',
    'settings.performance': 'Rendimiento de IA',
    'settings.content': 'Contenido y Permisos',
    'settings.autofill': 'Autocompletar',
    'settings.downloads': 'Descargas',
    'settings.about': 'Acerca de Ham',
    'settings.brain': 'Instalar Cerebro (GGUF)',
    'settings.searchEngine': 'Motor de búsqueda predeterminado',
    'settings.searchEngineDesc': 'Elija el motor de búsqueda principal para el omnibox',
    'settings.language': 'Idioma',
    'settings.languageDesc': 'Idioma de la interfaz de usuario',
    'settings.defaultBrowser': 'Navegador predeterminado',
    'settings.defaultBrowserDesc': 'Hacer de Ham Browser el predeterminado',
    'settings.reset': 'Restablecer ajustes',
    'settings.resetDesc': 'Restaurar a la configuración predeterminada de fábrica',
    'settings.setAsDefault': 'Establecer como predeterminado',
    'settings.installed': 'Instalado',
    'settings.resetBtn': 'Restablecer predeterminado',
    'browser.searchPlaceholder': 'Busca en Google o escribe una URL',
    'browser.openExternal': 'Abrir en navegador externo',
  },
  fr: {
    'settings.title': 'PARAMÈTRES',
    'settings.general': 'Général',
    'settings.api': 'Configuration API',
    'settings.privacy': 'Confidentialité et sécurité',
    'settings.appearance': 'Apparence et thème',
    'settings.performance': 'Performances IA',
    'settings.content': 'Contenu et autorisations',
    'settings.autofill': 'Saisie automatique',
    'settings.downloads': 'Téléchargements',
    'settings.about': 'À propos de Ham',
    'settings.brain': 'Installer le cerveau (GGUF)',
    'settings.searchEngine': 'Moteur de recherche par défaut',
    'settings.searchEngineDesc': 'Choisissez le moteur de recherche principal pour l\'omnibox',
    'settings.language': 'Langue',
    'settings.languageDesc': 'Langue de l\'interface utilisateur',
    'settings.defaultBrowser': 'Navigateur par défaut',
    'settings.defaultBrowserDesc': 'Faire de Ham Browser le navigateur par défaut',
    'settings.reset': 'Réinitialiser les paramètres',
    'settings.resetDesc': 'Restaurer les paramètres d\'usine par défaut',
    'settings.setAsDefault': 'Définir par défaut',
    'settings.installed': 'Installé',
    'settings.resetBtn': 'Réinitialiser par défaut',
    'browser.searchPlaceholder': 'Rechercher sur Google ou saisir une URL',
    'browser.openExternal': 'Ouvrir dans un navigateur externe',
  },
  de: {
    'settings.title': 'EINSTELLUNGEN',
    'settings.general': 'Allgemein',
    'settings.api': 'API-Konfiguration',
    'settings.privacy': 'Datenschutz & Sicherheit',
    'settings.appearance': 'Erscheinungsbild & Design',
    'settings.performance': 'KI-Leistung',
    'settings.content': 'Inhalt & Berechtigungen',
    'settings.autofill': 'Automatisches Ausfüllen',
    'settings.downloads': 'Downloads',
    'settings.about': 'Über Ham',
    'settings.brain': 'Gehirn installieren (GGUF)',
    'settings.searchEngine': 'Standardsuchmaschine',
    'settings.searchEngineDesc': 'Wählen Sie die Hauptsuchmaschine für die Omnibox',
    'settings.language': 'Sprache',
    'settings.languageDesc': 'Sprache der Benutzeroberfläche',
    'settings.defaultBrowser': 'Standardbrowser',
    'settings.defaultBrowserDesc': 'Ham Browser als Standard festlegen',
    'settings.reset': 'Einstellungen zurücksetzen',
    'settings.resetDesc': 'Auf Werkseinstellungen zurücksetzen',
    'settings.setAsDefault': 'Als Standard festlegen',
    'settings.installed': 'Installiert',
    'settings.resetBtn': 'Standard zurücksetzen',
    'browser.searchPlaceholder': 'Google durchsuchen oder URL eingeben',
    'browser.openExternal': 'In externem Browser öffnen',
  },
  ko: {
    'settings.title': '설정',
    'settings.general': '일반',
    'settings.api': 'API 구성',
    'settings.privacy': '개인정보 및 보안',
    'settings.appearance': '모양 및 테마',
    'settings.performance': 'AI 성능',
    'settings.content': '콘텐츠 및 권한',
    'settings.autofill': '자동 완성',
    'settings.downloads': '다운로드',
    'settings.about': 'Ham 정보',
    'settings.brain': '두뇌 설치 (GGUF)',
    'settings.searchEngine': '기본 검색 엔진',
    'settings.searchEngineDesc': '옴니박스의 기본 검색 엔진 선택',
    'settings.language': '언어',
    'settings.languageDesc': '사용자 인터페이스 언어',
    'settings.defaultBrowser': '기본 브라우저',
    'settings.defaultBrowserDesc': 'Ham 브라우저를 기본으로 설정',
    'settings.reset': '설정 초기화',
    'settings.resetDesc': '공장 기본 설정으로 복원',
    'settings.setAsDefault': '기본으로 설정',
    'settings.installed': '설치됨',
    'settings.resetBtn': '기본값으로 재설정',
    'browser.searchPlaceholder': 'Google 검색 또는 URL 입력',
    'browser.openExternal': '외부 브라우저에서 열기',
  },
  zh: {
    'settings.title': '设置',
    'settings.general': '常规',
    'settings.api': 'API 配置',
    'settings.privacy': '隐私与安全',
    'settings.appearance': '外观与主题',
    'settings.performance': 'AI 性能',
    'settings.content': '内容与权限',
    'settings.autofill': '自动填充',
    'settings.downloads': '下载',
    'settings.about': '关于 Ham',
    'settings.brain': '安装大脑 (GGUF)',
    'settings.searchEngine': '默认搜索引擎',
    'settings.searchEngineDesc': '选择多功能框的主要搜索引擎',
    'settings.language': '语言',
    'settings.languageDesc': '用户界面语言',
    'settings.defaultBrowser': '默认浏览器',
    'settings.defaultBrowserDesc': '将 Ham 浏览器设为默认',
    'settings.reset': '重置设置',
    'settings.resetDesc': '恢复为出厂默认设置',
    'settings.setAsDefault': '设为默认',
    'settings.installed': '已安装',
    'settings.resetBtn': '重置默认值',
    'browser.searchPlaceholder': '在 Google 上搜索或输入网址',
    'browser.openExternal': '在外部浏览器中打开',
  },
  ar: {
    'settings.title': 'الإعدادات',
    'settings.general': 'عام',
    'settings.api': 'تكوين API',
    'settings.privacy': 'الخصوصية والأمان',
    'settings.appearance': 'المظهر والسمة',
    'settings.performance': 'أداء الذكاء الاصطناعي',
    'settings.content': 'المحتوى والأذونات',
    'settings.autofill': 'الملء التلقائي',
    'settings.downloads': 'التنزيلات',
    'settings.about': 'حول Ham',
    'settings.brain': 'تثبيت الدماغ (GGUF)',
    'settings.searchEngine': 'محرك البحث الافتراضي',
    'settings.searchEngineDesc': 'اختر محرك البحث الرئيسي للمربع متعدد الاستخدامات',
    'settings.language': 'اللغة',
    'settings.languageDesc': 'لغة واجهة المستخدم',
    'settings.defaultBrowser': 'المتصفح الافتراضي',
    'settings.defaultBrowserDesc': 'جعل متصفح Ham هو الافتراضي',
    'settings.reset': 'إعادة ضبط الإعدادات',
    'settings.resetDesc': 'استعادة إعدادات المصنع الافتراضية',
    'settings.setAsDefault': 'تعيين كافتراضي',
    'settings.installed': 'مُثبت',
    'settings.resetBtn': 'إعادة تعيين الافتراضي',
    'browser.searchPlaceholder': 'ابحث في Google أو اكتب عنوان URL',
    'browser.openExternal': 'فتح في متصفح خارجي',
  },
  ru: {
    'settings.title': 'НАСТРОЙКИ',
    'settings.general': 'Общие',
    'settings.api': 'Конфигурация API',
    'settings.privacy': 'Конфиденциальность и безопасность',
    'settings.appearance': 'Внешний вид и тема',
    'settings.performance': 'Производительность ИИ',
    'settings.content': 'Контент и разрешения',
    'settings.autofill': 'Автозаполнение',
    'settings.downloads': 'Загрузки',
    'settings.about': 'О Ham',
    'settings.brain': 'Установить мозг (GGUF)',
    'settings.searchEngine': 'Поисковая система по умолчанию',
    'settings.searchEngineDesc': 'Выберите основную поисковую систему для омнибокса',
    'settings.language': 'Язык',
    'settings.languageDesc': 'Язык пользовательского интерфейса',
    'settings.defaultBrowser': 'Браузер по умолчанию',
    'settings.defaultBrowserDesc': 'Сделать браузер Ham браузером по умолчанию',
    'settings.reset': 'Сброс настроек',
    'settings.resetDesc': 'Восстановить заводские настройки по умолчанию',
    'settings.setAsDefault': 'Установить по умолчанию',
    'settings.installed': 'Установлено',
    'settings.resetBtn': 'Сбросить по умолчанию',
    'browser.searchPlaceholder': 'Поиск в Google или ввод URL',
    'browser.openExternal': 'Открыть во внешнем браузере',
  },
  pt: {
    'settings.title': 'CONFIGURAÇÕES',
    'settings.general': 'Geral',
    'settings.api': 'Configuração de API',
    'settings.privacy': 'Privacidade e Segurança',
    'settings.appearance': 'Aparência e Tema',
    'settings.performance': 'Desempenho de IA',
    'settings.content': 'Conteúdo e Permissões',
    'settings.autofill': 'Preenchimento automático',
    'settings.downloads': 'Downloads',
    'settings.about': 'Sobre o Ham',
    'settings.brain': 'Instalar Cérebro (GGUF)',
    'settings.searchEngine': 'Mecanismo de pesquisa padrão',
    'settings.searchEngineDesc': 'Escolha o mecanismo de pesquisa principal para a omnibox',
    'settings.language': 'Idioma',
    'settings.languageDesc': 'Idioma da interface do usuário',
    'settings.defaultBrowser': 'Navegador padrão',
    'settings.defaultBrowserDesc': 'Tornar o Ham Browser o padrão',
    'settings.reset': 'Redefinir configurações',
    'settings.resetDesc': 'Restaurar para as configurações padrão de fábrica',
    'settings.setAsDefault': 'Definir como padrão',
    'settings.installed': 'Instalado',
    'settings.resetBtn': 'Redefinir padrão',
    'browser.searchPlaceholder': 'Pesquise no Google ou digite um URL',
    'browser.openExternal': 'Abrir em navegador externo',
  },
  hi: {
    'settings.title': 'सेटिंग्स',
    'settings.general': 'सामान्य',
    'settings.api': 'API कॉन्फ़िगरेशन',
    'settings.privacy': 'गोपनीयता और सुरक्षा',
    'settings.appearance': 'दिखावट और थीम',
    'settings.performance': 'AI प्रदर्शन',
    'settings.content': 'सामग्री और अनुमतियां',
    'settings.autofill': 'स्वतः भरण',
    'settings.downloads': 'डाउनलोड',
    'settings.about': 'Ham के बारे में',
    'settings.brain': 'मस्तिष्क स्थापित करें (GGUF)',
    'settings.searchEngine': 'डिफ़ॉल्ट खोज इंजन',
    'settings.searchEngineDesc': 'ओमनीबॉक्स के लिए मुख्य खोज इंजन चुनें',
    'settings.language': 'भाषा',
    'settings.languageDesc': 'उपयोगकर्ता इंटरफ़ेस भाषा',
    'settings.defaultBrowser': 'डिफ़ॉल्ट ब्राउज़र',
    'settings.defaultBrowserDesc': 'Ham ब्राउज़र को डिफ़ॉल्ट बनाएं',
    'settings.reset': 'सेटिंग्स रीसेट करें',
    'settings.resetDesc': 'फ़ैक्टरी डिफ़ॉल्ट सेटिंग्स पर पुनर्स्थापित करें',
    'settings.setAsDefault': 'डिफ़ॉल्ट के रूप में सेट करें',
    'settings.installed': 'स्थापित',
    'settings.resetBtn': 'डिफ़ॉल्ट रीसेट करें',
    'browser.searchPlaceholder': 'Google पर खोजें या URL टाइप करें',
    'browser.openExternal': 'बाहरी ब्राउज़र में खोलें',
  }
};

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<Language>('id');

  useEffect(() => {
    const saved = safeStorage.getItem('quantum_settings');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.language && translations[parsed.language as Language]) {
          setLanguageState(parsed.language as Language);
        }
      } catch (e) {}
    }
  }, []);

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    const saved = safeStorage.getItem('quantum_settings');
    let newSettings = { language: lang };
    if (saved) {
      try {
        newSettings = { ...JSON.parse(saved), language: lang };
      } catch (e) {}
    }
    safeStorage.setItem('quantum_settings', JSON.stringify(newSettings));
  };

  const t = (key: string): string => {
    return translations[language]?.[key] || translations['id'][key] || key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}
