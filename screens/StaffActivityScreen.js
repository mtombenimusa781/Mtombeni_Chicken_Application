
import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  Alert,
  RefreshControl
} from "react-native";
import {
  collection,
  getDocs,
  query,
  where
} from "firebase/firestore";
import { db } from "../Config/firebase";

const GREEN = "#245C38";
const LIGHT_GREEN = "#F4F8F2";

export default function StaffActivityScreen({ route }) {
  const { staffUid, staffName, staffEmail } = route.params || {};

  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadActivities = async () => {
    try {
      const activityQuery = query(
        collection(db, "staffActivities"),
        where("staffUid", "==", staffUid)
      );

      const snapshot = await getDocs(activityQuery);

      const records = snapshot.docs.map(item => ({
        id: item.id,
        ...item.data()
      }));

      records.sort((a, b) => {
        const getTime = value => {
          if (value?.toDate) return value.toDate().getTime();
          const date = value ? new Date(value).getTime() : 0;
          return isNaN(date) ? 0 : date;
        };

        return getTime(b.createdAt) - getTime(a.createdAt);
      });

      setActivities(records);
    } catch (error) {
      console.log("Activity loading error:", error.code, error.message);
      Alert.alert("Error", "Could not load staff activities.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadActivities();
  }, [staffUid]);

  const formatDate = value => {
    const date = value?.toDate
      ? value.toDate()
      : value
        ? new Date(value)
        : null;

    return date && !isNaN(date.getTime())
      ? date.toLocaleString()
      : "Date not recorded";
  };

  const renderActivity = ({ item }) => (
    <View style={styles.card}>
      <Text style={styles.activityType}>
        {item.activityType || item.type || "Business activity"}
      </Text>

      <Text style={styles.description}>
        {item.description || item.details || "No description recorded"}
      </Text>

      {item.quantity !== undefined && (
        <Text style={styles.detail}>Quantity: {item.quantity}</Text>
      )}

      {item.amount !== undefined && (
        <Text style={styles.detail}>
          Amount: R{Number(item.amount).toFixed(2)}
        </Text>
      )}

      {item.batchId && (
        <Text style={styles.detail}>Batch: {item.batchId}</Text>
      )}

      <Text style={styles.date}>
        {formatDate(item.createdAt)}
      </Text>
    </View>
  );

  return (
    <View style={styles.screen}>
      <View style={styles.profile}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {(staffName || "S").charAt(0).toUpperCase()}
          </Text>
        </View>

        <Text style={styles.name}>{staffName || "Staff Member"}</Text>
        <Text style={styles.email}>{staffEmail || "No email recorded"}</Text>
        <Text style={styles.count}>
          {activities.length} recorded activities
        </Text>
      </View>

      <Text style={styles.sectionTitle}>Activity History</Text>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={GREEN} />
          <Text style={styles.message}>Loading activity history...</Text>
        </View>
      ) : (
        <FlatList
          data={activities}
          keyExtractor={item => item.id}
          renderItem={renderActivity}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                loadActivities();
              }}
              colors={[GREEN]}
            />
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyIcon}>📋</Text>
              <Text style={styles.emptyTitle}>No activities recorded</Text>
              <Text style={styles.message}>
                Activities will appear here after the app saves them to
                the staffActivities collection.
              </Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: LIGHT_GREEN
  },
  profile: {
    backgroundColor: GREEN,
    padding: 22,
    alignItems: "center",
    borderBottomLeftRadius: 22,
    borderBottomRightRadius: 22
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#E4F1E5",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10
  },
  avatarText: {
    color: GREEN,
    fontSize: 28,
    fontWeight: "bold"
  },
  name: {
    color: "#FFFFFF",
    fontSize: 20,
    fontWeight: "bold"
  },
  email: {
    color: "#E1EDE3",
    fontSize: 13,
    marginTop: 5
  },
  count: {
    color: "#FFFFFF",
    fontSize: 13,
    marginTop: 12
  },
  sectionTitle: {
    color: GREEN,
    fontSize: 18,
    fontWeight: "bold",
    margin: 16
  },
  list: {
    paddingHorizontal: 16,
    paddingBottom: 25,
    flexGrow: 1
  },
  card: {
    backgroundColor: "#FFFFFF",
    padding: 15,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#D5DED5",
    marginBottom: 12
  },
  activityType: {
    color: GREEN,
    fontSize: 15,
    fontWeight: "bold"
  },
  description: {
    color: "#47564B",
    fontSize: 13,
    marginTop: 7,
    lineHeight: 19
  },
  detail: {
    color: "#47564B",
    fontSize: 12,
    marginTop: 6
  },
  date: {
    color: "#778078",
    fontSize: 11,
    marginTop: 10
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center"
  },
  message: {
    color: "#66736A",
    fontSize: 13,
    lineHeight: 20,
    textAlign: "center",
    marginTop: 8
  },
  empty: {
    alignItems: "center",
    padding: 22
  },
  emptyIcon: {
    fontSize: 34,
    marginBottom: 10
  },
  emptyTitle: {
    color: GREEN,
    fontSize: 16,
    fontWeight: "bold"
  }
});
