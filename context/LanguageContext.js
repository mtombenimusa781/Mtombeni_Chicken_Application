import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useMemo
} from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import translations from "../languages/translation";

const STORAGE_KEY = "app_language";
const LanguageContext = createContext(null);

export function LanguageProvider({ children }) {
  const [language, setLanguageState] = useState("en");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const loadLanguage = async () => {
      try {
        const saved = await AsyncStorage.getItem(STORAGE_KEY);
        if (saved && translations[saved]) {
          setLanguageState(saved);
        }
      } catch (error) {
        console.log("Language load error:", error.message);
      } finally {
        setReady(true);
      }
    };

    loadLanguage();
  }, []);

  const setLanguage = useCallback(async code => {
    if (!translations[code]) return;

    setLanguageState(code);

    try {
      await AsyncStorage.setItem(STORAGE_KEY, code);
    } catch (error) {
      console.log("Language save error:", error.message);
    }
  }, []);

  const t = useCallback(
    key => translations[language]?.[key] ?? translations.en[key] ?? key,
    [language]
  );

  const value = useMemo(
    () => ({ language, setLanguage, t }),
    [language, setLanguage, t]
  );

  if (!ready) return null;

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);

  if (!context) {
    throw new Error("useLanguage must be used inside LanguageProvider");
  }

  return context;
}