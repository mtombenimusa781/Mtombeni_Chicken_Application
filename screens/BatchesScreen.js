import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Modal
} from "react-native";
import {
  addDoc,
  collection,
  onSnapshot,
  query,
  orderBy,
  serverTimestamp,
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
const FOOTER = "#9A9A8E";
const SOFT_GREEN = "#E4F1E5";
const PLACEHOLDER = "#888888";

const money = value =>
  "R " +
  Number(value || 0).toLocaleString("en-ZA", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });

export default function BatchesScreen({ navigation }) {
  const { t } = useLanguage();

  const [batchName, setBatchName] = useState("");
  const [initialChickens, setInitialChickens] = useState("");
  const [pricePerChicken, setPricePerChicken] = useState("");
  const [saving, setSaving] = useState(false);
  const [batches, setBatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState(null);
  const [roleLoading, setRoleLoading] = useState(true);

  const [editingBatch, setEditingBatch] = useState(null);
  const [editName, setEditName] = useState("");
  const [editCount, setEditCount] = useState("");
  const [editPrice, setEditPrice] = useState("");
  const [updating, setUpdating] = useState(false);

  const chickenCount = Number(initialChickens);
  const chickenPrice = Number(pricePerChicken);
  const totalCost =
    Number.isInteger(chickenCount) &&
    chickenCount > 0 &&
    Number.isFinite(chickenPrice) &&
    chickenPrice > 0
      ? chickenCount * chickenPrice
      : 0;

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
        if (active) setRoleLoading(false);
        return;
      }

      try {
        const snap = await getDoc(doc(db, "users", user.uid));

        if (active && snap.exists()) {
          setUserRole(snap.data().role || null);
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
    if (!auth.currentUser) {
      setLoading(false);
      return;
    }

    const batchesQuery = query(
      collection(db, "batches"),
      orderBy("createdAt", "desc")
    );

    const unsubscribe = onSnapshot(
      batchesQuery,
      snapshot => {
        setBatches(
          snapshot.docs.map(item => ({
            id: item.id,
            ...item.data()
          }))
        );
        setLoading(false);
      },
      error => {
        console.log("Batch loading error:", error.code, error.message);
        setLoading(false);

        Alert.alert(t("couldNotLoadBatches"), t("checkConnectionRules"));
      }
    );

    return unsubscribe;
  }, []);

  const createBatch = async () => {
    const user = auth.currentUser;
    const count = Number(initialChickens);
    const price = Number(pricePerChicken);
    const name = batchName.trim();

    if (!user) {
      return Alert.alert(t("loginRequired"), t("pleaseLoginFirst"));
    }

    if (userRole !== "admin") {
      return Alert.alert(t("adminAccessRequired"), t("onlyAdminCreate"));
    }

    if (!name) {
      return Alert.alert(t("batchNameRequired"), t("enterBatchName"));
    }

    if (!Number.isInteger(count) || count <= 0) {
      return Alert.alert(t("invalidQuantity"), t("wholeNumberMsg"));
    }

    if (!Number.isFinite(price) || price <= 0) {
      return Alert.alert(t("invalidPurchasePrice"), t("priceGreaterZero"));
    }

    setSaving(true);

    try {
      const created = await addDoc(collection(db, "batches"), {
        batchName: name,
        initialChickens: count,
        pricePerChicken: price,
        totalPurchaseCost: count * price,
        status: "active",
        createdBy: user.uid,
        staffEmail: user.email || "",
        createdAt: serverTimestamp()
      });

      setBatchName("");
      setInitialChickens("");
      setPricePerChicken("");

      Alert.alert(
        t("batchCreated"),
        `${name}\n${t("startingChickens")}: ${count}\n${t("purchaseCost")}: ${money(
          count * price
        )}`,
        [
          {
            text: t("viewBatch"),
            onPress: () =>
              navigation.navigate("BatchDetails", {
                batchId: created.id,
                batchName: name
              })
          },
          { text: t("done"), style: "cancel" }
        ]
      );
    } catch (error) {
      console.log("Batch creation error:", error.code, error.message);

      Alert.alert(t("couldNotCreateBatch"), t("checkConnectionRules"));
    } finally {
      setSaving(false);
    }
  };

  const showBatchMenu = batch => {
    Alert.alert(batch.batchName || t("batchOptions"), t("chooseAction"), [
      {
        text: t("edit"),
        onPress: () => {
          setEditingBatch(batch);
          setEditName(batch.batchName || "");
          setEditCount(String(batch.initialChickens ?? ""));
          setEditPrice(String(batch.pricePerChicken ?? ""));
        }
      },
      {
        text: t("delete"),
        style: "destructive",
        onPress: () => confirmDeleteBatch(batch)
      },
      { text: t("cancel"), style: "cancel" }
    ]);
  };

  const confirmDeleteBatch = batch => {
    Alert.alert(
      t("deleteBatchQ"),
      t("deleteBatchMsg").replace("{name}", batch.batchName || t("thisBatch")),
      [
        { text: t("cancel"), style: "cancel" },
        {
          text: t("delete"),
          style: "destructive",
          onPress: async () => {
            try {
              await deleteDoc(doc(db, "batches", batch.id));

              Alert.alert(t("batchDeleted"), t("batchDeletedMsg"));
            } catch (error) {
              console.log("Batch delete error:", error.code, error.message);

              Alert.alert(t("couldNotDeleteBatch"), t("deleteBatchRules"));
            }
          }
        }
      ]
    );
  };

  const saveBatchEdit = async () => {
    const count = Number(editCount);
    const price = Number(editPrice);

    if (!editName.trim()) {
      return Alert.alert(t("batchNameRequired"), t("enterBatchName"));
    }

    if (!Number.isInteger(count) || count <= 0) {
      return Alert.alert(t("invalidQuantity"), t("wholeNumberMsg"));
    }

    if (!Number.isFinite(price) || price <= 0) {
      return Alert.alert(t("invalidPrice"), t("priceGreaterZero"));
    }

    setUpdating(true);

    try {
      await updateDoc(doc(db, "batches", editingBatch.id), {
        batchName: editName.trim(),
        initialChickens: count,
        pricePerChicken: price,
        totalPurchaseCost: count * price
      });

      setEditingBatch(null);

      Alert.alert(t("batchUpdated"), t("batchUpdatedMsg"));
    } catch (error) {
      console.log("Batch update error:", error.code, error.message);

      Alert.alert(t("couldNotUpdateBatch"), t("updateBatchRules"));
    } finally {
      setUpdating(false);
    }
  };

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.container}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      {/* HEADER */}
      <View style={styles.headerCard}>
        <Text style={styles.logo}>🐔</Text>
        <Text style={styles.heading}>{t("manageBatches")}</Text>
        <Text style={styles.subtitle}>{t("manageBatchesSub")}</Text>
      </View>

      {roleLoading ? (
        <View style={styles.emptyCard}>
          <ActivityIndicator color={GREEN} />
          <Text style={styles.emptyText}>{t("checkingPermissions")}</Text>
        </View>
      ) : userRole === "admin" ? (
        <View style={styles.formCard}>
          <Text style={styles.sectionTitle}>{t("createNewBatch")}</Text>

          <Text style={styles.label}>{t("batchNameLabel")}</Text>
          <TextInput
            style={styles.input}
            value={batchName}
            onChangeText={setBatchName}
            placeholder={t("batchNamePlaceholder")}
            placeholderTextColor={PLACEHOLDER}
            autoCapitalize="words"
            editable={!saving}
          />

          <Text style={styles.label}>{t("numChickensLabel")}</Text>
          <TextInput
            style={styles.input}
            value={initialChickens}
            onChangeText={text =>
              setInitialChickens(text.replace(/[^0-9]/g, ""))
            }
            placeholder={t("numChickensPlaceholder")}
            placeholderTextColor={PLACEHOLDER}
            keyboardType="number-pad"
            editable={!saving}
          />

          <Text style={styles.label}>{t("pricePerChickenLabel")}</Text>
          <TextInput
            style={styles.input}
            value={pricePerChicken}
            onChangeText={text => {
              const cleaned = text.replace(/[^0-9.]/g, "");
              const parts = cleaned.split(".");

              setPricePerChicken(
                parts.length > 2
                  ? parts[0] + "." + parts.slice(1).join("")
                  : cleaned
              );
            }}
            placeholder={t("pricePlaceholder")}
            placeholderTextColor={PLACEHOLDER}
            keyboardType="decimal-pad"
            editable={!saving}
          />

          <View style={styles.costCard}>
            <Text style={styles.costLabel}>{t("totalPurchaseCost")}</Text>
            <Text style={styles.costValue}>{money(totalCost)}</Text>
            <Text style={styles.costHint}>
              {totalCost > 0
                ? `${chickenCount} ${t("chickens")} × ${money(chickenPrice)}`
                : t("costHintEmpty")}
            </Text>
          </View>

          <TouchableOpacity
            style={[styles.button, saving && styles.disabledButton]}
            onPress={createBatch}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator color={WHITE} />
            ) : (
              <Text style={styles.buttonText}>{t("createBatch")}</Text>
            )}
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyTitle}>{t("batchAccess")}</Text>
          <Text style={styles.emptyText}>{t("batchAccessMsg")}</Text>
        </View>
      )}

      <View style={styles.listHeader}>
        <Text style={styles.listTitle}>{t("yourBatches")}</Text>
        <Text style={styles.batchCount}>
          {batches.length} {t("recorded")}
        </Text>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color={GREEN} style={styles.loader} />
      ) : batches.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyTitle}>{t("noBatchesYet")}</Text>
          <Text style={styles.emptyText}>{t("createFirstBatch")}</Text>
        </View>
      ) : (
        batches.map(batch => (
          <View key={batch.id} style={styles.batchCard}>
            <View style={styles.batchTop}>
              <TouchableOpacity
                style={styles.batchTitleArea}
                activeOpacity={0.8}
                onPress={() =>
                  navigation.navigate("BatchDetails", {
                    batchId: batch.id,
                    batchName: batch.batchName
                  })
                }
              >
                <Text style={styles.batchName}>{batch.batchName}</Text>

                <Text
                  style={[
                    styles.status,
                    batch.status === "closed"
                      ? styles.closedStatus
                      : styles.activeStatus
                  ]}
                >
                  {statusLabel(batch.status)}
                </Text>
              </TouchableOpacity>

              {userRole === "admin" && (
                <TouchableOpacity
                  style={styles.menuButton}
                  onPress={() => showBatchMenu(batch)}
                  accessibilityLabel={`${t("optionsFor")} ${batch.batchName}`}
                >
                  <Text style={styles.menuDots}>⋮</Text>
                </TouchableOpacity>
              )}
            </View>

            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() =>
                navigation.navigate("BatchDetails", {
                  batchId: batch.id,
                  batchName: batch.batchName
                })
              }
            >
              <View style={styles.batchRow}>
                <Text style={styles.batchLabel}>{t("startingChickens")}</Text>
                <Text style={styles.batchValue}>{batch.initialChickens}</Text>
              </View>

              <View style={styles.batchRow}>
                <Text style={styles.batchLabel}>{t("pricePerChicken")}</Text>
                <Text style={styles.batchValue}>
                  {money(batch.pricePerChicken)}
                </Text>
              </View>

              <View style={styles.batchRow}>
                <Text style={styles.batchLabel}>{t("purchaseCost")}</Text>
                <Text style={styles.batchCost}>
                  {money(batch.totalPurchaseCost)}
                </Text>
              </View>

              <Text style={styles.viewDetails}>{t("tapToView")}</Text>
            </TouchableOpacity>
          </View>
        ))
      )}

      <Text style={styles.footer}>{t("batchFooter")}</Text>

      {/* EDIT MODAL */}
      <Modal
        visible={!!editingBatch}
        transparent
        animationType="fade"
        onRequestClose={() => setEditingBatch(null)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>{t("editBatch")}</Text>

            <Text style={styles.label}>{t("batchNameShort")}</Text>
            <TextInput
              style={styles.input}
              value={editName}
              onChangeText={setEditName}
              placeholder={t("batchNameShort")}
              placeholderTextColor={PLACEHOLDER}
            />

            <Text style={styles.label}>{t("startingChickens")}</Text>
            <TextInput
              style={styles.input}
              value={editCount}
              onChangeText={text => setEditCount(text.replace(/[^0-9]/g, ""))}
              keyboardType="number-pad"
            />

            <Text style={styles.label}>{t("purchasePriceLabel")}</Text>
            <TextInput
              style={styles.input}
              value={editPrice}
              onChangeText={setEditPrice}
              keyboardType="decimal-pad"
            />

            <Text style={styles.modalHint}>{t("recalcHint")}</Text>

            <TouchableOpacity
              style={[styles.button, updating && styles.disabledButton]}
              onPress={saveBatchEdit}
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
              onPress={() => setEditingBatch(null)}
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

  /* HEADER */
  headerCard: {
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

  /* FORM */
  formCard: {
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

  sectionTitle: {
    color: GREEN,
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 4
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

  costCard: {
    backgroundColor: INPUT_BG,
    borderWidth: 1,
    borderColor: INPUT_BORDER,
    borderRadius: 14,
    padding: 18,
    marginTop: 24,
    alignItems: "center"
  },

  costLabel: {
    color: LABEL,
    fontSize: 14,
    fontWeight: "700"
  },

  costValue: {
    color: GREEN,
    fontSize: 29,
    fontWeight: "bold",
    marginTop: 8
  },

  costHint: {
    color: MUTED,
    fontSize: 12,
    marginTop: 6,
    textAlign: "center"
  },

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

  /* LIST */
  listHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 28,
    marginBottom: 14
  },

  listTitle: {
    color: GREEN,
    fontSize: 20,
    fontWeight: "bold"
  },

  batchCount: {
    color: GOLD,
    fontSize: 13,
    fontWeight: "700"
  },

  loader: {
    marginTop: 25
  },

  emptyCard: {
    backgroundColor: WHITE,
    padding: 22,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: BORDER,
    alignItems: "center"
  },

  emptyTitle: {
    color: GREEN,
    fontSize: 16,
    fontWeight: "bold"
  },

  emptyText: {
    color: MUTED,
    fontSize: 13,
    textAlign: "center",
    marginTop: 8,
    lineHeight: 19
  },

  batchCard: {
    backgroundColor: WHITE,
    padding: 18,
    borderRadius: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: BORDER,
    elevation: 3,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6
  },

  batchTop: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8
  },

  batchTitleArea: {
    flex: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center"
  },

  batchName: {
    color: GREEN,
    fontSize: 17,
    fontWeight: "bold",
    flex: 1
  },

  status: {
    fontSize: 11,
    fontWeight: "bold",
    textTransform: "capitalize",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    overflow: "hidden"
  },

  activeStatus: {
    backgroundColor: SOFT_GREEN,
    color: GREEN
  },

  closedStatus: {
    backgroundColor: "#EEEEEE",
    color: "#555555"
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

  batchRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 9
  },

  batchLabel: {
    color: MUTED,
    fontSize: 13,
    flex: 1,
    paddingRight: 10
  },

  batchValue: {
    color: "#26372B",
    fontSize: 13,
    fontWeight: "600"
  },

  batchCost: {
    color: GOLD,
    fontSize: 14,
    fontWeight: "bold"
  },

  viewDetails: {
    color: GREEN,
    fontSize: 13,
    fontWeight: "700",
    marginTop: 16
  },

  footer: {
    textAlign: "center",
    color: FOOTER,
    fontSize: 12,
    marginTop: 20,
    lineHeight: 18
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

  modalHint: {
    color: MUTED,
    fontSize: 12,
    marginTop: 14,
    lineHeight: 18
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