import React from "react";
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useLanguage } from "../context/LanguageContext";
import { LANGUAGES } from "../languages/translation";

const CREAM = "#F4F1E8";
const WHITE = "#FFFFFF";
const GREEN = "#245C38";
const GOLD = "#af7c0f";
const BORDER = "#E8E2D5";
const INPUT_BG = "#FCFBF8";
const INPUT_BORDER = "#DDD8CA";
const LABEL = "#354638";
const MUTED = "#7A817A";
const FOOTER = "#9A9A8E";

export default function SettingsScreen() {
  const { language, setLanguage, t } = useLanguage();

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.container}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.card}>
        <View style={styles.titleRow}>
          <View style={styles.iconBox}>
            <Ionicons name="language" size={24} color={GREEN} />
          </View>

          <View style={styles.titleTextWrap}>
            <Text style={styles.heading}>{t("language")}</Text>
            <Text style={styles.description}>{t("chooseLanguage")}</Text>
          </View>
        </View>

        {LANGUAGES.map(item => {
          const selected = language === item.code;

          return (
            <TouchableOpacity
              key={item.code}
              style={[styles.option, selected && styles.optionSelected]}
              onPress={() => setLanguage(item.code)}
              activeOpacity={0.8}
              accessibilityRole="radio"
              accessibilityState={{ selected }}
            >
              <Text style={styles.flag}>{item.flag}</Text>

              <Text style={[styles.optionText, selected && styles.optionTextSelected]}>
                {item.name}
              </Text>

              {selected ? (
                <Ionicons name="checkmark-circle" size={26} color={GOLD} />
              ) : (
                <View style={styles.emptyCircle} />
              )}
            </TouchableOpacity>
          );
        })}

        <Text style={styles.note}>{t("languageNote")}</Text>
      </View>

      <Text style={styles.footer}>{t("appFooter")}</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: CREAM
  },

  container: {
    padding: 24
  },

  card: {
    backgroundColor: WHITE,
    padding: 25,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: BORDER,
    elevation: 4,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 8
  },

  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 24
  },

  iconBox: {
    width: 50,
    height: 50,
    borderRadius: 14,
    backgroundColor: INPUT_BG,
    borderWidth: 1,
    borderColor: INPUT_BORDER,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14
  },

  titleTextWrap: {
    flex: 1
  },

  heading: {
    fontSize: 22,
    fontWeight: "bold",
    color: GREEN
  },

  description: {
    color: MUTED,
    fontSize: 14,
    marginTop: 3
  },

  option: {
    flexDirection: "row",
    alignItems: "center",
    height: 62,
    paddingHorizontal: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: INPUT_BORDER,
    backgroundColor: INPUT_BG,
    marginBottom: 14
  },

  optionSelected: {
    borderColor: GREEN,
    borderWidth: 2,
    backgroundColor: WHITE
  },

  flag: {
    fontSize: 26,
    marginRight: 14
  },

  optionText: {
    flex: 1,
    fontSize: 16,
    fontWeight: "700",
    color: LABEL
  },

  optionTextSelected: {
    color: GREEN
  },

  emptyCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: INPUT_BORDER
  },

  note: {
    color: MUTED,
    fontSize: 12,
    lineHeight: 18,
    marginTop: 6,
    textAlign: "center"
  },

  footer: {
    textAlign: "center",
    color: FOOTER,
    fontSize: 12,
    marginTop: 26
  }
});