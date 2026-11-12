import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView
} from "react-native";
import {
  collection,
  doc,
  getDoc,
  onSnapshot,
  query,
  where
} from "firebase/firestore";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { auth, db } from "../Config/firebase";
import { useLanguage } from "../context/LanguageContext";

/* Same palette as LoginScreen */
const CREAM = "#F4F1E8";
const WHITE = "#FFFFFF";
const GREEN = "#245C38";
const GOLD = "#af7c0f";
const GOLD_TEXT = "#8A6000";
const BORDER = "#E8E2D5";
const INPUT_BG = "#FCFBF8";
const INPUT_BORDER = "#DDD8CA";
const LABEL = "#354638";
const MUTED = "#5F6B61";
const FOOTER = "#9A9A8E";


const money = value =>
  "R " +
  Number(value || 0).toLocaleString("en-ZA", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });

const toDate = value => {
  const date = value?.toDate
    ? value.toDate()
    : value
    ? new Date(value)
    : null;

  return date && !isNaN(date.getTime()) ? date : null;
};

function StatCard({ icon, value, label }) {
  return (
    <View style={styles.statCard}>
      <Ionicons name={icon} size={20} color={GREEN} />
      <Text style={styles.statValue} numberOfLines={1} adjustsFontSizeToFit>
        {value}
      </Text>
      <Text style={styles.statLabel} numberOfLines={2}>
        {label}
      </Text>
    </View>
  );
}

function ActionTile({ icon, title, onPress }) {
  return (
    <TouchableOpacity
      style={styles.tile}
      onPress={onPress}
      activeOpacity={0.8}
      accessibilityRole="button"
      accessibilityLabel={title}
    >
      <View style={styles.tileIcon}>
        <Ionicons name={icon} size={20} color={GREEN} />
      </View>

      <Text style={styles.tileText} numberOfLines={2}>
        {title}
      </Text>
    </TouchableOpacity>
  );
}

function NavItem({ name, label, onPress }) {
  return (
    <TouchableOpacity
      style={styles.navItem}
      onPress={onPress}
      activeOpacity={0.6}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      <Ionicons name={name} size={25} color={GREEN} />
    </TouchableOpacity>
  );
}

