
import React from "react";
import {View,Text,TouchableOpacity,StyleSheet,ScrollView} from "react-native";

const GREEN = "#245C38";
const LIGHT_GREEN = "#F4F8F2";

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
    >
      <View style={styles.headerCard}>
        <Text style={styles.welcome}>Admin Dashboard</Text>
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

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: LIGHT_GREEN
  },
  container: {
    padding: 18,
    paddingBottom: 35
  },
  headerCard: {
    backgroundColor: GREEN,
    padding: 10,
    borderRadius: 60,
    marginBottom: 25,
  },
  brand: {
    color: "#FFFFFF",
    fontSize: 22,
    fontWeight: "bold"
  },
  welcome: {
    color: "#FFFFFF",
    fontSize: 21,
    fontWeight: "bold",
    textAlign: "center"
  },
  subtitle: {
    color: "#E1EDE3",
    fontSize: 14,
    marginTop: 8,
    lineHeight: 21
  },
  priceBadge: {
    backgroundColor: "#FFFFFF",
    alignSelf: "flex-start",
    borderRadius: 9,
    paddingHorizontal: 12,
    paddingVertical: 9,
    marginTop: 16
  },
  priceText: {
    color: GREEN,
    fontSize: 13,
    fontWeight: "bold"
  },
  sectionTitle: {
    color: GREEN,
    fontSize: 19,
    fontWeight: "bold",
    marginBottom: 8
  },
  sectionDescription: {
    color: "#66736A",
    fontSize: 13,
    lineHeight: 20,
    marginBottom: 16
  },
  menuCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 16,
    marginBottom: 13,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#D5DED5",
    elevation: 2
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: "#E4F1E5",
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
    color: GREEN,
    fontSize: 15,
    fontWeight: "bold"
  },
  menuDescription: {
    color: "#66736A",
    fontSize: 12,
    lineHeight: 18,
    marginTop: 5
  },
  arrow: {
    color: GREEN,
    fontSize: 28
  },
  noteCard: {
    backgroundColor: "#E4F1E5",
    borderRadius: 12,
    padding: 16,
    marginTop: 10
  },
  noteTitle: {
    color: GREEN,
    fontSize: 15,
    fontWeight: "bold"
  },
  noteText: {
    color: "#47564B",
    fontSize: 13,
    lineHeight: 20,
    marginTop: 8
  }
});
