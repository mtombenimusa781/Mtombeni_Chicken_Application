
import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  RefreshControl
} from "react-native";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "../Config/firebase";

const GREEN = "#245C38";
const LIGHT_GREEN = "#F4F8F2";

export default function StaffManagementScreen({ navigation }) {
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadStaff = async () => {
    try {
      const staffQuery = query(
        collection(db, "users"),
        where("role", "==", "staff")
      );

      const snapshot = await getDocs(staffQuery);

      const staffList = snapshot.docs.map(item => ({
        id: item.id,
        ...item.data()
      }));

      staffList.sort((a, b) => {
        const nameA = String(a.name || a.fullName || a.email || "");
        const nameB = String(b.name || b.fullName || b.email || "");
        return nameA.localeCompare(nameB);
      });

      setStaff(staffList);
    } catch (error) {
      console.log("Staff loading error:", error.code, error.message);
      Alert.alert("Error", "Could not load staff details.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadStaff();
  }, []);

  const getRegistrationDate = item => {
    const date = item.createdAt?.toDate
      ? item.createdAt.toDate()
      : item.createdAt
        ? new Date(item.createdAt)
        : null;

    return date && !isNaN(date.getTime())
      ? date.toLocaleDateString()
      : "Not recorded";
  };

  const renderStaff = ({ item }) => {
    const name = item.name || item.fullName || "Name not provided";

    return (
      <TouchableOpacity
        style={styles.card}
        activeOpacity={0.8}
        onPress={() =>
          navigation.navigate("StaffActivity", {
            staffUid: item.id,
            staffName: name,
            staffEmail: item.email || ""
          })
        }
      >
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {name.charAt(0).toUpperCase()}
          </Text>
        </View>

        <View style={styles.details}>
          <Text style={styles.name}>{name}</Text>
          <Text style={styles.detail}>
            Email: {item.email || "Not provided"}
          </Text>
          <Text style={styles.detail}>
            Phone: {item.phone || item.cellNumber || "Not provided"}
          </Text>
          <Text style={styles.detail}>
            Registered: {getRegistrationDate(item)}
          </Text>
          <Text style={styles.viewActivity}>
            View staff details and activities →
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={GREEN} />
        <Text style={styles.message}>Loading staff...</Text>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <View style={styles.heading}>
        <Text style={styles.title}>Staff Management</Text>
        <Text style={styles.subtitle}>
          View registered staff and track their business activities.
        </Text>
      </View>

      <View style={styles.summary}>
        <Text style={styles.summaryNumber}>{staff.length}</Text>
        <Text style={styles.summaryLabel}>Registered Staff Members</Text>
      </View>

      <FlatList
        data={staff}
        keyExtractor={item => item.id}
        renderItem={renderStaff}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              loadStaff();
            }}
            colors={[GREEN]}
          />
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>👥</Text>
            <Text style={styles.emptyTitle}>No staff registered yet</Text>
            <Text style={styles.message}>
              Staff accounts created through registration will appear here
              when their Firestore profile has role set to "staff".
            </Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: LIGHT_GREEN
  },
  heading: {
    padding: 20,
    paddingBottom: 12
  },
  title: {
    color: GREEN,
    fontSize: 23,
    fontWeight: "bold"
  },
  subtitle: {
    color: "#66736A",
    fontSize: 13,
    lineHeight: 20,
    marginTop: 7
  },
  summary: {
    backgroundColor: GREEN,
    marginHorizontal: 16,
    marginBottom: 15,
    borderRadius: 14,
    padding: 18,
    alignItems: "center"
  },
  summaryNumber: {
    color: "#FFFFFF",
    fontSize: 30,
    fontWeight: "bold"
  },
  summaryLabel: {
    color: "#FFFFFF",
    fontSize: 14,
    marginTop: 4
  },
  list: {
    paddingHorizontal: 16,
    paddingBottom: 25,
    flexGrow: 1
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 15,
    marginBottom: 12,
    flexDirection: "row",
    alignItems: "flex-start",
    borderWidth: 1,
    borderColor: "#D5DED5",
    elevation: 2
  },
  avatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: "#E4F1E5",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12
  },
  avatarText: {
    color: GREEN,
    fontSize: 20,
    fontWeight: "bold"
  },
  details: {
    flex: 1
  },
  name: {
    color: GREEN,
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 5
  },
  detail: {
    color: "#47564B",
    fontSize: 12,
    marginTop: 4
  },
  viewActivity: {
    color: GREEN,
    fontSize: 12,
    fontWeight: "bold",
    marginTop: 12
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: LIGHT_GREEN
  },
  message: {
    color: "#66736A",
    fontSize: 13,
    textAlign: "center",
    lineHeight: 20,
    marginTop: 10
  },
  empty: {
    alignItems: "center",
    padding: 25,
    marginTop: 25
  },
  emptyIcon: {
    fontSize: 38,
    marginBottom: 12
  },
  emptyTitle: {
    color: GREEN,
    fontSize: 16,
    fontWeight: "bold",
    textAlign: "center"
  }
});
