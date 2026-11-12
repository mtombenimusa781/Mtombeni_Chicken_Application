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
import { collection, getDocs, query, where } from "firebase/firestore";
import { Ionicons } from "@expo/vector-icons";
import { db } from "../Config/firebase";
import { useLanguage } from "../context/LanguageContext";

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

/* Icon for each activity type (types are stored in English) */
const ACTIVITY_ICONS = {
  "Chicken Sale": "cash",
  "Chicken Deaths Recorded": "heart-dislike",
  "Business Expense Recorded": "receipt"
};

export default function StaffActivityScreen({ route }) {
  const { t } = useLanguage();
  const { staffUid, staffName, staffEmail } = route.params || {};

  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const activityLabel = type =>
    ({
      "Chicken Sale": t("actChickenSale"),
      "Chicken Deaths Recorded": t("actDeathsRecorded"),
      "Business Expense Recorded": t("actExpenseRecorded")
    }[type] ||
    type ||
    t("businessActivity"));

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
      Alert.alert(t("errorTitle"), t("couldNotLoadActivities"));
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
      : t("dateNotRecorded");
  };

  const renderActivity = ({ item }) => {
    const type = item.activityType || item.type;
    const iconName = ACTIVITY_ICONS[type] || "document-text";

    return (
      <View style={styles.card}>
        <View style={styles.cardTop}>
          <View style={styles.activityIcon}>
            <Ionicons name={iconName} size={22} color={GREEN} />
          </View>

          <View style={styles.cardTitleArea}>
            <Text style={styles.activityType}>{activityLabel(type)}</Text>
            <Text style={styles.date}>{formatDate(item.createdAt)}</Text>
          </View>
        </View>

        <Text style={styles.description}>
          {item.description || item.details || t("noDescription")}
        </Text>

        {(item.quantity !== undefined ||
          item.amount !== undefined ||
          item.batchName ||
          item.batchId) && (
          <View style={styles.chipRow}>
            {item.quantity !== undefined && (
              <View style={styles.chip}>
                <Text style={styles.chipLabel}>{t("quantity")}</Text>
                <Text style={styles.chipValue}>{item.quantity}</Text>
              </View>
            )}

            {item.amount !== undefined && (
              <View style={styles.chip}>
                <Text style={styles.chipLabel}>{t("amountLabel")}</Text>
                <Text style={[styles.chipValue, styles.amountValue]}>
                  R{Number(item.amount).toFixed(2)}
                </Text>
              </View>
            )}

            {(item.batchName || item.batchId) && (
              <View style={styles.chip}>
                <Text style={styles.chipLabel}>{t("batchShort")}</Text>
                <Text style={styles.chipValue} numberOfLines={1}>
                  {item.batchName || item.batchId}
                </Text>
              </View>
            )}
          </View>
        )}
      </View>
    );
  };

  return (
    <View style={styles.screen}>
      <FlatList
        data={loading ? [] : activities}
        keyExtractor={item => item.id}
        renderItem={renderActivity}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              loadActivities();
            }}
            colors={[GREEN]}
            tintColor={GREEN}
          />
        }
        ListHeaderComponent={
          <View>
            {/* PROFILE */}
            <View style={styles.profile}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>
                  {(staffName || "S").charAt(0).toUpperCase()}
                </Text>
              </View>

              <Text style={styles.name}>{staffName || t("staffMember")}</Text>
              <Text style={styles.email}>
                {staffEmail || t("noEmailRecorded")}
              </Text>

              <View style={styles.countBadge}>
                <Text style={styles.countNumber}>{activities.length}</Text>
                <Text style={styles.countLabel}>{t("recordedActivities")}</Text>
              </View>
            </View>

            <Text style={styles.sectionTitle}>{t("activityHistory")}</Text>
          </View>
        }
        ListEmptyComponent={
          loading ? (
            <View style={styles.center}>
              <ActivityIndicator size="large" color={GREEN} />
              <Text style={styles.message}>{t("loadingActivities")}</Text>
            </View>
          ) : (
            <View style={styles.empty}>
              <Text style={styles.emptyIcon}>📋</Text>
              <Text style={styles.emptyTitle}>{t("noActivities")}</Text>
              <Text style={styles.emptyText}>{t("noActivitiesMsg")}</Text>
            </View>
          )
        }
        ListFooterComponent={
          <Text style={styles.footer}>{t("appFooter")}</Text>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: CREAM
  },

  list: {
    padding: 24,
    paddingBottom: 40
  },

  center: {
    alignItems: "center",
    paddingVertical: 30
  },

  message: {
    color: GREEN,
    fontSize: 14,
    marginTop: 12,
    textAlign: "center"
  },

  /* PROFILE */
  profile: {
    backgroundColor: WHITE,
    padding: 25,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: BORDER,
    alignItems: "center",
    marginBottom: 22,
    elevation: 4,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 8
  },

  avatar: {
    width: 74,
    height: 74,
    borderRadius: 37,
    backgroundColor: GREEN,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
    borderWidth: 3,
    borderColor: CREAM
  },

  avatarText: {
    color: WHITE,
    fontSize: 32,
    fontWeight: "bold"
  },

  name: {
    color: GREEN,
    fontSize: 22,
    fontWeight: "bold",
    textAlign: "center"
  },

  email: {
    color: MUTED,
    fontSize: 14,
    marginTop: 5,
    textAlign: "center"
  },

  countBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: INPUT_BG,
    borderWidth: 1,
    borderColor: INPUT_BORDER,
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 16,
    marginTop: 16
  },

  countNumber: {
    color: GOLD,
    fontSize: 18,
    fontWeight: "bold",
    marginRight: 8
  },

  countLabel: {
    color: LABEL,
    fontSize: 13,
    fontWeight: "700"
  },

  sectionTitle: {
    color: GREEN,
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 14
  },

  /* ACTIVITY CARD */
  card: {
    backgroundColor: WHITE,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: BORDER,
    elevation: 3,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6
  },

  cardTop: {
    flexDirection: "row",
    alignItems: "center"
  },

  activityIcon: {
    width: 44,
    height: 44,
    borderRadius: 13,
    backgroundColor: INPUT_BG,
    borderWidth: 1,
    borderColor: INPUT_BORDER,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12
  },

  cardTitleArea: {
    flex: 1
  },

  activityType: {
    color: LABEL,
    fontSize: 15,
    fontWeight: "700"
  },

  date: {
    color: MUTED,
    fontSize: 12,
    marginTop: 3
  },

  description: {
    color: "#26372B",
    fontSize: 13,
    lineHeight: 20,
    marginTop: 12
  },

  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 12
  },

  chip: {
    backgroundColor: INPUT_BG,
    borderWidth: 1,
    borderColor: INPUT_BORDER,
    borderRadius: 10,
    paddingVertical: 7,
    paddingHorizontal: 11,
    maxWidth: "100%"
  },

  chipLabel: {
    color: MUTED,
    fontSize: 11
  },

  chipValue: {
    color: "#26372B",
    fontSize: 13,
    fontWeight: "700",
    marginTop: 2
  },

  amountValue: {
    color: GOLD
  },

  /* EMPTY */
  empty: {
    backgroundColor: WHITE,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: BORDER,
    padding: 26,
    alignItems: "center"
  },

  emptyIcon: {
    fontSize: 42,
    marginBottom: 10
  },

  emptyTitle: {
    color: GREEN,
    fontSize: 17,
    fontWeight: "bold",
    textAlign: "center"
  },

  emptyText: {
    color: MUTED,
    fontSize: 13,
    lineHeight: 20,
    textAlign: "center",
    marginTop: 8
  },

  footer: {
    textAlign: "center",
    color: FOOTER,
    fontSize: 12,
    marginTop: 14
  }
});