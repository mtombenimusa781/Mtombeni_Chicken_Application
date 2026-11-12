import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform
} from "react-native";
import {
  addDoc,
  collection,
  onSnapshot,
  query,
  orderBy,
  serverTimestamp,
  doc,
  getDoc
} from "firebase/firestore";
import { Ionicons } from "@expo/vector-icons";
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
const FOOTER = "#9A9A8E";
const PLACEHOLDER = "#888888";

/* Stored in Firestore in English; only the display is translated */
const categories = ["Feed", "Medicine", "Other"];

const money = amount =>
  "R " +
  Number(amount || 0).toLocaleString("en-ZA", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });

const cleanDecimal = text => {
  const cleaned = text.replace(/[^0-9.]/g, "");
  const parts = cleaned.split(".");

  return parts.length > 2
    ? parts[0] + "." + parts.slice(1).join("")
    : cleaned;
};

export default function AddExpenseScreen({ navigation, route }) {
  const { t } = useLanguage();

  const routeBatchId = route?.params?.batchId || "";
  const routeBatchName = route?.params?.batchName || "";

  const [category, setCategory] = useState("Feed");
  const [description, setDescription] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [unitCost, setUnitCost] = useState("");
  const [selectedBatchId, setSelectedBatchId] = useState(routeBatchId);
  const [selectedBatchName, setSelectedBatchName] = useState(routeBatchName);
  const [batches, setBatches] = useState([]);
  const [userRole, setUserRole] = useState(null);
  const [roleLoading, setRoleLoading] = useState(true);
  const [batchesLoading, setBatchesLoading] = useState(true);
  const [loading, setLoading] = useState(false);

  const qty = Number(quantity);
  const cost = Number(unitCost);
  const total =
    Number.isFinite(qty) && qty > 0 && Number.isFinite(cost) && cost > 0
      ? qty * cost
      : 0;

  const categoryLabel = item =>
    item === "Feed"
      ? t("catFeed")
      : item === "Medicine"
      ? t("catMedicine")
      : t("catOther");

  useEffect(() => {
    let active = true;

    const loadRole = async () => {
      const user = auth.currentUser;

      if (!user) {
        if (active) setRoleLoading(false);
        return;
      }

      try {
        const userSnapshot = await getDoc(doc(db, "users", user.uid));

        if (active && userSnapshot.exists()) {
          setUserRole(userSnapshot.data().role || null);
        }
      } catch (error) {
        console.log("Role loading error:", error.code, error.message);

        if (active) {
          Alert.alert(t("accountError"), t("roleVerifyError"));
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
    if (routeBatchId) {
      setSelectedBatchId(routeBatchId);
      setSelectedBatchName(routeBatchName);
    }
  }, [routeBatchId, routeBatchName]);

  useEffect(() => {
    const user = auth.currentUser;

    if (!user) {
      setBatchesLoading(false);
      return;
    }

    const batchesQuery = query(
      collection(db, "batches"),
      orderBy("createdAt", "desc")
    );

    const unsubscribe = onSnapshot(
      batchesQuery,
      snapshot => {
        const batchList = snapshot.docs.map(item => ({
          id: item.id,
          ...item.data()
        }));

        setBatches(batchList);

        const currentBatch = batchList.find(
          item => item.id === selectedBatchId
        );

        if (currentBatch) {
          setSelectedBatchName(currentBatch.batchName || "");
        }

        setBatchesLoading(false);
      },
      error => {
        console.log("Batch loading error:", error.code, error.message);
        setBatchesLoading(false);
        Alert.alert(t("batchError"), t("couldNotLoadAvailable"));
      }
    );

    return unsubscribe;
  }, [selectedBatchId]);

  const chooseBatch = batch => {
    setSelectedBatchId(batch.id);
    setSelectedBatchName(batch.batchName || t("unnamedBatch"));
  };

  const saveExpense = async () => {
    const user = auth.currentUser;
    const parsedQuantity = Number(quantity);
    const parsedCost = Number(unitCost);

    if (!user) {
      Alert.alert(t("notSignedIn"), t("pleaseLoginAgain"));
      return;
    }

    if (userRole !== "staff") {
      Alert.alert(t("staffAccessRequired"), t("onlyStaffExpenseShort"));
      return;
    }

    if (!selectedBatchId) {
      Alert.alert(t("selectBatchTitle"), t("selectBatchExpenseMsg"));
      return;
    }

    const batch = batches.find(item => item.id === selectedBatchId);

    if (!batch) {
      Alert.alert(t("batchUnavailable"), t("selectExistingBatch"));
      return;
    }

    if (!description.trim()) {
      Alert.alert(t("missingDescription"), t("enterDescription"));
      return;
    }

    if (
      quantity.trim() === "" ||
      !Number.isFinite(parsedQuantity) ||
      parsedQuantity <= 0
    ) {
      Alert.alert(t("invalidQuantity"), t("qtyGreaterZero"));
      return;
    }

    if (
      unitCost.trim() === "" ||
      !Number.isFinite(parsedCost) ||
      parsedCost <= 0
    ) {
      Alert.alert(t("invalidUnitCost"), t("unitCostMsg"));
      return;
    }

    const expenseTotal = Number((parsedQuantity * parsedCost).toFixed(2));

    try {
      setLoading(true);

      const expenseRef = await addDoc(collection(db, "expenses"), {
        batchId: selectedBatchId,
        batchName: batch.batchName || selectedBatchName || "",
        category,
        description: description.trim(),
        quantity: parsedQuantity,
        unitCost: Number(parsedCost.toFixed(2)),
        totalAmount: expenseTotal,
        createdBy: user.uid,
        staffEmail: user.email || "",
        createdAt: serverTimestamp()
      });

      let activitySaved = true;

      try {
        const profileSnapshot = await getDoc(doc(db, "users", user.uid));

        const staffName = profileSnapshot.exists()
          ? profileSnapshot.data().name || "Staff member"
          : "Staff member";

        await addDoc(collection(db, "staffActivities"), {
          staffUid: user.uid,
          staffName,
          staffEmail: user.email || "",
          activityType: "Business Expense Recorded",
          description: `${category}: ${description.trim()}`,
          quantity: parsedQuantity,
          amount: expenseTotal,
          batchId: selectedBatchId,
          batchName: batch.batchName || selectedBatchName || "",
          relatedRecordId: expenseRef.id,
          createdAt: serverTimestamp()
        });
      } catch (activityError) {
        activitySaved = false;
        console.log(
          "Activity tracking error:",
          activityError.code,
          activityError.message
        );
      }

      setCategory("Feed");
      setDescription("");
      setQuantity("1");
      setUnitCost("");

      if (!routeBatchId) {
        setSelectedBatchId("");
        setSelectedBatchName("");
      }

      Alert.alert(
        activitySaved ? t("success") : t("expenseSaved"),
        activitySaved ? t("expenseSavedActivity") : t("expenseSavedLogFailed")
      );
    } catch (error) {
      console.log("Expense save error:", error.code, error.message);

      Alert.alert(
        t("couldNotSaveExpense"),
        error.code === "permission-denied"
          ? t("permissionDeniedExpense")
          : error.message || t("tryAgain")
      );
    } finally {
      setLoading(false);
    }
  };

  if (roleLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={GREEN} />
        <Text style={styles.helperText}>{t("checkingPermissions")}</Text>
      </View>
    );
  }

  if (userRole !== "staff") {
    return (
      <View style={styles.centered}>
        <View style={styles.card}>
          <Text style={styles.noAccessIcon}>🔒</Text>
          <Text style={styles.heading}>{t("recordExpenseHeading")}</Text>
          <Text style={styles.helperText}>{t("onlyStaffExpense")}</Text>

          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.secondaryButtonText}>{t("goBack")}</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const saveDisabled = loading || batchesLoading || !selectedBatchId;

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={Platform.OS === "ios" ? 20 : 0}
    >
      <ScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* HEADER */}
        <View style={styles.headerCard}>
          <Text style={styles.logo}>🧾</Text>
          <Text style={styles.heading}>{t("recordExpenseHeading")}</Text>
          <Text style={styles.subtitle}>{t("expenseSubtitle")}</Text>
        </View>

        <View style={styles.card}>
          {/* BATCH */}
          <Text style={[styles.label, styles.firstLabel]}>
            {t("selectChickenBatchLabel")}
          </Text>

          {routeBatchId ? (
            <View style={styles.selectedBatch}>
              <Text style={styles.selectedBatchLabel}>
                {t("selectedBatch")}
              </Text>
              <Text style={styles.selectedBatchName}>
                {selectedBatchName || routeBatchName || t("loadingBatchShort")}
              </Text>
            </View>
          ) : batchesLoading ? (
            <ActivityIndicator color={GREEN} style={styles.batchLoader} />
          ) : batches.length === 0 ? (
            <View style={styles.notice}>
              <Text style={styles.noticeText}>{t("noBatchesAskAdmin")}</Text>
            </View>
          ) : (
            <View style={styles.batchList}>
              {batches.map(batch => {
                const selected = selectedBatchId === batch.id;

                return (
                  <TouchableOpacity
                    key={batch.id}
                    style={[
                      styles.batchOption,
                      selected && styles.batchOptionSelected
                    ]}
                    onPress={() => chooseBatch(batch)}
                    disabled={loading}
                    activeOpacity={0.8}
                  >
                    <View style={styles.batchOptionText}>
                      <Text
                        style={[
                          styles.batchName,
                          selected && styles.batchNameSelected
                        ]}
                      >
                        {batch.batchName || t("unnamedBatch")}
                      </Text>
                      <Text style={styles.batchMeta}>
                        {t("startingChickens")}: {batch.initialChickens || 0}
                      </Text>
                    </View>

                    {selected ? (
                      <Ionicons
                        name="checkmark-circle"
                        size={26}
                        color={GOLD}
                      />
                    ) : (
                      <View style={styles.emptyCircle} />
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          )}

          {/* CATEGORY */}
          <Text style={styles.label}>{t("expenseCategoryLabel")}</Text>

          <View style={styles.categories}>
            {categories.map(item => {
              const selected = category === item;

              return (
                <TouchableOpacity
                  key={item}
                  style={[
                    styles.categoryButton,
                    selected && styles.categorySelected
                  ]}
                  onPress={() => setCategory(item)}
                  disabled={loading}
                  activeOpacity={0.8}
                >
                  <Text
                    style={[
                      styles.categoryText,
                      selected && styles.categoryTextSelected
                    ]}
                  >
                    {categoryLabel(item)}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* DESCRIPTION */}
          <Text style={styles.label}>{t("descriptionLabel")}</Text>
          <TextInput
            style={styles.input}
            value={description}
            onChangeText={setDescription}
            placeholder={t("descriptionPlaceholder")}
            placeholderTextColor={PLACEHOLDER}
            editable={!loading}
          />

          {/* QUANTITY */}
          <Text style={styles.label}>{t("quantityPurchasedLabel")}</Text>
          <TextInput
            style={styles.input}
            value={quantity}
            onChangeText={text => setQuantity(cleanDecimal(text))}
            keyboardType="decimal-pad"
            placeholder={t("quantityPlaceholder")}
            placeholderTextColor={PLACEHOLDER}
            editable={!loading}
          />

          {/* UNIT COST */}
          <Text style={styles.label}>{t("costPerUnitLabel")}</Text>
          <TextInput
            style={styles.input}
            value={unitCost}
            onChangeText={text => setUnitCost(cleanDecimal(text))}
            keyboardType="decimal-pad"
            placeholder={t("costPlaceholder")}
            placeholderTextColor={PLACEHOLDER}
            editable={!loading}
          />

          {/* TOTAL */}
          <View style={styles.totalBox}>
            <Text style={styles.totalLabel}>{t("totalExpenseLabel")}</Text>
            <Text style={styles.total}>{money(total)}</Text>
            <Text style={styles.totalHint}>
              {quantity || "0"} × {money(cost)}
            </Text>
          </View>

          {/* SAVE */}
          <TouchableOpacity
            style={[styles.button, saveDisabled && styles.disabledButton]}
            onPress={saveExpense}
            disabled={saveDisabled}
          >
            {loading ? (
              <ActivityIndicator color={WHITE} />
            ) : (
              <Text style={styles.buttonText}>{t("saveExpense")}</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={() => navigation.goBack()}
            disabled={loading}
          >
            <Text style={styles.secondaryButtonText}>{t("goBack")}</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.footer}>{t("appFooter")}</Text>
      </ScrollView>
    </KeyboardAvoidingView>
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

  centered: {
    flex: 1,
    backgroundColor: CREAM,
    justifyContent: "center",
    alignItems: "center",
    padding: 24
  },

  /* HEADER */
  headerCard: {
    backgroundColor: WHITE,
    padding: 25,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: BORDER,
    alignItems: "center",
    marginBottom: 20,
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
    fontSize: 23,
    fontWeight: "bold",
    textAlign: "center"
  },

  subtitle: {
    color: MUTED,
    fontSize: 14,
    marginTop: 7,
    textAlign: "center"
  },

  /* MAIN CARD */
  card: {
    backgroundColor: WHITE,
    borderRadius: 20,
    padding: 25,
    borderWidth: 1,
    borderColor: BORDER,
    elevation: 4,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 8
  },

  noAccessIcon: {
    fontSize: 44,
    textAlign: "center",
    marginBottom: 10
  },

  helperText: {
    color: MUTED,
    fontSize: 14,
    lineHeight: 21,
    textAlign: "center",
    marginTop: 10
  },

  label: {
    color: LABEL,
    fontSize: 14,
    fontWeight: "700",
    marginBottom: 9,
    marginTop: 18
  },

  firstLabel: {
    marginTop: 0
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

  /* BATCH SELECTION */
  batchLoader: {
    marginVertical: 14
  },

  notice: {
    backgroundColor: INPUT_BG,
    borderWidth: 1,
    borderColor: INPUT_BORDER,
    borderRadius: 12,
    padding: 16
  },

  noticeText: {
    color: MUTED,
    fontSize: 13,
    lineHeight: 19,
    textAlign: "center"
  },

  selectedBatch: {
    backgroundColor: INPUT_BG,
    borderWidth: 2,
    borderColor: GREEN,
    borderRadius: 12,
    padding: 15
  },

  selectedBatchLabel: {
    color: MUTED,
    fontSize: 12
  },

  selectedBatchName: {
    color: GREEN,
    fontSize: 17,
    fontWeight: "bold",
    marginTop: 4
  },

  batchList: {
    gap: 10
  },

  batchOption: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: INPUT_BORDER,
    backgroundColor: INPUT_BG
  },

  batchOptionSelected: {
    borderColor: GREEN,
    borderWidth: 2,
    backgroundColor: WHITE
  },

  batchOptionText: {
    flex: 1
  },

  batchName: {
    color: LABEL,
    fontSize: 15,
    fontWeight: "700"
  },

  batchNameSelected: {
    color: GREEN
  },

  batchMeta: {
    color: MUTED,
    fontSize: 12,
    marginTop: 4
  },

  emptyCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: INPUT_BORDER
  },

  /* CATEGORY */
  categories: {
    flexDirection: "row",
    gap: 10
  },

  categoryButton: {
    flex: 1,
    height: 48,
    borderWidth: 1,
    borderColor: INPUT_BORDER,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: INPUT_BG
  },

  categorySelected: {
    borderColor: GREEN,
    borderWidth: 2,
    backgroundColor: WHITE
  },

  categoryText: {
    color: MUTED,
    fontSize: 13,
    fontWeight: "700"
  },

  categoryTextSelected: {
    color: GREEN
  },

  /* TOTAL */
  totalBox: {
    backgroundColor: INPUT_BG,
    borderWidth: 1,
    borderColor: INPUT_BORDER,
    borderRadius: 14,
    padding: 18,
    marginTop: 24,
    alignItems: "center"
  },

  totalLabel: {
    color: LABEL,
    fontSize: 14,
    fontWeight: "700"
  },

  total: {
    color: GREEN,
    fontSize: 30,
    fontWeight: "bold",
    marginTop: 8
  },

  totalHint: {
    color: MUTED,
    fontSize: 12,
    marginTop: 6
  },

  /* BUTTONS */
  button: {
    height: 54,
    backgroundColor: GOLD,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 22,
    borderBottomWidth: 3,
    borderBottomColor: GOLD
  },

  disabledButton: {
    opacity: 0.6
  },

  buttonText: {
    color: WHITE,
    fontSize: 16,
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
    marginTop: 12
  },

  secondaryButtonText: {
    color: GREEN,
    fontSize: 15,
    fontWeight: "bold"
  },

  footer: {
    textAlign: "center",
    color: FOOTER,
    fontSize: 12,
    marginTop: 26
  }
});