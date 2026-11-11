
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

export default function StaffDashboard({ navigation }) {
  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.container}
    >
      <View style={styles.headerCard}>
        <Text style={styles.welcome}>Staff Dashboard</Text>
        <Text style={styles.subtitle}>
          Record daily activities and help keep chicken
          stock and business records up to date.
        </Text>
      </View>

      <Text style={styles.sectionTitle}>Business Activities</Text>

      <MenuCard
        icon="🐔"
        title="Chicken Batches"
        description="View existing batches and check stock and batch information."
        onPress={() => navigation.navigate("Batches")}
      />

      <MenuCard
        icon="💰"
        title="Record Chicken Sales"
        description="Record the number of chickens sold for a batch."
        onPress={() => navigation.navigate("AddSale")}
      />

      <MenuCard
        icon="📉"
        title="Record Chicken Deaths"
        description="Record chickens that have died in a batch."
        onPress={() => navigation.navigate("RecordDeath")}
      />

      <MenuCard
        icon="🧾"
        title="Record Business Expenses"
        description="Record feed, medicine and other business costs."
        onPress={() => navigation.navigate("AddExpense")}
      />

      <MenuCard
        icon="📅"
        title="Daily Records"
        description="Record feeding details and daily notes for a batch."
        onPress={() => navigation.navigate("DailyRecords")}
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
    padding: 22,
    borderRadius: 16,
    marginBottom: 25
  },
  brand: {
    color: "#FFFFFF",
    fontSize: 22,
    fontWeight: "bold"
  },
  welcome: {
    color: "#FFFFFF",
    fontSize: 21,
    fontWeight: "bold"
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
    marginBottom: 8,
    textAlign: "center"
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
