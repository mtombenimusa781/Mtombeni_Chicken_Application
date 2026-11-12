import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView
} from "react-native";

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

function MenuCard({ title, description, onPress, icon }) {
  return (
    <TouchableOpacity
      style={styles.menuCard}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <View style={styles.iconContainer}>
        <Text style={styles.icon}>{icon}</Text>
      </View>

      <View style={styles.menuContent}>
        <Text style={styles.menuTitle}>{title}</Text>
        <Text style={styles.menuDescription}>{description}</Text>
      </View>

      <Text style={styles.arrow}>›</Text>
    </TouchableOpacity>
  );
}

export default function AdminDashboard({ navigation }) {
  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.container}
      showsVerticalScrollIndicator={false}
    >
      {/* HEADER */}
      <View style={styles.headerCard}>
        <Text style={styles.logo}>🐔</Text>
        <Text style={styles.welcome}>Admin Dashboard</Text>
        <Text style={styles.subtitle}>
          Manage your chicken business, batches and staff.
        </Text>
      </View>

      <Text style={styles.sectionTitle}>Business Management</Text>

      <Text style={styles.sectionDescription}>
        Select an option below to manage your business.
      </Text>

      <MenuCard
        icon="🐔"
        title="Chicken Batches"
        description="View batches, chicken stock, sales, deaths, expenses and profit or loss."
        onPress={() => navigation.navigate("Batches")}
      />

      <MenuCard
        icon="👥"
        title="Staff Management"
        description="Manage staff accounts and review staff information."
        onPress={() => navigation.navigate("StaffManagement")}
      />

      <Text style={styles.footer}>
        Mtombeni Chicken Business | Business Management
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: CREAM
  },

  container: {
    padding: 24,
    paddingBottom: 40
  },

  /* HEADER (same look as the Login card) */
  headerCard: {
    backgroundColor: WHITE,
    padding: 25,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: BORDER,
    alignItems: "center",
    marginBottom: 28,
    elevation: 4,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 8
  },

  logo: {
    fontSize: 56,
    marginBottom: 10
  },

  welcome: {
    color: GREEN,
    fontSize: 24,
    fontWeight: "bold",
    letterSpacing: 0.5
  },

  subtitle: {
    color: MUTED,
    fontSize: 14,
    marginTop: 8,
    lineHeight: 21,
    textAlign: "center"
  },

  sectionTitle: {
    color: GREEN,
    fontSize: 19,
    fontWeight: "bold",
    marginBottom: 8,
    textAlign: "center"
  },

  sectionDescription: {
    color: MUTED,
    fontSize: 13,
    lineHeight: 20,
    marginBottom: 18,
    textAlign: "center"
  },

  /* MENU CARDS */
  menuCard: {
    backgroundColor: WHITE,
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: BORDER,
    elevation: 3,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6
  },

  iconContainer: {
    width: 50,
    height: 50,
    borderRadius: 14,
    backgroundColor: INPUT_BG,
    borderWidth: 1,
    borderColor: INPUT_BORDER,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 13
  },

  icon: {
    fontSize: 24
  },

  menuContent: {
    flex: 1,
    paddingRight: 8
  },

  menuTitle: {
    color: LABEL,
    fontSize: 15,
    fontWeight: "700"
  },

  menuDescription: {
    color: MUTED,
    fontSize: 12,
    lineHeight: 18,
    marginTop: 5
  },

  arrow: {
    color: GOLD,
    fontSize: 28
  },

  footer: {
    textAlign: "center",
    color: FOOTER,
    fontSize: 12,
    marginTop: 14
  }
});