import React, { useEffect, useState } from "react";
import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
  StyleSheet, Alert, ActivityIndicator, Modal
} from "react-native";
import {
  addDoc, collection, onSnapshot, query, orderBy, serverTimestamp,
  doc, getDoc, updateDoc, deleteDoc
} from "firebase/firestore";
import { auth, db } from "../Config/firebase";

const GREEN = "#245C38";
const CREAM = "#F4F1E8";
const LIGHT_GREEN = "#E4F1E5";
const BROWN = "#8B5E3C";
const RED = "#B42318";

const money = value =>
  "R " + Number(value || 0).toLocaleString("en-ZA", {
    minimumFractionDigits: 2, maximumFractionDigits: 2
  });

export default function BatchesScreen({ navigation }) {
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
    Number.isInteger(chickenCount) && chickenCount > 0 &&
    Number.isFinite(chickenPrice) && chickenPrice > 0
      ? chickenCount * chickenPrice : 0;

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
          Alert.alert("Account error", "Could not verify your account role.");
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

        Alert.alert(
          "Could not load batches",
          "Check your internet connection and Firestore security rules."
        );
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
      return Alert.alert("Login required", "Please log in first.");
    }

    if (userRole !== "admin") {
      return Alert.alert(
        "Admin access required",
        "Only the admin can create batches."
      );
    }

    if (!name) {
      return Alert.alert("Batch name required", "Enter a name for this batch.");
    }

    if (!Number.isInteger(count) || count <= 0) {
      return Alert.alert(
        "Invalid quantity",
        "Enter a whole number greater than zero."
      );
    }

    if (!Number.isFinite(price) || price <= 0) {
      return Alert.alert(
        "Invalid purchase price",
        "Enter a price greater than zero."
      );
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
        "Batch created",
        `${name}\nStarting chickens: ${count}\nPurchase cost: ${money(count * price)}`,
        [
          {
            text: "View Batch",
            onPress: () =>
              navigation.navigate("BatchDetails", {
                batchId: created.id,
                batchName: name
              })
          },
          { text: "Done", style: "cancel" }
        ]
      );
    } catch (error) {
      console.log("Batch creation error:", error.code, error.message);

      Alert.alert(
        "Could not create batch",
        "Check your internet connection and Firestore security rules."
      );
    } finally {
      setSaving(false);
    }
  };

  const showBatchMenu = batch => {
    Alert.alert(
      batch.batchName || "Batch options",
      "Choose an action",
      [
        {
          text: "Edit",
          onPress: () => {
            setEditingBatch(batch);
            setEditName(batch.batchName || "");
            setEditCount(String(batch.initialChickens ?? ""));
            setEditPrice(String(batch.pricePerChicken ?? ""));
          }
        },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => confirmDeleteBatch(batch)
        },
        { text: "Cancel", style: "cancel" }
      ]
    );
  };

  const confirmDeleteBatch = batch => {
    Alert.alert(
      "Delete batch?",
      `Delete ${batch.batchName || "this batch"}? This removes only the batch document. Its sales, deaths and expenses will remain in Firestore and may no longer appear under a batch.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteDoc(doc(db, "batches", batch.id));

              Alert.alert("Batch deleted", "The batch has been deleted.");
            } catch (error) {
              console.log("Batch delete error:", error.code, error.message);

              Alert.alert(
                "Could not delete batch",
                "Check your Firestore rules. Only an admin can delete batches."
              );
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
      return Alert.alert("Batch name required", "Enter a batch name.");
    }

    if (!Number.isInteger(count) || count <= 0) {
      return Alert.alert(
        "Invalid quantity",
        "Enter a whole number greater than zero."
      );
    }

    if (!Number.isFinite(price) || price <= 0) {
      return Alert.alert("Invalid price", "Enter a price greater than zero.");
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

      Alert.alert(
        "Batch updated",
        "The batch information has been updated."
      );
    } catch (error) {
      console.log("Batch update error:", error.code, error.message);

      Alert.alert(
        "Could not update batch",
        "Check that your Firestore rules allow admins to update batches."
      );
    } finally {
      setUpdating(false);
    }
  };

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.container}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.headerCard}>
        <Text style={styles.brand}>🐔 Mtombeni Chicken Business</Text>
        <Text style={styles.heading}>Manage Chicken Batches</Text>
        <Text style={styles.subtitle}>
          Keep each new group of chickens separate.
        </Text>
      </View>

      {roleLoading ? (
        <View style={styles.emptyCard}>
          <ActivityIndicator color={GREEN} />
          <Text style={styles.emptyText}>
            Checking account permissions...
          </Text>
        </View>
      ) : userRole === "admin" ? (
        <View style={styles.formCard}>
          <Text style={styles.sectionTitle}>Create New Batch</Text>

          <Text style={styles.label}>Batch name *</Text>
          <TextInput
            style={styles.input}
            value={batchName}
            onChangeText={setBatchName}
            placeholder="e.g. Batch 001"
            placeholderTextColor="#89958B"
            autoCapitalize="words"
            editable={!saving}
          />

          <Text style={styles.label}>Number of chickens *</Text>
          <TextInput
            style={styles.input}
            value={initialChickens}
            onChangeText={t =>
              setInitialChickens(t.replace(/[^0-9]/g, ""))
            }
            placeholder="e.g. 100"
            placeholderTextColor="#89958B"
            keyboardType="number-pad"
            editable={!saving}
          />

          <Text style={styles.label}>Purchase price per chicken (R) *</Text>
          <TextInput
            style={styles.input}
            value={pricePerChicken}
            onChangeText={t => {
              const cleaned = t.replace(/[^0-9.]/g, "");
              const parts = cleaned.split(".");

              setPricePerChicken(
                parts.length > 2
                  ? parts[0] + "." + parts.slice(1).join("")
                  : cleaned
              );
            }}
            placeholder="e.g. 35.00"
            placeholderTextColor="#89958B"
            keyboardType="decimal-pad"
            editable={!saving}
          />

          <View style={styles.costCard}>
            <Text style={styles.costLabel}>Total Purchase Cost</Text>
            <Text style={styles.costValue}>{money(totalCost)}</Text>
            <Text style={styles.costHint}>
              {totalCost > 0
                ? `${chickenCount} chickens × ${money(chickenPrice)}`
                : "Enter the quantity and price to calculate the cost."}
            </Text>
          </View>

          <TouchableOpacity
            style={[styles.button, saving && styles.disabledButton]}
            onPress={createBatch}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.buttonText}>Create Batch</Text>
            )}
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyTitle}>Batch access</Text>
          <Text style={styles.emptyText}>
            You can open batches and view their records. Only the admin can
            create new batches.
          </Text>
        </View>
      )}

      <View style={styles.listHeader}>
        <Text style={styles.listTitle}>Your Batches</Text>
        <Text style={styles.batchCount}>{batches.length} recorded</Text>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color={GREEN} style={styles.loader} />
      ) : batches.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyTitle}>No batches yet</Text>
          <Text style={styles.emptyText}>
            Create your first batch using the form above.
          </Text>
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
                    batch.status === "active"
                      ? styles.activeStatus
                      : styles.closedStatus
                  ]}
                >
                  {batch.status || "active"}
                </Text>
              </TouchableOpacity>

              {userRole === "admin" && (
                <TouchableOpacity
                  style={styles.menuButton}
                  onPress={() => showBatchMenu(batch)}
                  accessibilityLabel={`Options for ${batch.batchName}`}
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
                <Text style={styles.batchLabel}>Starting chickens</Text>
                <Text style={styles.batchValue}>
                  {batch.initialChickens}
                </Text>
              </View>

              <View style={styles.batchRow}>
                <Text style={styles.batchLabel}>Price per chicken</Text>
                <Text style={styles.batchValue}>
                  {money(batch.pricePerChicken)}
                </Text>
              </View>

              <View style={styles.batchRow}>
                <Text style={styles.batchLabel}>Purchase cost</Text>
                <Text style={styles.batchCost}>
                  {money(batch.totalPurchaseCost)}
                </Text>
              </View>

              <Text style={styles.viewDetails}>
                Tap to view batch details →
              </Text>
            </TouchableOpacity>
          </View>
        ))
      )}

      <Text style={styles.footer}>
        Each batch keeps its own purchase cost and stock history.
      </Text>

      <Modal
        visible={!!editingBatch}
        transparent
        animationType="fade"
        onRequestClose={() => setEditingBatch(null)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Edit Batch</Text>

            <Text style={styles.label}>Batch name</Text>
            <TextInput
              style={styles.input}
              value={editName}
              onChangeText={setEditName}
              placeholder="Batch name"
              placeholderTextColor="#89958B"
            />

            <Text style={styles.label}>Starting chickens</Text>
            <TextInput
              style={styles.input}
              value={editCount}
              onChangeText={t =>
                setEditCount(t.replace(/[^0-9]/g, ""))
              }
              keyboardType="number-pad"
            />

            <Text style={styles.label}>Purchase price per chicken (R)</Text>
            <TextInput
              style={styles.input}
              value={editPrice}
              onChangeText={setEditPrice}
              keyboardType="decimal-pad"
            />

            <Text style={styles.modalHint}>
              The total purchase cost will be recalculated automatically.
            </Text>

            <TouchableOpacity
              style={styles.button}
              onPress={saveBatchEdit}
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
              onPress={() => setEditingBatch(null)}
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
  headerCard: {
    backgroundColor: GREEN,
    padding: 22,
    borderRadius: 16,
    marginBottom: 20
  },
  brand: {
    color: "#FFFFFF",
    fontSize: 20,
    fontWeight: "bold"
  },
  heading: {
    color: "#FFFFFF",
    fontSize: 22,
    fontWeight: "bold",
    marginTop: 20
  },
  subtitle: {
    color: "#E1EDE3",
    fontSize: 14,
    marginTop: 7
  },
  formCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: "#E8E2D5",
    elevation: 2
  },
  sectionTitle: {
    color: GREEN,
    fontSize: 19,
    fontWeight: "bold",
    marginBottom: 8
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
  costCard: {
    backgroundColor: LIGHT_GREEN,
    borderRadius: 12,
    padding: 18,
    marginTop: 24,
    alignItems: "center"
  },
  costLabel: {
    color: GREEN,
    fontSize: 14,
    fontWeight: "600"
  },
  costValue: {
    color: GREEN,
    fontSize: 29,
    fontWeight: "bold",
    marginTop: 8
  },
  costHint: {
    color: "#47564B",
    fontSize: 12,
    marginTop: 6,
    textAlign: "center"
  },
  button: {
    backgroundColor: GREEN,
    padding: 16,
    borderRadius: 10,
    alignItems: "center",
    marginTop: 20
  },
  disabledButton: {
    opacity: 0.65
  },
  buttonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "bold"
  },
  listHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 26,
    marginBottom: 12
  },
  listTitle: {
    color: GREEN,
    fontSize: 20,
    fontWeight: "bold"
  },
  batchCount: {
    color: BROWN,
    fontSize: 13
  },
  loader: {
    marginTop: 25
  },
  emptyCard: {
    backgroundColor: "#FFFFFF",
    padding: 22,
    borderRadius: 12,
    alignItems: "center"
  },
  emptyTitle: {
    color: GREEN,
    fontSize: 16,
    fontWeight: "bold"
  },
  emptyText: {
    color: "#66736A",
    fontSize: 13,
    textAlign: "center",
    marginTop: 8,
    lineHeight: 19
  },
  batchCard: {
    backgroundColor: "#FFFFFF",
    padding: 17,
    borderRadius: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#E8E2D5",
    elevation: 1
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
    backgroundColor: LIGHT_GREEN,
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
  batchRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 9
  },
  batchLabel: {
    color: "#66736A",
    fontSize: 13
  },
  batchValue: {
    color: "#26372B",
    fontSize: 13,
    fontWeight: "600"
  },
  batchCost: {
    color: GREEN,
    fontSize: 14,
    fontWeight: "bold"
  },
  viewDetails: {
    color: GREEN,
    fontSize: 13,
    fontWeight: "600",
    marginTop: 16
  },
  footer: {
    textAlign: "center",
    color: "#66736A",
    fontSize: 12,
    marginTop: 18,
    lineHeight: 18
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
  modalHint: {
    color: BROWN,
    fontSize: 12,
    marginTop: 12
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