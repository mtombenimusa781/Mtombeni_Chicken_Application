import React from "react";
import { LanguageProvider } from "./context/LanguageContext";
import AppNavigator from "./navigation/AppNavigator";

export default function App() {
  return (
    <LanguageProvider>
      <AppNavigator />
    </LanguageProvider>
  );
}