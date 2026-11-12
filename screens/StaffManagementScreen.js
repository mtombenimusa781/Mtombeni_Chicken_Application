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

export default function StaffManagementScreen({ navigation }) {
  const { t } = useLanguage();

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
      Alert.alert(t("errorTitle"), t("couldNotLoadStaff"));
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
      : t("notRecorded");
  };

  const renderStaff = ({ item }) => {
    const name = item.name || item.fullName || t("nameNotProvided");

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
        <View style={styles.cardTop}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {name.charAt(0).toUpperCase()}
            </Text>
          </View>

          <Text style={styles.name} numberOfLines={1}>
            {name}
          </Text>

          <Ionicons name="chevron-forward" size={22} color={GOLD} />
        </View>

        <View style={styles.divider} />

        <View style={styles.detailRow}>
          <Ionicons name="mail-outline" size={17} color={GREEN} />
          <Text style={styles.detailLabel}>{t("emailShort")}:</Text>
          <Text style={styles.detailValue} numberOfLines={1}>
            {item.email || t("notProvided")}
          </Text>
        </View>

        <View style={styles.detailRow}>
          <Ionicons name="call-outline" size={17} color={GREEN} />
          <Text style={styles.detailLabel}>{t("phoneLabel")}:</Text>
          <Text style={styles.detailValue} numberOfLines={1}>
            {item.phone || item.cellNumber || t("notProvided")}
          </Text>
        </View>

        <View style={styles.detailRow}>
          <Ionicons name="calendar-outline" size={17} color={GREEN} />
          <Text style={styles.detailLabel}>{t("registeredLabel")}:</Text>
          <Text style={styles.detailValue} numberOfLines={1}>
            {getRegistrationDate(item)}
          </Text>
        </View>

        <Text style={styles.viewActivity}>{t("viewStaffActivities")}</Text>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={GREEN} />
        <Text style={styles.message}>{t("loadingStaff")}</Text>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <FlatList
        data={staff}
        keyExtractor={item => item.id}
        renderItem={renderStaff}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              loadStaff();
            }}
            colors={[GREEN]}
            tintColor={GREEN}
          />
        }
        ListHeaderComponent={
          <View>
            {/* HEADER */}
            <View style={styles.headerCard}>
              <Text style={styles.logo}>👥</Text>
              <Text style={styles.title}>{t("staffManagement")}</Text>
              <Text style={styles.subtitle}>{t("staffMgmtSubtitle")}</Text>
            </View>

            {/* SUMMARY */}
            <View style={styles.summary}>
              <Text style={styles.summaryNumber}>{staff.length}</Text>
              <Text style={styles.summaryLabel}>
                {t("registeredStaffMembers")}
              </Text>
            </View>
          </View>
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>👥</Text>
            <Text style={styles.emptyTitle}>{t("noStaffYet")}</Text>
            <Text style={styles.emptyText}>{t("noStaffMsg")}</Text>
          </View>
        }
        ListFooterComponent={<Text style={styles.footer}>{t("appFooter")}</Text>}
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
    flex: 1,
    backgroundColor: CREAM,
    justifyContent: "center",
    alignItems: "center",
    padding: 24
  },

  message: {
    color: GREEN,
    fontSize: 14,
    marginTop: 12,
    textAlign: "center"
  },

  /* HEADER */
  headerCard: {
    backgroundColor: WHITE,
    padding: 25,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: BORDER,
    alignItems: "center",
    marginBottom: 16,
    elevation: 4,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 8
  },

  logo: {
    fontSize: 52,
    marginBottom: 8
  },

  title: {
    color: GREEN,
    fontSize: 23,
    fontWeight: "bold",
    textAlign: "center"
  },

  subtitle: {
    color: MUTED,
    fontSize: 14,
    lineHeight: 21,
    marginTop: 7,
    textAlign: "center"
  },

  /* SUMMARY */
  summary: {
    backgroundColor: INPUT_BG,
    borderWidth: 1,
    borderColor: INPUT_BORDER,
    borderRadius: 16,
    paddingVertical: 18,
    alignItems: "center",
    marginBottom: 20
  },

  summaryNumber: {
    color: GOLD,
    fontSize: 34,
    fontWeight: "bold"
  },

  summaryLabel: {
    color: LABEL,
    fontSize: 14,
    fontWeight: "700",
    marginTop: 4
  },

  /* STAFF CARD */
  card: {
    backgroundColor: WHITE,
    borderRadius: 16,
    padding: 18,
    marginBottom: 14,
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

  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: GREEN,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 13
  },

  avatarText: {
    color: WHITE,
    fontSize: 20,
    fontWeight: "bold"
  },

  name: {
    flex: 1,
    color: GREEN,
    fontSize: 17,
    fontWeight: "bold",
    paddingRight: 8
  },

  divider: {
    height: 1,
    backgroundColor: BORDER,
    marginVertical: 14
  },

  detailRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 9
  },

  detailLabel: {
    color: MUTED,
    fontSize: 13,
    marginLeft: 8,
    marginRight: 6
  },

  detailValue: {
    flex: 1,
    color: "#26372B",
    fontSize: 13,
    fontWeight: "600"
  },

  viewActivity: {
    color: GREEN,
    fontSize: 13,
    fontWeight: "700",
    marginTop: 8
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