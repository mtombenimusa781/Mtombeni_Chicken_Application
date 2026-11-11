
import React, { useEffect, useState } from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ScrollView } from "react-native";
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
import { auth, db } from "../Config/firebase";

const SELLING_PRICE = 85;

export default function AddSaleScreen({ route, navigation }) {
  const [batches, setBatches] = useState([]);
  const [batchId, setBatchId] = useState(route?.params?.batchId || "");
  const [quantity, setQuantity] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const q = query(collection(db, "batches"), orderBy("createdAt", "desc"));
    return onSnapshot(q, snapshot => {
      setBatches(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, error => Alert.alert("Batch error", error.message));
  }, []);

  const selectedBatch = batches.find(batch => batch.id === batchId);
  const totalAmount = Number(quantity || 0) * SELLING_PRICE;

  const saveSale = async () => {
    const count = Number(quantity);

    if (!selectedBatch) {
      Alert.alert("Select a batch", "Choose the batch you are selling chickens from.");
      return;
    }

    if (!Number.isInteger(count) || count <= 0) {
      Alert.alert("Invalid quantity", "Enter a whole number greater than zero.");
      return;
    }

    setSaving(true);

    try {
      const [salesSnapshot, deathsSnapshot] = await Promise.all([
        new Promise((resolve, reject) => {
          const unsubscribe = onSnapshot(
            query(collection(db, "sales")),
            snapshot => {
              unsubscribe();
              resolve(snapshot);
            },
            error => {
              unsubscribe();
              reject(error);
            }
          );
        }),
        new Promise((resolve, reject) => {
          const unsubscribe = onSnapshot(
            query(collection(db, "deaths")),
            snapshot => {
              unsubscribe();
              resolve(snapshot);
            },
            error => {
              unsubscribe();
              reject(error);
            }
          );
        })
      ]);

      const sold = salesSnapshot.docs
        .filter(doc => doc.data().batchId === batchId)
        .reduce((sum, doc) => sum + Number(doc.data().quantity || 0), 0);

      const dead = deathsSnapshot.docs
        .filter(doc => doc.data().batchId === batchId)
        .reduce((sum, doc) => sum + Number(doc.data().quantity || 0), 0);

      const remaining = Number(selectedBatch.initialChickens) - sold - dead;

      if (count > remaining) {
        Alert.alert("Not enough stock", `This batch has approximately ${remaining} chickens remaining.`);
        return;
      }


const currentUser = auth.currentUser;

if (!currentUser) {
  Alert.alert("Login required", "Please log in again.");
  return;
}

const saleRef = await addDoc(collection(db, "sales"), {
  batchId,
  batchName: selectedBatch.batchName,
  quantity: count,
  pricePerChicken: SELLING_PRICE,
  purchaseCostPerChicken: Number(selectedBatch.pricePerChicken),
  totalAmount,
  createdBy: currentUser.uid,
  staffEmail: currentUser.email || "",
  saleDate: new Date().toISOString().slice(0, 10),
  createdAt: serverTimestamp()
});

let activitySaved = true;

try {
  const profileSnapshot = await getDoc(
    doc(db, "users", currentUser.uid)
  );

  const staffName = profileSnapshot.exists()
    ? profileSnapshot.data().name || "Staff member"
    : "Staff member";

    await addDoc(collection(db, "staffActivities"), {
      staffUid: currentUser.uid,
      staffName,
      staffEmail: currentUser.email || "",
      activityType: "Chicken Sale",
      description: `Recorded ${count} chicken(s) sold from ${selectedBatch.batchName}`,
      quantity: count,
      amount: totalAmount,
      batchId,
      batchName: selectedBatch.batchName,
      relatedRecordId: saleRef.id,
      createdAt: serverTimestamp()
    });
  } catch (activityError) {
    activitySaved = false;
    console.log("Activity tracking error:", activityError.code, activityError.message);
  }

  setQuantity("");

  Alert.alert(
    activitySaved ? "Sale saved" : "Sale saved; activity log failed",
    activitySaved
      ? `Revenue recorded: R ${totalAmount.toFixed(2)}`
      : `Revenue recorded: R ${totalAmount.toFixed(2)}. The activity history could not be saved. Check your Firestore rules.`,
    [{ text: "OK", onPress: () => navigation.goBack() }]
  );

    } catch (error) {
      Alert.alert("Could not save sale", error.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.heading}>Record Chicken Sale</Text>
      <Text style={styles.label}>Selling price per chicken</Text>
      <Text style={styles.price}>R {SELLING_PRICE.toFixed(2)}</Text>

      <Text style={styles.label}>Select batch</Text>
      {batches.map(batch => (
        <TouchableOpacity
          key={batch.id}
          style={[styles.batch, batchId === batch.id && styles.selected]}
          onPress={() => setBatchId(batch.id)}
        >
          <Text style={styles.batchName}>{batch.batchName}</Text>
          <Text style={styles.muted}>Purchase price: R {Number(batch.pricePerChicken).toFixed(2)} each</Text>
          {batchId === batch.id && <Text style={styles.selectedText}>Selected</Text>}
        </TouchableOpacity>
      ))}

      <Text style={styles.label}>Number of chickens sold</Text>
      <TextInput
        style={styles.input}
        value={quantity}
        onChangeText={setQuantity}
        keyboardType="number-pad"
        placeholder="e.g. 5"
      />

      <View style={styles.totalCard}>
        <Text style={styles.label}>Expected sale revenue</Text>
        <Text style={styles.total}>R {totalAmount.toFixed(2)}</Text>
      </View>

      <TouchableOpacity style={styles.button} onPress={saveSale} disabled={saving}>
        <Text style={styles.buttonText}>{saving ? "Saving..." : "Save Sale"}</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, backgroundColor: "#F4F8F2", flexGrow: 1 },
  heading: { fontSize: 23, fontWeight: "bold", color: "#245C38", marginBottom: 18 },
  label: { color: "#245C38", fontWeight: "600", marginTop: 14, marginBottom: 8 },
  price: { fontSize: 22, fontWeight: "bold", color: "#245C38" },
  batch: { backgroundColor: "white", borderWidth: 1, borderColor: "#D8E2D5", borderRadius: 10, padding: 14, marginBottom: 9 },
  selected: { borderColor: "#245C38", borderWidth: 2 },
  batchName: { fontSize: 16, fontWeight: "bold", color: "#245C38" },
  muted: { color: "#666", marginTop: 4 },
  selectedText: { color: "#245C38", fontWeight: "bold", marginTop: 5 },
  input: { backgroundColor: "white", borderWidth: 1, borderColor: "#D8E2D5", borderRadius: 9, padding: 12, fontSize: 16 },
  totalCard: { backgroundColor: "white", padding: 16, borderRadius: 10, marginTop: 20 },
  total: { color: "#245C38", fontSize: 24, fontWeight: "bold" },
  button: { backgroundColor: "#245C38", padding: 15, borderRadius: 10, alignItems: "center", marginTop: 22 },
  buttonText: { color: "white", fontSize: 16, fontWeight: "bold" }
});
