import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
  ActivityIndicator,
  Modal,
  TextInput
} from "react-native";
import {
  collection,
  onSnapshot,
  query,
  where,
  doc,
  getDoc,
  updateDoc,
  deleteDoc
} from "firebase/firestore";
import { auth, db } from "../Config/firebase";
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
const SOFT_GREEN = "#E4F1E5";
const RED = "#B42318";

const SELLING_PRICE = 85;
const CATEGORIES = ["Feed", "Medicine", "Other"];

const money = amount =>
  "R " +
  Number(amount || 0).toLocaleString("en-ZA", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });

export default function BatchDetailsScreen({ route, navigation }) {
  const { t } = useLanguage();
  const { batchId, batchName } = route.params;

  const [batch, setBatch] = useState(null);
  const [sales, setSales] = useState([]);
  const [deaths, setDeaths] = useState([]);
  const [expenses, setExpenses] = useState([]);

  const [userRole, setUserRole] = useState(null);
  const [roleLoading, setRoleLoading] = useState(true);
  const [loading, setLoading] = useState(true);

  const [editingRecord, setEditingRecord] = useState(null);
  const [editQuantity, setEditQuantity] = useState("");
  const [editCategory, setEditCategory] = useState("Other");
  const [editUnitCost, setEditUnitCost] = useState("");
  const [updating, setUpdating] = useState(false);

  /* Stored values stay in English; only the display is translated */
  const categoryLabel = category =>
    category === "Feed"
      ? t("catFeed")
      : category === "Medicine"
      ? t("catMedicine")
      : category === "Other"
      ? t("catOther")
      : category || t("expense");

  const statusLabel = status =>
    status === "closed"
      ? t("statusClosed")
      : status === "active" || !status
      ? t("statusActive")
      : status;

  useEffect(() => {
    let active = true;

    const loadRole = async () => {
      const user = auth.currentUser;

      if (!user) {
        if (active) {
          setRoleLoading(false);
          setLoading(false);
        }
        return;
      }

      try {
        const snap = await getDoc(doc(db, "users", user.uid));

        if (active && snap.exists()) {
          setUserRole(snap.data().role || null);
        }
      } catch (error) {
        console.log("Role error:", error.code, error.message);

        if (active) {
          Alert.alert(t("accountError"), t("permError"));
        }
      } finally {
        if (active) setRoleLoading(false);
      }
    };

    loadRole();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    const user = auth.currentUser;

    if (!user || !userRole) return;

    let batchLoaded = false;
    let salesLoaded = false;
    let deathsLoaded = false;
    let expensesLoaded = false;

    const updateLoading = () => {
      if (batchLoaded && salesLoaded && deathsLoaded && expensesLoaded) {
        setLoading(false);
      }
    };

    const unsubBatch = onSnapshot(
      doc(db, "batches", batchId),
      snap => {
        setBatch(snap.exists() ? { id: snap.id, ...snap.data() } : null);

        batchLoaded = true;
        updateLoading();
      },
      error => {
        console.log("Batch error:", error.code, error.message);
        batchLoaded = true;
        updateLoading();

        Alert.alert(t("batchError"), t("couldNotLoadDetails"));
      }
    );

    const unsubSales = onSnapshot(
      query(collection(db, "sales"), where("batchId", "==", batchId)),
      snap => {
        setSales(snap.docs.map(item => ({ id: item.id, ...item.data() })));

        salesLoaded = true;
        updateLoading();
      },
      error => {
        console.log("Sales error:", error.code, error.message);
        salesLoaded = true;
        updateLoading();

        Alert.alert(t("salesError"), t("couldNotLoadSales"));
      }
    );

    const unsubDeaths = onSnapshot(
      query(collection(db, "deaths"), where("batchId", "==", batchId)),
      snap => {
        setDeaths(snap.docs.map(item => ({ id: item.id, ...item.data() })));

        deathsLoaded = true;
        updateLoading();
      },
      error => {
        console.log("Deaths error:", error.code, error.message);
        deathsLoaded = true;
        updateLoading();

        Alert.alert(t("deathsError"), t("couldNotLoadDeaths"));
      }
    );

    const unsubExpenses = onSnapshot(
      query(collection(db, "expenses"), where("batchId", "==", batchId)),
      snap => {
        setExpenses(snap.docs.map(item => ({ id: item.id, ...item.data() })));

        expensesLoaded = true;
        updateLoading();
      },
      error => {
        console.log("Expenses error:", error.code, error.message);
        expensesLoaded = true;
        updateLoading();

        Alert.alert(t("expensesError"), t("couldNotLoadExpenses"));
      }
    );

    return () => {
      unsubBatch();
      unsubSales();
      unsubDeaths();
      unsubExpenses();
    };
  }, [batchId, userRole]);

  const totalSold = sales.reduce(
    (sum, item) => sum + Number(item.quantity || 0),
    0
  );

  const totalDeaths = deaths.reduce(
    (sum, item) => sum + Number(item.quantity || 0),
    0
  );

  const revenue = sales.reduce(
    (sum, item) =>
      sum +
      Number(item.totalAmount ?? Number(item.quantity || 0) * SELLING_PRICE),
    0
  );

  const starting = Number(batch?.initialChickens || 0);

  const purchaseCost = Number(
    batch?.totalPurchaseCost ?? starting * Number(batch?.pricePerChicken || 0)
  );

  const otherExpenses = expenses.reduce(
    (sum, item) => sum + Number(item.totalAmount || 0),
    0
  );

  const totalExpenses = purchaseCost + otherExpenses;
  const remaining = starting - totalSold - totalDeaths;
  const profit = revenue - totalExpenses;

  const isAdmin = userRole === "admin";
  const isStaff = userRole === "staff";

  const openScreen = screen =>
    navigation.navigate(screen, {
      batchId,
      batchName: batch?.batchName || batchName
    });

  const openEdit = (type, record) => {
    setEditingRecord({ type, record });

    setEditQuantity(String(record.quantity ?? ""));
    setEditCategory(record.category || "Other");
    setEditUnitCost(String(record.unitCost ?? ""));
  };

  const showRecordMenu = (type, record) => {
    const label =
      type === "sale"
        ? t("saleLabel")
        : type === "death"
        ? t("deathRecordLabel")
        : t("expense");

    Alert.alert(
      t("recordOptions").replace("{label}", label),
      t("chooseAction"),
      [
        {
          text: t("edit"),
          onPress: () => openEdit(type, record)
        },
        {
          text: t("delete"),
          style: "destructive",
          onPress: () => confirmDeleteRecord(type, record)
        },
        {
          text: t("cancel"),
          style: "cancel"
        }
      ]
    );
  };

  const confirmDeleteRecord = (type, record) => {
    const collectionName =
      type === "sale" ? "sales" : type === "death" ? "deaths" : "expenses";

    Alert.alert(t("deleteRecordQ"), t("deleteRecordMsg"), [
      {
        text: t("cancel"),
        style: "cancel"
      },
      {
        text: t("delete"),
        style: "destructive",
        onPress: async () => {
          try {
            await deleteDoc(doc(db, collectionName, record.id));

            Alert.alert(t("recordDeleted"), t("recordDeletedMsg"));
          } catch (error) {
            console.log("Record delete error:", error.code, error.message);

            Alert.alert(t("couldNotDeleteRecord"), t("deleteRecordRules"));
          }
        }
      }
    ]);
  };

  const saveRecordEdit = async () => {
    if (!editingRecord) return;

    const { type, record } = editingRecord;
    const quantity = Number(editQuantity);

    if (!Number.isInteger(quantity) || quantity <= 0) {
      return Alert.alert(t("invalidQuantity"), t("wholeNumberMsg"));
    }

    const collectionName =
      type === "sale" ? "sales" : type === "death" ? "deaths" : "expenses";

    let changes = { quantity };

    if (type === "sale") {
      changes.pricePerChicken = SELLING_PRICE;
      changes.totalAmount = quantity * SELLING_PRICE;
    } else if (type === "expense") {
      const unitCost = Number(editUnitCost);

      if (!Number.isFinite(unitCost) || unitCost <= 0) {
        return Alert.alert(t("invalidUnitCost"), t("unitCostMsg"));
      }

      if (!CATEGORIES.includes(editCategory)) {
        return Alert.alert(t("invalidCategory"), t("categoryMsg"));
      }

      changes.category = editCategory;
      changes.unitCost = unitCost;
      changes.totalAmount = quantity * unitCost;
    }

    setUpdating(true);

    try {
      await updateDoc(doc(db, collectionName, record.id), changes);

      setEditingRecord(null);

      Alert.alert(t("recordUpdated"), t("recordUpdatedMsg"));
    } catch (error) {
      console.log("Record update error:", error.code, error.message);

      Alert.alert(t("couldNotUpdateRecord"), t("updateRecordRules"));
    } finally {
      setUpdating(false);
    }
  };

  const renderRecordCard = (type, record, title, detail, amount) => (
    <View key={record.id} style={styles.recordCard}>
      <View style={styles.recordTop}>
        <View style={styles.recordInfo}>
          <Text style={styles.recordTitle}>{title}</Text>
          <Text style={styles.recordDetail}>{detail}</Text>

          {amount ? <Text style={styles.recordAmount}>{amount}</Text> : null}
        </View>

        {isAdmin && (
          <TouchableOpacity
            style={styles.menuButton}
            onPress={() => showRecordMenu(type, record)}
            accessibilityLabel={`${t("optionsFor")} ${title}`}
          >
            <Text style={styles.menuDots}>⋮</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );

  if (roleLoading || loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={GREEN} />
        <Text style={styles.loadingText}>{t("loadingBatch")}</Text>
      </View>
    );
  }

  if (!batch) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.emptyTitle}>{t("batchNotFound")}</Text>
        <Text style={styles.emptyText}>{t("batchNotFoundMsg")}</Text>
      </View>
    );
  }

  if (!isAdmin && !isStaff) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.emptyTitle}>{t("accessUnavailable")}</Text>
        <Text style={styles.emptyText}>{t("accessUnavailableMsg")}</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.container}
      showsVerticalScrollIndicator={false}
    >
      {/* HEADER */}
      <View style={styles.header}>
        <Text style={styles.logo}>🐔</Text>

        <Text style={styles.heading}>{batch.batchName || batchName}</Text>

        <Text style={styles.subtitle}>{t("batchSubtitle")}</Text>

        <View style={styles.statusBadge}>
          <Text style={styles.statusText}>{statusLabel(batch.status)}</Text>
        </View>
      </View>

      {/* STOCK */}
      <Text style={styles.sectionTitle}>{t("stockOverview")}</Text>

      <View style={styles.grid}>
        <View style={styles.statCard}>
          <Text style={styles.statLabel}>{t("startingChickens")}</Text>
          <Text style={styles.statValue}>{starting}</Text>
        </View>

        <View style={styles.statCard}>
          <Text style={styles.statLabel}>{t("chickensSold")}</Text>
          <Text style={styles.statValue}>{totalSold}</Text>
        </View>

        <View style={styles.statCard}>
          <Text style={styles.statLabel}>{t("chickensDied")}</Text>
          <Text style={[styles.statValue, styles.redText]}>{totalDeaths}</Text>
        </View>

        <View style={styles.statCard}>
          <Text style={styles.statLabel}>{t("remainingStock")}</Text>
          <Text
            style={[
              styles.statValue,
              remaining < 0 ? styles.redText : styles.greenText
            ]}
          >
            {remaining}
          </Text>
        </View>
      </View>

      {remaining < 0 && (
        <View style={styles.warningCard}>
          <Text style={styles.warningText}>{t("warningStock")}</Text>
        </View>
      )}

      {/* FINANCE */}
      <Text style={styles.sectionTitle}>{t("financialOverview")}</Text>

      <View style={styles.financeCard}>
        <View style={styles.financeMetric}>
          <Text style={styles.financeLabel}>{t("salesRevenue")}</Text>
          <Text style={styles.revenueValue}>{money(revenue)}</Text>
        </View>

        <View style={styles.financeDivider} />

        <View style={styles.financeMetric}>
          <Text style={styles.financeLabel}>{t("totalExpenses")}</Text>
          <Text style={styles.financeValue}>{money(totalExpenses)}</Text>
          <Text style={styles.expenseBreakdown}>{t("expenseBreakdown")}</Text>
        </View>

        <View style={styles.financeDivider} />

        <View style={styles.financeProfit}>
          <Text style={styles.financeLabel}>{t("profitMade")}</Text>
          <Text style={[styles.profitValue, profit < 0 && styles.redText]}>
            {money(profit)}
          </Text>
        </View>
      </View>

      {/* SALES */}
      <Text style={styles.sectionTitle}>
        {t("salesRecords")} ({sales.length})
      </Text>

      {sales.length === 0 ? (
        <Text style={styles.noRecords}>{t("noSales")}</Text>
      ) : (
        sales.map(item =>
          renderRecordCard(
            "sale",
            item,
            `${t("saleLabel")} – ${item.quantity || 0} ${t("chickens")}`,
            `${t("pricePerChicken")}: ${money(
              item.pricePerChicken || SELLING_PRICE
            )}`,
            money(
              item.totalAmount ?? Number(item.quantity || 0) * SELLING_PRICE
            )
          )
        )
      )}

      {/* DEATHS */}
      <Text style={styles.sectionTitle}>
        {t("deathRecords")} ({deaths.length})
      </Text>

      {deaths.length === 0 ? (
        <Text style={styles.noRecords}>{t("noDeaths")}</Text>
      ) : (
        deaths.map(item =>
          renderRecordCard(
            "death",
            item,
            `${t("deathsTitle")} – ${item.quantity || 0} ${t("chickens")}`,
            item.reason || t("recordedDeaths"),
            null
          )
        )
      )}

      {/* EXPENSES */}
      <Text style={styles.sectionTitle}>
        {t("expenseRecords")} ({expenses.length})
      </Text>

      {expenses.length === 0 ? (
        <Text style={styles.noRecords}>{t("noExpenses")}</Text>
      ) : (
        expenses.map(item =>
          renderRecordCard(
            "expense",
            item,
            `${categoryLabel(item.category)} – ${item.quantity || 0}`,
            `${t("unitCost")}: ${money(item.unitCost)}`,
            money(item.totalAmount)
          )
        )
      )}

      {/* STAFF ACTIONS */}
      {isStaff && (
        <>
          <Text style={styles.sectionTitle}>
            {t("recordBusinessActivity")}
          </Text>

          <TouchableOpacity
            style={styles.button}
            onPress={() => openScreen("AddSale")}
          >
            <Text style={styles.buttonText}>{t("addSaleBtn")}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.button}
            onPress={() => openScreen("RecordDeath")}
          >
            <Text style={styles.buttonText}>{t("addDeathBtn")}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.button}
            onPress={() => openScreen("AddExpense")}
          >
            <Text style={styles.buttonText}>{t("addExpenseBtn")}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={() => openScreen("DailyRecords")}
          >
            <Text style={styles.secondaryButtonText}>{t("addDailyBtn")}</Text>
          </TouchableOpacity>
        </>
      )}

      <TouchableOpacity
        style={styles.secondaryButton}
        onPress={() => navigation.navigate("Batches")}
      >
        <Text style={styles.secondaryButtonText}>{t("backToBatches")}</Text>
      </TouchableOpacity>

      <Text style={styles.footer}>{t("appFooter")}</Text>

      {/* EDIT MODAL */}
      <Modal
        visible={!!editingRecord}
        transparent
        animationType="fade"
        onRequestClose={() => setEditingRecord(null)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>
              {editingRecord?.type === "sale"
                ? t("editSale")
                : editingRecord?.type === "death"
                ? t("editDeath")
                : t("editExpense")}
            </Text>

            <Text style={styles.label}>{t("quantity")}</Text>

            <TextInput
              style={styles.input}
              value={editQuantity}
              onChangeText={text =>
                setEditQuantity(text.replace(/[^0-9]/g, ""))
              }
              keyboardType="number-pad"
            />

            {editingRecord?.type === "expense" && (
              <>
                <Text style={styles.label}>{t("category")}</Text>

                <View style={styles.categoryRow}>
                  {CATEGORIES.map(category => (
                    <TouchableOpacity
                      key={category}
                      style={[
                        styles.categoryButton,
                        editCategory === category && styles.categorySelected
                      ]}
                      onPress={() => setEditCategory(category)}
                    >
                      <Text
                        style={[
                          styles.categoryText,
                          editCategory === category &&
                            styles.categoryTextSelected
                        ]}
                      >
                        {categoryLabel(category)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <Text style={styles.label}>{t("unitCostLabel")}</Text>

                <TextInput
                  style={styles.input}
                  value={editUnitCost}
                  onChangeText={setEditUnitCost}
                  keyboardType="decimal-pad"
                />
              </>
            )}

            {editingRecord?.type === "sale" && (
              <Text style={styles.modalHint}>
                {t("sellingPriceFixed").replace("{price}", SELLING_PRICE)}
              </Text>
            )}

            <TouchableOpacity
              style={[styles.button, updating && styles.disabledButton]}
              onPress={saveRecordEdit}
              disabled={updating}
            >
              {updating ? (
                <ActivityIndicator color={WHITE} />
              ) : (
                <Text style={styles.buttonText}>{t("saveChanges")}</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => setEditingRecord(null)}
            >
              <Text style={styles.cancelText}>{t("cancel")}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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

  loadingContainer: {
    flex: 1,
    backgroundColor: CREAM,
    justifyContent: "center",
    alignItems: "center",
    padding: 25
  },

  loadingText: {
    color: GREEN,
    marginTop: 12,
    fontSize: 14
  },

  /* HEADER */
  header: {
    backgroundColor: WHITE,
    padding: 25,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: BORDER,
    alignItems: "center",
    marginBottom: 14,
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

  heading: {
    color: GREEN,
    fontSize: 25,
    fontWeight: "bold",
    textAlign: "center"
  },

  subtitle: {
    color: MUTED,
    fontSize: 14,
    marginTop: 7,
    textAlign: "center"
  },

  statusBadge: {
    alignSelf: "center",
    backgroundColor: SOFT_GREEN,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    marginTop: 14
  },

  statusText: {
    color: GREEN,
    fontWeight: "bold",
    fontSize: 12,
    textTransform: "capitalize"
  },

  sectionTitle: {
    color: GREEN,
    fontSize: 19,
    fontWeight: "bold",
    marginTop: 18,
    marginBottom: 12
  },

  /* STOCK */
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between"
  },

  statCard: {
    width: "48%",
    backgroundColor: WHITE,
    padding: 16,
    borderRadius: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: BORDER,
    elevation: 2,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5
  },

  statLabel: {
    color: MUTED,
    fontSize: 13
  },

  statValue: {
    color: GREEN,
    fontSize: 26,
    fontWeight: "bold",
    marginTop: 8
  },

  greenText: {
    color: GREEN
  },

  redText: {
    color: RED
  },

  warningCard: {
    backgroundColor: "#FDECEC",
    padding: 14,
    borderRadius: 12,
    marginBottom: 16
  },

  warningText: {
    color: RED,
    fontSize: 13,
    lineHeight: 19
  },

  /* FINANCE */
  financeCard: {
    backgroundColor: WHITE,
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: BORDER,
    marginBottom: 10,
    elevation: 4,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 8
  },

  financeMetric: {
    paddingVertical: 8
  },

  financeProfit: {
    backgroundColor: INPUT_BG,
    borderWidth: 1,
    borderColor: INPUT_BORDER,
    borderRadius: 14,
    padding: 14,
    marginTop: 4
  },

  financeDivider: {
    height: 1,
    backgroundColor: BORDER,
    marginVertical: 12
  },

  expenseBreakdown: {
    color: MUTED,
    fontSize: 11,
    marginTop: 5,
    lineHeight: 16
  },

  financeLabel: {
    color: MUTED,
    fontSize: 13
  },

  financeValue: {
    color: "#26372B",
    fontSize: 19,
    fontWeight: "bold",
    marginTop: 6
  },

  revenueValue: {
    color: GREEN,
    fontSize: 23,
    fontWeight: "bold",
    marginTop: 6
  },

  profitValue: {
    color: GREEN,
    fontSize: 24,
    fontWeight: "bold",
    marginTop: 6
  },

  /* RECORDS */
  recordCard: {
    backgroundColor: WHITE,
    borderRadius: 16,
    padding: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: BORDER,
    elevation: 2,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5
  },

  recordTop: {
    flexDirection: "row",
    alignItems: "center"
  },

  recordInfo: {
    flex: 1
  },

  recordTitle: {
    color: LABEL,
    fontSize: 15,
    fontWeight: "700"
  },

  recordDetail: {
    color: MUTED,
    fontSize: 12,
    marginTop: 5
  },

  recordAmount: {
    color: GOLD,
    fontSize: 14,
    fontWeight: "bold",
    marginTop: 6
  },

  menuButton: {
    width: 38,
    height: 38,
    marginLeft: 8,
    borderRadius: 19,
    backgroundColor: INPUT_BG,
    borderWidth: 1,
    borderColor: INPUT_BORDER,
    alignItems: "center",
    justifyContent: "center"
  },

  menuDots: {
    color: GREEN,
    fontSize: 25,
    fontWeight: "bold",
    lineHeight: 27
  },

  noRecords: {
    color: MUTED,
    backgroundColor: WHITE,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 14,
    padding: 16,
    fontSize: 13,
    overflow: "hidden"
  },

  /* BUTTONS */
  button: {
    height: 54,
    backgroundColor: GOLD,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
    marginTop: 4,
    borderBottomWidth: 3,
    borderBottomColor: GOLD
  },

  disabledButton: {
    opacity: 0.6
  },

  buttonText: {
    color: WHITE,
    fontSize: 15,
    fontWeight: "bold",
    letterSpacing: 0.5
  },

  secondaryButton: {
    height: 52,
    borderWidth: 1.5,
    borderColor: GREEN,
    backgroundColor: WHITE,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8
  },

  secondaryButtonText: {
    color: GREEN,
    fontSize: 15,
    fontWeight: "bold"
  },

  emptyTitle: {
    color: GREEN,
    fontSize: 19,
    fontWeight: "bold",
    textAlign: "center"
  },

  emptyText: {
    color: MUTED,
    fontSize: 14,
    textAlign: "center",
    marginTop: 8,
    lineHeight: 20
  },

  footer: {
    textAlign: "center",
    color: "#9A9A8E",
    fontSize: 12,
    marginTop: 24
  },

  /* MODAL */
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    padding: 20
  },

  modalCard: {
    backgroundColor: WHITE,
    borderRadius: 20,
    padding: 25,
    borderWidth: 1,
    borderColor: BORDER,
    elevation: 6
  },

  modalTitle: {
    color: GREEN,
    fontSize: 22,
    fontWeight: "bold"
  },

  label: {
    color: LABEL,
    fontSize: 14,
    fontWeight: "700",
    marginBottom: 9,
    marginTop: 16
  },

  input: {
    height: 52,
    borderWidth: 1,
    borderColor: INPUT_BORDER,
    borderRadius: 12,
    paddingHorizontal: 15,
    fontSize: 15,
    color: "#26372B",
    backgroundColor: INPUT_BG
  },

  modalHint: {
    color: MUTED,
    fontSize: 12,
    marginTop: 14
  },

  categoryRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 2
  },

  categoryButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: INPUT_BORDER,
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: "center",
    backgroundColor: INPUT_BG
  },

  categorySelected: {
    backgroundColor: WHITE,
    borderColor: GREEN,
    borderWidth: 2
  },

  categoryText: {
    color: MUTED,
    fontSize: 12,
    fontWeight: "700"
  },

  categoryTextSelected: {
    color: GREEN
  },

  cancelButton: {
    padding: 14,
    alignItems: "center",
    marginTop: 6
  },

  cancelText: {
    color: GREEN,
    fontWeight: "bold",
    fontSize: 15
  }
});