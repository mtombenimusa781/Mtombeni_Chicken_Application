
import React, { useEffect, useState } from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ScrollView } from "react-native";
import { addDoc, collection, onSnapshot, query, orderBy, serverTimestamp, doc, getDoc } from "firebase/firestore";
import { auth, db } from "../Config/firebase";

export default function RecordDeathScreen({ navigation }) {
  const [batches, setBatches] = useState([]);
  const [batchId, setBatchId] = useState("");
  const [quantity, setQuantity] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const q = query(collection(db, "batches"), orderBy("createdAt", "desc"));
    return onSnapshot(q, snapshot => {
      setBatches(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, error => Alert.alert("Error", error.message));
  }, []);

  
  const saveDeath = async () => {
    const count = Number(quantity);
    const currentUser = auth.currentUser;

    if (!batchId || !Number.isInteger(count) || count <= 0) {
      Alert.alert(
        "Check details",
        "Select a batch and enter a whole number greater than zero."
      );
      return;
    }

    if (!currentUser) {
      Alert.alert("Not logged in", "Please log in before recording chicken deaths.");
      return;
    }

    const selectedBatch = batches.find(batch => batch.id === batchId);

    if (!selectedBatch) {
      Alert.alert("Batch not found", "Please select a valid chicken batch.");
      return;
    }

    setSaving(true);

    try {
      const deathRef = await addDoc(collection(db, "deaths"), {
        batchId,
        batchName: selectedBatch.batchName || "",
        quantity: count,
        notes: notes.trim(),
        createdBy: currentUser.uid,
        staffEmail: currentUser.email || "",
        recordDate: new Date().toISOString().slice(0, 10),
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
          activityType: "Chicken Deaths Recorded",
          description: `Recorded ${count} chicken death(s) from ${selectedBatch.batchName || "a chicken batch"}`,
          quantity: count,
          amount: 0,
          batchId,
          batchName: selectedBatch.batchName || "",
          notes: notes.trim(),
          relatedRecordId: deathRef.id,
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

      setQuantity("");
      setNotes("");

      Alert.alert(
        activitySaved ? "Saved" : "Death record saved",
        activitySaved
          ? "Chicken deaths have been recorded."
          : "Chicken deaths have been recorded, but the activity history could not be saved. Check your Firestore rules."
      );
    } catch (error) {
      Alert.alert("Could not save", error.message);
    } finally {
      setSaving(false);
    }
  };


  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.heading}>Record Chicken Deaths</Text>
      <Text style={styles.label}>Select batch</Text>

      {batches.map(batch => (
        <TouchableOpacity
          key={batch.id}
          style={[styles.batch, batchId === batch.id && styles.selected]}
          onPress={() => setBatchId(batch.id)}
        >
          <Text style={styles.batchName}>{batch.batchName}</Text>
          <Text style={styles.muted}>
            Starting chickens: {batch.initialChickens}
          </Text>
          {batchId === batch.id && <Text style={styles.selectedText}>Selected</Text>}
        </TouchableOpacity>
      ))}

      <Text style={styles.label}>Number of chickens that died</Text>
      <TextInput
        style={styles.input}
        value={quantity}
        onChangeText={setQuantity}
        keyboardType="number-pad"
        placeholder="e.g. 3"
      />

      <Text style={styles.label}>Notes (optional)</Text>
      <TextInput
        style={[styles.input, styles.notes]}
        value={notes}
        onChangeText={setNotes}
        placeholder="Add details about the deaths"
        multiline
      />

      <TouchableOpacity style={styles.button} onPress={saveDeath} disabled={saving}>
        <Text style={styles.buttonText}>{saving ? "Saving..." : "Save Death Record"}</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, backgroundColor: "#F4F8F2", flexGrow: 1 },
  heading: { fontSize: 23, fontWeight: "bold", color: "#245C38", marginBottom: 20 },
  label: { fontWeight: "600", color: "#245C38", marginTop: 14, marginBottom: 8 },
  batch: { backgroundColor: "white", borderWidth: 1, borderColor: "#D8E2D5", borderRadius: 10, padding: 14, marginBottom: 9 },
  selected: { borderColor: "#245C38", borderWidth: 2 },
  batchName: { fontSize: 16, fontWeight: "bold", color: "#245C38" },
  muted: { color: "#666", marginTop: 4 },
  selectedText: { color: "#245C38", fontWeight: "bold", marginTop: 5 },
  input: { backgroundColor: "white", borderWidth: 1, borderColor: "#D8E2D5", borderRadius: 9, padding: 12, fontSize: 16 },
  notes: { minHeight: 90, textAlignVertical: "top" },
  button: { backgroundColor: "#245C38", padding: 15, borderRadius: 10, alignItems: "center", marginTop: 24 },
  buttonText: { color: "white", fontWeight: "bold", fontSize: 16 }
});
