
import React, { useEffect, useState } from "react";
import {View,Text,TextInput,TouchableOpacity,StyleSheet,Alert,ScrollView,ActivityIndicator} from "react-native";
import {addDoc,collection,onSnapshot,query,orderBy,serverTimestamp,doc,getDoc} from "firebase/firestore";
import { auth, db } from "../Config/firebase";

const GREEN = "#245C38";
const LIGHT_GREEN = "#F4F8F2";
const categories = ["Feed", "Medicine", "Other"];

const money = amount =>
  "R " + Number(amount || 0).toLocaleString("en-ZA", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });

export default function AddExpenseScreen({ navigation, route }) {
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
    Number.isFinite(qty) && qty > 0 &&
    Number.isFinite(cost) && cost > 0
      ? qty * cost
      : 0;

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
        Alert.alert("Batch error", "Could not load the available batches.");
      }
    );

    return unsubscribe;
  }, [selectedBatchId]);

  const chooseBatch = batch => {
    setSelectedBatchId(batch.id);
    setSelectedBatchName(batch.batchName || "Unnamed batch");
  };

  
const saveExpense = async () => {
  const user = auth.currentUser;
  const parsedQuantity = Number(quantity);
  const parsedCost = Number(unitCost);

  if (!user) {
    Alert.alert("Not signed in", "Please log in again.");
    return;
  }

  if (userRole !== "staff") {
    Alert.alert(
      "Staff access required",
      "Only staff accounts can record business expenses."
    );
    return;
  }

  if (!selectedBatchId) {
    Alert.alert("Select a batch", "Choose the batch this expense belongs to.");
    return;
  }

  const batch = batches.find(item => item.id === selectedBatchId);

  if (!batch) {
    Alert.alert("Batch unavailable", "Please select an existing batch.");
    return;
  }

  if (!description.trim()) {
    Alert.alert("Missing description", "Enter a description for the expense.");
    return;
  }

  if (
    quantity.trim() === "" ||
    !Number.isFinite(parsedQuantity) ||
    parsedQuantity <= 0
  ) {
    Alert.alert("Invalid quantity", "Enter a quantity greater than zero.");
    return;
  }

  if (
    unitCost.trim() === "" ||
    !Number.isFinite(parsedCost) ||
    parsedCost <= 0
  ) {
    Alert.alert("Invalid unit cost", "Enter a unit cost greater than zero.");
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
      activitySaved ? "Success" : "Expense saved",
      activitySaved
        ? "Expense saved and staff activity recorded."
        : "Expense saved, but staff activity could not be recorded. Check your Firestore rules."
    );
  } catch (error) {
    console.log("Expense save error:", error.code, error.message);

    Alert.alert(
      "Could not save expense",
      error.code === "permission-denied"
        ? "Firebase rules did not allow this expense. Check your Firestore rules."
        : error.message || "Please try again."
    );
  } finally {
    setLoading(false);
  }
};


  if (roleLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={GREEN} />
        <Text style={styles.helperText}>Checking account permissions...</Text>
      </View>
    );
  }

  if (userRole !== "staff") {
    return (
      <View style={styles.centered}>
        <Text style={styles.title}>Record Business Expense</Text>
        <Text style={styles.helperText}>
          Only staff accounts can record business expenses. Please sign in with
          a staff account.
        </Text>
        <TouchableOpacity
          style={styles.secondary}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.secondaryText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.container}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.header}>
        <Text style={styles.brand}>🐔 ChickenBiz Manager</Text>
        <Text style={styles.title}>Record Business Expense</Text>
        <Text style={styles.headerSubtitle}>
          Save expenses against the correct chicken batch.
        </Text>
      </View>

      <Text style={styles.label}>Select chicken batch *</Text>

      {routeBatchId ? (
        <View style={styles.selectedBatch}>
          <Text style={styles.selectedBatchLabel}>Selected batch</Text>
          <Text style={styles.selectedBatchName}>
            {selectedBatchName || routeBatchName || "Loading batch..."}
          </Text>
        </View>
      ) : batchesLoading ? (
        <ActivityIndicator color={GREEN} style={styles.batchLoader} />
      ) : batches.length === 0 ? (
        <View style={styles.notice}>
          <Text style={styles.helperText}>
            No batches are available. Ask the admin to create a chicken batch
            first.
          </Text>
        </View>
      ) : (
        <View style={styles.batchList}>
          {batches.map(batch => (
            <TouchableOpacity
              key={batch.id}
              style={[
                styles.batchOption,
                selectedBatchId === batch.id && styles.batchOptionSelected
              ]}
              onPress={() => chooseBatch(batch)}
              disabled={loading}
            >
              <View style={styles.batchOptionText}>
                <Text
                  style={[
                    styles.batchName,
                    selectedBatchId === batch.id && styles.selectedText
                  ]}
                >
                  {batch.batchName || "Unnamed batch"}
                </Text>
                <Text
                  style={[
                    styles.batchMeta,
                    selectedBatchId === batch.id && styles.selectedText
                  ]}
                >
                  Starting chickens: {batch.initialChickens || 0}
                </Text>
              </View>

              <Text
                style={[
                  styles.radio,
                  selectedBatchId === batch.id && styles.selectedText
                ]}
              >
                {selectedBatchId === batch.id ? "✓" : "○"}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      <Text style={styles.label}>Expense category *</Text>

      <View style={styles.categories}>
        {categories.map(item => (
          <TouchableOpacity
            key={item}
            style={[
              styles.categoryButton,
              category === item && styles.categorySelected
            ]}
            onPress={() => setCategory(item)}
            disabled={loading}
          >
            <Text
              style={[
                styles.categoryText,
                category === item && styles.selectedText
              ]}
            >
              {item}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.label}>Description *</Text>
      <TextInput
        style={styles.input}
        value={description}
        onChangeText={setDescription}
        placeholder="e.g. 50 kg chicken feed"
        placeholderTextColor="#89958B"
        editable={!loading}
      />

      <Text style={styles.label}>Quantity purchased *</Text>
      <TextInput
        style={styles.input}
        value={quantity}
        onChangeText={text => {
          const cleaned = text.replace(/[^0-9.]/g, "");
          const parts = cleaned.split(".");
          setQuantity(
            parts.length > 2
              ? parts[0] + "." + parts.slice(1).join("")
              : cleaned
          );
        }}
        keyboardType="decimal-pad"
        placeholder="e.g. 2"
        placeholderTextColor="#89958B"
        editable={!loading}
      />

      <Text style={styles.label}>Cost per item/unit (R) *</Text>
      <TextInput
        style={styles.input}
        value={unitCost}
        onChangeText={text => {
          const cleaned = text.replace(/[^0-9.]/g, "");
          const parts = cleaned.split(".");
          setUnitCost(
            parts.length > 2
              ? parts[0] + "." + parts.slice(1).join("")
              : cleaned
          );
        }}
        keyboardType="decimal-pad"
        placeholder="e.g. 350.00"
        placeholderTextColor="#89958B"
        editable={!loading}
      />

      <View style={styles.totalBox}>
        <Text style={styles.totalLabel}>Total expense</Text>
        <Text style={styles.total}>{money(total)}</Text>
        <Text style={styles.totalHint}>
          {quantity || "0"} × {money(cost)}
        </Text>
      </View>

      <TouchableOpacity
        style={[
          styles.button,
          (loading || batchesLoading || !selectedBatchId) &&
            styles.disabledButton
        ]}
        onPress={saveExpense}
        disabled={loading || batchesLoading || !selectedBatchId}
      >
        {loading ? (
          <ActivityIndicator color="#FFFFFF" />
        ) : (
          <Text style={styles.buttonText}>Save Expense</Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.secondary}
        onPress={() => navigation.goBack()}
        disabled={loading}
      >
        <Text style={styles.secondaryText}>Go Back</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}
const FARM_BG = "#FFF8E7";      // Eggshell
const CHICK_YELLOW = "#FFD54F"; // Chick yellow
const EGG_GOLD = "#F4B400";     // Egg yolk
const ROOSTER_RED = "#C44536";  // Rooster comb
const FEED_BROWN = "#8B5E3C";   // Feed/wheat
const SOFT_BEIGE = "#FDF3D7";   // Light cream
const BORDER = "#E6C98A";       // Golden border

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: FARM_BG,
  },

  container: {
    padding: 20,
    paddingBottom: 35,
  },

  centered: {
    flex: 1,
    backgroundColor: FARM_BG,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },

  header: {
    backgroundColor: EGG_GOLD,
    padding: 20,
    borderRadius: 15,
    marginBottom: 24,
    elevation: 4,
  },

  brand: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "bold",
  },

  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: FEED_BROWN,
    marginBottom: 18,
  },

  headerSubtitle: {
    color: "#FFF8E7",
    fontSize: 13,
    marginTop: 8,
  },

  label: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 8,
    marginTop: 8,
    color: FEED_BROWN,
  },

  input: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 12,
    padding: 14,
    marginBottom: 18,
    color: "#333333",
  },

  categories: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 18,
  },

  categoryButton: {
    flex: 1,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: EGG_GOLD,
    alignItems: "center",
    backgroundColor: "#FFFFFF",
  },

  categorySelected: {
    backgroundColor: EGG_GOLD,
  },

  categoryText: {
    color: FEED_BROWN,
    fontWeight: "700",
  },

  selectedText: {
    color: "#FFFFFF",
  },

  selectedBatch: {
    backgroundColor: SOFT_BEIGE,
    borderRadius: 12,
    padding: 15,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: BORDER,
  },

  selectedBatchLabel: {
    color: "#7A6A58",
    fontSize: 12,
  },

  selectedBatchName: {
    color: FEED_BROWN,
    fontSize: 17,
    fontWeight: "bold",
    marginTop: 5,
  },

  batchList: {
    marginBottom: 18,
  },

  batchOption: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: BORDER,
    marginBottom: 8,
  },

  batchOptionSelected: {
    backgroundColor: CHICK_YELLOW,
    borderColor: EGG_GOLD,
  },

  batchOptionText: {
    flex: 1,
  },

  batchName: {
    color: FEED_BROWN,
    fontSize: 15,
    fontWeight: "bold",
  },

  batchMeta: {
    color: "#7A6A58",
    fontSize: 12,
    marginTop: 5,
  },

  radio: {
    color: ROOSTER_RED,
    fontSize: 22,
    marginLeft: 10,
  },

  batchLoader: {
    marginVertical: 18,
  },

  notice: {
    backgroundColor: "#FFFFFF",
    padding: 15,
    borderRadius: 12,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: BORDER,
  },

  totalBox: {
    backgroundColor: CHICK_YELLOW,
    padding: 18,
    borderRadius: 14,
    marginBottom: 20,
  },

  totalLabel: {
    color: FEED_BROWN,
    fontWeight: "600",
  },

  total: {
    fontSize: 26,
    fontWeight: "bold",
    color: FEED_BROWN,
    marginTop: 5,
  },

  totalHint: {
    color: "#7A6A58",
    fontSize: 12,
    marginTop: 6,
  },

  button: {
    backgroundColor: ROOSTER_RED,
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
  },

  disabledButton: {
    opacity: 0.6,
  },

  buttonText: {
    color: "#FFFFFF",
    fontWeight: "bold",
    fontSize: 16,
  },

  secondary: {
    padding: 15,
    alignItems: "center",
    marginTop: 8,
  },

  secondaryText: {
    color: FEED_BROWN,
    fontWeight: "600",
  },

  helperText: {
    color: "#7A6A58",
    fontSize: 14,
    textAlign: "center",
    lineHeight: 21,
    marginTop: 8,
  },
});