export default function StaffDashboard({ navigation }) {
  const insets = useSafeAreaInsets();
  const { t } = useLanguage();

  const [userName, setUserName] = useState("");
  const [batches, setBatches] = useState([]);
  const [sales, setSales] = useState([]);
  const [deaths, setDeaths] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [activities, setActivities] = useState([]);

  /* Username from the user's profile */
  useEffect(() => {
    const user = auth.currentUser;

    if (!user) return;

    let active = true;

    const loadName = async () => {
      let name = "";

      try {
        const snap = await getDoc(doc(db, "users", user.uid));

        if (snap.exists()) {
          name = snap.data().name || snap.data().fullName || "";
        }
      } catch (error) {
        console.log("Name loading error:", error.code, error.message);
      }

      if (!name && user.email) {
        name = user.email.split("@")[0];
      }

      if (active) setUserName(name);
    };

    loadName();

    return () => {
      active = false;
    };
  }, []);

  /* Live business figures */
  useEffect(() => {
    const user = auth.currentUser;

    if (!user) return;

    const listen = (collectionName, setter) =>
      onSnapshot(
        query(collection(db, collectionName)),
        snapshot =>
          setter(snapshot.docs.map(item => ({ id: item.id, ...item.data() }))),
        error =>
          console.log(`${collectionName} error:`, error.code, error.message)
      );

    const unsubBatches = listen("batches", setBatches);
    const unsubSales = listen("sales", setSales);
    const unsubDeaths = listen("deaths", setDeaths);
    const unsubExpenses = listen("expenses", setExpenses);

    const unsubActivities = onSnapshot(
      query(collection(db, "staffActivities"), where("staffUid", "==", user.uid)),
      snapshot => {
        const records = snapshot.docs.map(item => ({
          id: item.id,
          ...item.data()
        }));

        records.sort(
          (a, b) =>
            (toDate(b.createdAt)?.getTime() || 0) -
            (toDate(a.createdAt)?.getTime() || 0)
        );

        setActivities(records.slice(0, 3));
      },
      error =>
        console.log("Activities error:", error.code, error.message)
    );

    return () => {
      unsubBatches();
      unsubSales();
      unsubDeaths();
      unsubExpenses();
      unsubActivities();
    };
  }, []);

  /* Greeting */
  const hour = new Date().getHours();
  const greeting =
    hour < 12
      ? t("goodMorning")
      : hour < 17
      ? t("goodAfternoon")
      : t("goodEvening");

  const displayName = userName || t("staffMember");

  /* Figures */
  const todayKey = new Date().toISOString().slice(0, 10);

  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  const activeBatches = batches.filter(batch => batch.status !== "closed");
  const activeIds = new Set(activeBatches.map(batch => batch.id));
  const currentBatch = activeBatches[0];

  const starting = activeBatches.reduce(
    (sum, batch) => sum + Number(batch.initialChickens || 0),
    0
  );

  const sold = sales
    .filter(item => activeIds.has(item.batchId))
    .reduce((sum, item) => sum + Number(item.quantity || 0), 0);

  const dead = deaths
    .filter(item => activeIds.has(item.batchId))
    .reduce((sum, item) => sum + Number(item.quantity || 0), 0);

  const remaining = Math.max(0, starting - sold - dead);

  const todaySales = sales.filter(item => item.saleDate === todayKey);

  const todayChickensSold = todaySales.reduce(
    (sum, item) => sum + Number(item.quantity || 0),
    0
  );

  const todayDeaths = deaths
    .filter(item => item.recordDate === todayKey)
    .reduce((sum, item) => sum + Number(item.quantity || 0), 0);

  const todayExpenses = expenses
    .filter(item => {
      const date = toDate(item.createdAt);
      return date && date >= startOfToday;
    })
    .reduce((sum, item) => sum + Number(item.totalAmount || 0), 0);

  const activityLabel = type =>
    ({
      "Chicken Sale": t("actChickenSale"),
      "Chicken Deaths Recorded": t("actDeathsRecorded"),
      "Business Expense Recorded": t("actExpenseRecorded")
    }[type] ||
    type ||
    t("businessActivity"));

  const activityIcon = type =>
    ({
      "Chicken Sale": "cash",
      "Chicken Deaths Recorded": "heart-dislike",
      "Business Expense Recorded": "receipt"
    }[type] || "document-text");

  return (
    <View style={styles.screen}>
      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
      >
        {/* GREETING */}
        <View style={styles.header}>
          <View style={styles.headerText}>
            <Text style={styles.greeting}>{greeting},</Text>
            <Text style={styles.userName} numberOfLines={1}>
              {displayName}
            </Text>
          </View>

          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {displayName.charAt(0).toUpperCase()}
            </Text>
          </View>
        </View>

        {/* STOCK */}
        <View style={styles.heroCard}>
          <View style={styles.heroTop}>
            <Text style={styles.heroLabel}>{t("remainingStock")}</Text>

            {currentBatch ? (
              <View style={styles.heroChip}>
                <Text style={styles.heroChipText} numberOfLines={1}>
                  {currentBatch.batchName}
                </Text>
              </View>
            ) : null}
          </View>

          <Text style={styles.heroAmount}>{remaining}</Text>

          <Text style={styles.heroSub}>
            {t("chickensSoldToday").replace("{count}", todayChickensSold)}
          </Text>
        </View>

        {/* STATS */}
        <View style={styles.statRow}>
          <StatCard icon="checkmark-circle" value={sold} label={t("chickensSold")} />
          <StatCard icon="heart-dislike" value={todayDeaths} label={t("deathsToday")} />
          <StatCard
            icon="receipt"
            value={money(todayExpenses).replace(".00", "")}
            label={t("expensesToday")}
          />
        </View>

        {/* QUICK ACTIONS */}
        <Text style={styles.sectionTitle}>{t("quickActions")}</Text>

        <View style={styles.tileGrid}>
          <ActionTile
            icon="layers"
            title={t("chickenBatches")}
            onPress={() => navigation.navigate("Batches")}
          />
          <ActionTile
            icon="cash"
            title={t("recordSalesTitle")}
            onPress={() => navigation.navigate("AddSale")}
          />
          <ActionTile
            icon="heart-dislike"
            title={t("recordDeathsLabel")}
            onPress={() => navigation.navigate("RecordDeath")}
          />
          <ActionTile
            icon="receipt"
            title={t("recordExpensesLabel")}
            onPress={() => navigation.navigate("AddExpense")}
          />
        </View>

        {/* RECENT ACTIVITY */}
        <Text style={styles.sectionTitle}>{t("recentActivity")}</Text>

        {activities.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyText}>{t("noRecentActivity")}</Text>
          </View>
        ) : (
          activities.map(item => {
            const type = item.activityType || item.type;
            const date = toDate(item.createdAt);

            return (
              <View key={item.id} style={styles.activityCard}>
                <View style={styles.tileIcon}>
                  <Ionicons name={activityIcon(type)} size={20} color={GREEN} />
                </View>

                <View style={styles.activityInfo}>
                  <Text style={styles.activityTitle} numberOfLines={1}>
                    {activityLabel(type)}
                  </Text>
                  <Text style={styles.activityMeta} numberOfLines={1}>
                    {[item.batchName, date ? date.toLocaleString() : null]
                      .filter(Boolean)
                      .join(" · ")}
                  </Text>
                </View>

                {type === "Chicken Sale" || type === "Chicken Deaths Recorded" ? (
                  <Text style={styles.activityAmount}>
                    {item.quantity} {t("chickens")}
                  </Text>
                ) : null}
              </View>
            );
          })
        )}

        <Text style={styles.footer}>{t("appFooter")}</Text>
      </ScrollView>

      {/* BOTTOM NAVIGATION */}
      <View
        style={[styles.navWrapper, { bottom: Math.max(insets.bottom, 10) }]}
        pointerEvents="box-none"
      >
        <View style={styles.navPill} />

        <View style={styles.navRow} pointerEvents="box-none">
          <NavItem
            name="layers"
            label={t("chickenBatches")}
            onPress={() => navigation.navigate("Batches")}
          />

          <NavItem
            name="cash"
            label={t("recordSales")}
            onPress={() => navigation.navigate("AddSale")}
          />

          {/* CENTER - DAILY RECORDS */}
          <View style={styles.centerSlot} pointerEvents="box-none">
            <TouchableOpacity
              style={styles.centerButton}
              onPress={() => navigation.navigate("DailyRecords")}
              activeOpacity={0.85}
              accessibilityRole="button"
              accessibilityLabel={t("dailyRecords")}
            >
              <Ionicons name="calendar" size={32} color={WHITE} />
            </TouchableOpacity>
          </View>

          <NavItem
            name="heart-dislike"
            label={t("recordDeaths")}
            onPress={() => navigation.navigate("RecordDeath")}
          />

          <NavItem
            name="receipt"
            label={t("recordExpenses")}
            onPress={() => navigation.navigate("AddExpense")}
          />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: CREAM
  },

  container: {
    padding: 20,
    paddingBottom: 150
  },

  /* GREETING */
  header: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 18
  },

  headerText: {
    flex: 1,
    paddingRight: 12
  },

  greeting: {
    color: MUTED,
    fontSize: 14
  },

  userName: {
    color: GREEN,
    fontSize: 24,
    fontWeight: "bold",
    marginTop: 2
  },

  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: GREEN,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 3,
    borderColor: WHITE,
    elevation: 3
  },

  avatarText: {
    color: WHITE,
    fontSize: 20,
    fontWeight: "bold"
  },

  /* HERO */
  heroCard: {
    backgroundColor: GREEN,
    borderRadius: 24,
    padding: 20,
    marginBottom: 14,
    borderBottomWidth: 4,
    borderBottomColor: GOLD,
    elevation: 4,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.12,
    shadowRadius: 8
  },

  heroTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center"
  },

  heroLabel: {
    color: WHITE,
    fontSize: 13
  },

  heroChip: {
    backgroundColor: CREAM,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 5,
    maxWidth: "55%"
  },

  heroChipText: {
    color: GREEN,
    fontSize: 12,
    fontWeight: "bold"
  },

  heroAmount: {
    color: WHITE,
    fontSize: 34,
    fontWeight: "bold",
    marginTop: 8
  },

  heroSub: {
    color: WHITE,
    fontSize: 13,
    marginTop: 4
  },

  /* STATS */
  statRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 22
  },

  statCard: {
    flex: 1,
    backgroundColor: WHITE,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: BORDER,
    padding: 12,
    elevation: 2,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5
  },

  statValue: {
    color: GREEN,
    fontSize: 20,
    fontWeight: "bold",
    marginTop: 8
  },

  statLabel: {
    color: MUTED,
    fontSize: 11,
    marginTop: 3
  },

  /* QUICK ACTIONS */
  sectionTitle: {
    color: GREEN,
    fontSize: 17,
    fontWeight: "bold",
    marginBottom: 12
  },

  tileGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    marginBottom: 12
  },

  tile: {
    width: "48.5%",
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: WHITE,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: BORDER,
    padding: 14,
    marginBottom: 12,
    elevation: 2,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5
  },

  tileIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: INPUT_BG,
    borderWidth: 1,
    borderColor: INPUT_BORDER,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10
  },

  tileText: {
    flex: 1,
    color: LABEL,
    fontSize: 13,
    fontWeight: "700"
  },

  /* RECENT ACTIVITY */
  activityCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: WHITE,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: BORDER,
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginBottom: 10
  },

  activityInfo: {
    flex: 1,
    paddingRight: 8
  },

  activityTitle: {
    color: LABEL,
    fontSize: 13,
    fontWeight: "700"
  },

  activityMeta: {
    color: MUTED,
    fontSize: 11,
    marginTop: 3
  },

  activityAmount: {
    color: GOLD_TEXT,
    fontSize: 13,
    fontWeight: "bold"
  },

  emptyCard: {
    backgroundColor: WHITE,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: BORDER,
    padding: 18
  },

  emptyText: {
    color: MUTED,
    fontSize: 13,
    textAlign: "center"
  },

  footer: {
    textAlign: "center",
    color: FOOTER,
    fontSize: 12,
    marginTop: 18
  },

  /* BOTTOM NAVIGATION */
  navWrapper: {
    position: "absolute",
    left: 16,
    right: 16,
    height: 96
  },

  navPill: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: 68,
    backgroundColor: WHITE,
    borderRadius: 34,
    borderWidth: 1,
    borderColor: BORDER,
    elevation: 12,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.14,
    shadowRadius: 14
  },

  navRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    height: 96
  },

  navItem: {
    flex: 1,
    height: 68,
    alignItems: "center",
    justifyContent: "center"
  },

  centerSlot: {
    flex: 1,
    height: 96,
    alignItems: "center",
    justifyContent: "flex-end"
  },

  centerButton: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: GOLD,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
    borderWidth: 5,
    borderColor: CREAM,
    elevation: 14,
    shadowColor: GOLD,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 10
  }
});