import React, { useEffect, useState } from "react";
import {
  View, Text, TouchableOpacity, StyleSheet, Alert, ScrollView,
  ActivityIndicator, Modal, TextInput
} from "react-native";
import {
  collection, onSnapshot, query, where, doc, getDoc,
  updateDoc, deleteDoc
} from "firebase/firestore";
import { auth, db } from "../Config/firebase";

const GREEN = "#245C38";
const CREAM = "#F4F1E8";
const LIGHT_GREEN = "#E4F1E5";
const BROWN = "#8B5E3C";
const RED = "#B42318";
const SELLING_PRICE = 85;

const money = amount =>
  "R " + Number(amount || 0).toLocaleString("en-ZA", {
    minimumFractionDigits: 2, maximumFractionDigits: 2
  });

export default function BatchDetailsScreen({ route, navigation }) {
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
          Alert.alert(
            "Account error",
            "Could not verify your account permissions."
          );
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
      if (
        batchLoaded &&
        salesLoaded &&
        deathsLoaded &&
        expensesLoaded
      ) {
        setLoading(false);
      }
    };

    const unsubBatch = onSnapshot(
      doc(db, "batches", batchId),
      snap => {
        setBatch(
          snap.exists()
            ? { id: snap.id, ...snap.data() }
            : null
        );

        batchLoaded = true;
        updateLoading();
      },
      error => {
        console.log("Batch error:", error.code, error.message);
        batchLoaded = true;
        updateLoading();

        Alert.alert("Batch error", "Could not load batch details.");
      }
    );

    const unsubSales = onSnapshot(
      query(
        collection(db, "sales"),
        where("batchId", "==", batchId)
      ),
      snap => {
        setSales(
          snap.docs.map(item => ({
            id: item.id,
            ...item.data()
          }))
        );

        salesLoaded = true;
        updateLoading();
      },
      error => {
        console.log("Sales error:", error.code, error.message);
        salesLoaded = true;
        updateLoading();

        Alert.alert("Sales error", "Could not load sales for this batch.");
      }
    );

    const unsubDeaths = onSnapshot(
      query(
        collection(db, "deaths"),
        where("batchId", "==", batchId)
      ),
      snap => {
        setDeaths(
          snap.docs.map(item => ({
            id: item.id,
            ...item.data()
          }))
        );

        deathsLoaded = true;
        updateLoading();
      },
      error => {
        console.log("Deaths error:", error.code, error.message);
        deathsLoaded = true;
        updateLoading();

        Alert.alert("Deaths error", "Could not load death records.");
      }
    );

    const unsubExpenses = onSnapshot(
      query(
        collection(db, "expenses"),
        where("batchId", "==", batchId)
      ),
      snap => {
        setExpenses(
          snap.docs.map(item => ({
            id: item.id,
            ...item.data()
          }))
        );

        expensesLoaded = true;
        updateLoading();
      },
      error => {
        console.log("Expenses error:", error.code, error.message);
        expensesLoaded = true;
        updateLoading();

        Alert.alert("Expenses error", "Could not load expenses for this batch.");
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
      Number(
        item.totalAmount ??
        Number(item.quantity || 0) * SELLING_PRICE
      ),
    0
  );

  const starting = Number(batch?.initialChickens || 0);

  const purchaseCost = Number(
    batch?.totalPurchaseCost ??
    starting * Number(batch?.pricePerChicken || 0)
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
        ? "Sale"
        : type === "death"
        ? "Death record"
        : "Expense";

    Alert.alert(
      `${label} options`,
      "Choose an action",
      [
        {
          text: "Edit",
          onPress: () => openEdit(type, record)
        },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => confirmDeleteRecord(type, record)
        },
        {
          text: "Cancel",
          style: "cancel"
        }
      ]
    );
  };

  const confirmDeleteRecord = (type, record) => {
    const collectionName =
      type === "sale"
        ? "sales"
        : type === "death"
        ? "deaths"
        : "expenses";

    Alert.alert(
      "Delete record?",
      "This action cannot be undone. Are you sure you want to delete this record?",
      [
        {
          text: "Cancel",
          style: "cancel"
        },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteDoc(
                doc(db, collectionName, record.id)
              );

              Alert.alert(
                "Record deleted",
                "The record has been removed and the totals will update."
              );
            } catch (error) {
              console.log(
                "Record delete error:",
                error.code,
                error.message
              );

              Alert.alert(
                "Could not delete record",
                "Check your Firestore rules. Only the admin can delete records."
              );
            }
          }
        }
      ]
    );
  };

  const saveRecordEdit = async () => {
    if (!editingRecord) return;

    const { type, record } = editingRecord;
    const quantity = Number(editQuantity);

    if (!Number.isInteger(quantity) || quantity <= 0) {
      return Alert.alert(
        "Invalid quantity",
        "Enter a whole number greater than zero."
      );
    }

    const collectionName =
      type === "sale"
        ? "sales"
        : type === "death"
        ? "deaths"
        : "expenses";

    let changes = { quantity };

    if (type === "sale") {
      changes.pricePerChicken = SELLING_PRICE;
      changes.totalAmount = quantity * SELLING_PRICE;
    } else if (type === "expense") {
      const unitCost = Number(editUnitCost);

      if (!Number.isFinite(unitCost) || unitCost <= 0) {
        return Alert.alert(
          "Invalid unit cost",
          "Enter a unit cost greater than zero."
        );
      }

      if (!["Feed", "Medicine", "Other"].includes(editCategory)) {
        return Alert.alert(
          "Invalid category",
          "Choose Feed, Medicine or Other."
        );
      }

      changes.category = editCategory;
      changes.unitCost = unitCost;
      changes.totalAmount = quantity * unitCost;
    }

    setUpdating(true);

    try {
      await updateDoc(
        doc(db, collectionName, record.id),
        changes
      );

      setEditingRecord(null);

      Alert.alert(
        "Record updated",
        "The record and batch totals have been updated."
      );
    } catch (error) {
      console.log(
        "Record update error:",
        error.code,
        error.message
      );

      Alert.alert(
        "Could not update record",
        "Check that your Firestore rules allow admins to update this collection."
      );
    } finally {
      setUpdating(false);
    }
  };

  const renderRecordCard = (
    type,
    record,
    title,
    detail,
    amount
  ) => (
    <View key={record.id} style={styles.recordCard}>
      <View style={styles.recordTop}>
        <View style={styles.recordInfo}>
          <Text style={styles.recordTitle}>{title}</Text>
          <Text style={styles.recordDetail}>{detail}</Text>

          {amount ? (
            <Text style={styles.recordAmount}>{amount}</Text>
          ) : null}
        </View>

        {isAdmin && (
          <TouchableOpacity
            style={styles.menuButton}
            onPress={() => showRecordMenu(type, record)}
            accessibilityLabel={`Options for ${title}`}
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
        <Text style={styles.loadingText}>
          Loading batch information...
        </Text>
      </View>
    );
  }

  if (!batch) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.emptyTitle}>Batch not found</Text>
        <Text style={styles.emptyText}>
          This batch may have been deleted or is unavailable.
        </Text>
      </View>
    );
  }

  if (!isAdmin && !isStaff) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.emptyTitle}>Access unavailable</Text>
        <Text style={styles.emptyText}>
          Your account role could not be verified. Please log in again.
        </Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.container}
    >
      <View style={styles.header}>
        <Text style={styles.brand}>
          Mtombeni Chicken Business 🐔
        </Text>

        <Text style={styles.heading}>
          {batch.batchName || batchName}
        </Text>

        <Text style={styles.subtitle}>
          Batch stock and financial performance
        </Text>

        <View style={styles.statusBadge}>
          <Text style={styles.statusText}>
            {batch.status || "active"}
          </Text>
        </View>
      </View>

      <Text style={styles.sectionTitle}>Stock Overview</Text>

      <View style={styles.grid}>
        <View style={styles.statCard}>
          <Text style={styles.statLabel}>Starting chickens</Text>
          <Text style={styles.statValue}>{starting}</Text>
        </View>

        <View style={styles.statCard}>
          <Text style={styles.statLabel}>Chickens sold</Text>
          <Text style={styles.statValue}>{totalSold}</Text>
        </View>

        <View style={styles.statCard}>
          <Text style={styles.statLabel}>Chickens died</Text>
          <Text style={[styles.statValue, styles.redText]}>
            {totalDeaths}
          </Text>
        </View>

        <View style={styles.statCard}>
          <Text style={styles.statLabel}>Remaining stock</Text>
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
          <Text style={styles.warningText}>
            Warning: recorded sales and deaths exceed this batch's
            starting stock. Please check the records.
          </Text>
        </View>
      )}

      <Text style={styles.sectionTitle}>Financial Overview</Text>

      <View style={styles.financeCard}>
        <View style={styles.financeMetric}>
          <Text style={styles.financeLabel}>Sales Revenue</Text>
          <Text style={styles.revenueValue}>{money(revenue)}</Text>
        </View>

        <View style={styles.financeDivider} />

        <View style={styles.financeMetric}>
          <Text style={styles.financeLabel}>Total Expenses</Text>
          <Text style={styles.financeValue}>
            {money(totalExpenses)}
          </Text>
          <Text style={styles.expenseBreakdown}>
            Includes chicken purchase cost and all recorded batch expenses
          </Text>
        </View>

        <View style={styles.financeDivider} />

        <View style={styles.financeProfit}>
          <Text style={styles.financeLabel}>Profit Made</Text>
          <Text
            style={[
              styles.profitValue,
              profit < 0 && styles.redText
            ]}
          >
            {money(profit)}
          </Text>
        </View>
      </View>

      <Text style={styles.sectionTitle}>
        Sales Records ({sales.length})
      </Text>

      {sales.length === 0 ? (
        <Text style={styles.noRecords}>
          No sales recorded for this batch.
        </Text>
      ) : (
        sales.map(item =>
          renderRecordCard(
            "sale",
            item,
            `Sale – ${item.quantity || 0} chickens`,
            `Price per chicken: ${money(
              item.pricePerChicken || SELLING_PRICE
            )}`,
            money(
              item.totalAmount ??
              Number(item.quantity || 0) * SELLING_PRICE
            )
          )
        )
      )}

      <Text style={styles.sectionTitle}>
        Death Records ({deaths.length})
      </Text>

      {deaths.length === 0 ? (
        <Text style={styles.noRecords}>
          No deaths recorded for this batch.
        </Text>
      ) : (
        deaths.map(item =>
          renderRecordCard(
            "death",
            item,
            `Deaths – ${item.quantity || 0} chickens`,
            item.reason || "Recorded chicken deaths",
            null
          )
        )
      )}

      <Text style={styles.sectionTitle}>
        Expense Records ({expenses.length})
      </Text>

      {expenses.length === 0 ? (
        <Text style={styles.noRecords}>
          No expenses recorded for this batch.
        </Text>
      ) : (
        expenses.map(item =>
          renderRecordCard(
            "expense",
            item,
            `${item.category || "Expense"} – ${item.quantity || 0}`,
            `Unit cost: ${money(item.unitCost)}`,
            money(item.totalAmount)
          )
        )
      )}

      {isStaff && (
        <>
          <Text style={styles.sectionTitle}>
            Record Business Activity
          </Text>

          <TouchableOpacity
            style={styles.button}
            onPress={() => openScreen("AddSale")}
          >
            <Text style={styles.buttonText}>
              + Record Chicken Sale
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.button}
            onPress={() => openScreen("RecordDeath")}
          >
            <Text style={styles.buttonText}>
              + Record Chicken Deaths
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.button}
            onPress={() => openScreen("AddExpense")}
          >
            <Text style={styles.buttonText}>
              + Record Batch Expense
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={() => openScreen("DailyRecords")}
          >
            <Text style={styles.secondaryButtonText}>
              + Add Daily Record
            </Text>
          </TouchableOpacity>
        </>
      )}

      <TouchableOpacity
        style={styles.secondaryButton}
        onPress={() => navigation.navigate("Batches")}
      >
        <Text style={styles.secondaryButtonText}>
          Back to All Batches
        </Text>
      </TouchableOpacity>

      <Modal
        visible={!!editingRecord}
        transparent
        animationType="fade"
        onRequestClose={() => setEditingRecord(null)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>
              Edit{" "}
              {editingRecord?.type === "sale"
                ? "Sale"
                : editingRecord?.type === "death"
                ? "Death Record"
                : "Expense"}
            </Text>

            <Text style={styles.label}>Quantity</Text>

            <TextInput
              style={styles.input}
              value={editQuantity}
              onChangeText={t =>
                setEditQuantity(t.replace(/[^0-9]/g, ""))
              }
              keyboardType="number-pad"
            />

            {editingRecord?.type === "expense" && (
              <>
                <Text style={styles.label}>Category</Text>

                <View style={styles.categoryRow}>
                  {["Feed", "Medicine", "Other"].map(category => (
                    <TouchableOpacity
                      key={category}
                      style={[
                        styles.categoryButton,
                        editCategory === category &&
                          styles.categorySelected
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
                        {category}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <Text style={styles.label}>Unit cost (R)</Text>

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
                Selling price remains fixed at R85 per chicken.
              </Text>
            )}

            <TouchableOpacity
              style={styles.button}
              onPress={saveRecordEdit}
              disabled={updating}
            >
              {updating ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.buttonText}>Save Changes</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => setEditingRecord(null)}
            >
              <Text style={styles.cancelText}>Cancel</Text>
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
    padding: 18,
    paddingBottom: 35
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
  header: {
    backgroundColor: GREEN,
    padding: 22,
    borderRadius: 16,
    marginBottom: 24
  },
  brand: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "bold"
  },
  heading: {
    color: "#FFFFFF",
    fontSize: 25,
    fontWeight: "bold",
    marginTop: 18
  },
  subtitle: {
    color: "#E1EDE3",
    fontSize: 14,
    marginTop: 7
  },
  statusBadge: {
    alignSelf: "flex-start",
    backgroundColor: LIGHT_GREEN,
    paddingHorizontal: 12,
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
    marginTop: 15,
    marginBottom: 12
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between"
  },
  statCard: {
    width: "48%",
    backgroundColor: "#FFFFFF",
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#E8E2D5"
  },
  statLabel: {
    color: "#66736A",
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
    borderRadius: 10,
    marginBottom: 16
  },
  warningText: {
    color: RED,
    fontSize: 13,
    lineHeight: 19
  },
  financeCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: "#E8E2D5",
    marginBottom: 10,
    elevation: 2
  },
  financeMetric: {
    paddingVertical: 8
  },
  financeProfit: {
    backgroundColor: LIGHT_GREEN,
    borderRadius: 12,
    padding: 14,
    marginTop: 4
  },
  financeDivider: {
    height: 1,
    backgroundColor: "#E8E2D5",
    marginVertical: 12
  },
  expenseBreakdown: {
    color: BROWN,
    fontSize: 11,
    marginTop: 5
  },
  financeLabel: {
    color: "#66736A",
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
  recordCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 14,
    marginBottom: 9,
    borderWidth: 1,
    borderColor: "#E8E2D5"
  },
  recordTop: {
    flexDirection: "row",
    alignItems: "center"
  },
  recordInfo: {
    flex: 1
  },
  recordTitle: {
    color: GREEN,
    fontSize: 15,
    fontWeight: "bold"
  },
  recordDetail: {
    color: "#66736A",
    fontSize: 12,
    marginTop: 5
  },
  recordAmount: {
    color: BROWN,
    fontSize: 14,
    fontWeight: "bold",
    marginTop: 6
  },
  menuButton: {
    width: 38,
    height: 38,
    marginLeft: 8,
    borderRadius: 20,
    backgroundColor: LIGHT_GREEN,
    alignItems: "center",
    justifyContent: "center"
  },
  menuDots: {
    color: GREEN,
    fontSize: 27,
    fontWeight: "bold",
    lineHeight: 29
  },
  noRecords: {
    color: "#66736A",
    backgroundColor: "#FFFFFF",
    borderRadius: 10,
    padding: 14,
    fontSize: 13
  },
  button: {
    backgroundColor: GREEN,
    padding: 16,
    borderRadius: 10,
    alignItems: "center",
    marginBottom: 10,
    marginTop: 5
  },
  buttonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "bold"
  },
  secondaryButton: {
    borderWidth: 1,
    borderColor: GREEN,
    padding: 15,
    borderRadius: 10,
    alignItems: "center",
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
    fontWeight: "bold"
  },
  emptyText: {
    color: "#66736A",
    fontSize: 14,
    textAlign: "center",
    marginTop: 8,
    lineHeight: 20
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    padding: 20
  },
  modalCard: {
    backgroundColor: CREAM,
    borderRadius: 16,
    padding: 20,
    elevation: 5
  },
  modalTitle: {
    color: GREEN,
    fontSize: 21,
    fontWeight: "bold"
  },
  label: {
    color: "#35483A",
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 8,
    marginTop: 16
  },
  input: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#D5DED5",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 13,
    color: "#26372B",
    fontSize: 15
  },
  modalHint: {
    color: BROWN,
    fontSize: 12,
    marginTop: 12
  },
  categoryRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 2
  },
  categoryButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#D5DED5",
    borderRadius: 9,
    paddingVertical: 11,
    alignItems: "center",
    backgroundColor: "#FFFFFF"
  },
  categorySelected: {
    backgroundColor: LIGHT_GREEN,
    borderColor: GREEN
  },
  categoryText: {
    color: "#47564B",
    fontSize: 12,
    fontWeight: "600"
  },
  categoryTextSelected: {
    color: GREEN
  },
  cancelButton: {
    padding: 14,
    alignItems: "center",
    marginTop: 4
  },
  cancelText: {
    color: GREEN,
    fontWeight: "bold",
    fontSize: 15
  }
});