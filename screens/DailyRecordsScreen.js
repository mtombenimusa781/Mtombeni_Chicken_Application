
import React, { useEffect, useState } from "react";
import {View,Text,TextInput,TouchableOpacity,StyleSheet,Alert,ScrollView,ActivityIndicator} from "react-native";
import {addDoc,collection,onSnapshot,query,orderBy,serverTimestamp,doc,getDoc} from "firebase/firestore";
import { auth, db } from "../Config/firebase";

const GREEN = "#245C38";
const LIGHT_GREEN = "#F4F8F2";

export default function DailyRecordsScreen({ route, navigation }) {
  const routeBatchId = route?.params?.batchId || "";
  const routeBatchName = route?.params?.batchName || "";

  const [batches, setBatches] = useState([]);
  const [batchId, setBatchId] = useState(routeBatchId);
  const [batchName, setBatchName] = useState(routeBatchName);
  const [recordDate, setRecordDate] = useState(
    new Date().toISOString().slice(0, 10)
  );
  const [feedDetails, setFeedDetails] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [batchesLoading, setBatchesLoading] = useState(true);
  const [roleLoading, setRoleLoading] = useState(true);
  const [userRole, setUserRole] = useState(null);

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
    if (routeBatchId) {
      setBatchId(routeBatchId);
      setBatchName(routeBatchName);
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

        const selectedBatch = batchList.find(
          item => item.id === batchId
        );

        if (selectedBatch) {
          setBatchName(selectedBatch.batchName || "");
        }

        setBatchesLoading(false);
      },
      error => {
        console.log("Batch loading error:", error.code, error.message);
        setBatchesLoading(false);

        Alert.alert(
          "Batch error",
          "Could not load the available batches."
        );
      }
    );

    return unsubscribe;
  }, [batchId]);

  const selectBatch = batch => {
    setBatchId(batch.id);
    setBatchName(batch.batchName || "Unnamed batch");
  };

  const isValidDate = value => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      return false;
    }

    const date = new Date(`${value}T00:00:00`);

    return (
      !Number.isNaN(date.getTime()) &&
      date.toISOString().slice(0, 10) === value
    );
  };

  const saveRecord = async () => {
    const user = auth.currentUser;

    if (!user) {
      Alert.alert("Not signed in", "Please log in again.");
      return;
    }

    if (userRole !== "staff") {
      Alert.alert(
        "Staff access required",
        "Only staff accounts can create daily records."
      );
      return;
    }

    const selectedBatch = batches.find(item => item.id === batchId);

    if (!selectedBatch) {
      Alert.alert(
        "Select a batch",
        "Please select an existing chicken batch."
      );
      return;
    }

    if (!isValidDate(recordDate.trim())) {
      Alert.alert(
        "Invalid date",
        "Enter a real date in YYYY-MM-DD format, for example 2026-10-28."
      );
      return;
    }

    if (!feedDetails.trim() && !notes.trim()) {
      Alert.alert(
        "Add details",
        "Enter feeding information or daily notes before saving."
      );
      return;
    }

    setSaving(true);

    try {
      await addDoc(collection(db, "dailyRecords"), {
        batchId: selectedBatch.id,
        batchName: selectedBatch.batchName || "",
        recordDate: recordDate.trim(),
        feedDetails: feedDetails.trim(),
        notes: notes.trim(),
        createdBy: user.uid,
        staffEmail: user.email || "",
        createdAt: serverTimestamp()
      });

      setFeedDetails("");
      setNotes("");

      Alert.alert("Saved", "Daily record has been saved successfully.");
    } catch (error) {
      console.log("Daily record save error:", error.code, error.message);

      Alert.alert(
        "Could not save",
        error.code === "permission-denied"
          ? "Firebase rules did not allow this record. Check that staff can create daily records and that the required fields match your rules."
          : error.message || "Please try again."
      );
    } finally {
      setSaving(false);
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
        <Text style={styles.heading}>Daily Batch Record</Text>
        <Text style={styles.helperText}>
          Only staff accounts can create daily records. Please use a staff
          account to continue.
        </Text>

        <TouchableOpacity
          style={styles.secondaryButton}
          onPress={() => navigation?.goBack()}
        >
          <Text style={styles.secondaryButtonText}>Go Back</Text>
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
        <Text style={styles.brand}>Mtombeni Chicken Business 🐔</Text>
        <Text style={styles.headerTitle}>Daily Batch Record</Text>
        <Text style={styles.headerSubtitle}>
          Record feeding information and daily observations.
        </Text>
      </View>

      <Text style={styles.label}>Select batch *</Text>

      {batchesLoading ? (
        <ActivityIndicator color={GREEN} style={styles.loader} />
      ) : batches.length === 0 ? (
        <View style={styles.notice}>
          <Text style={styles.helperText}>
            No batches are available. Ask the admin to create a batch first.
          </Text>
        </View>
      ) : routeBatchId ? (
        <View style={styles.selectedBatch}>
          <Text style={styles.selectedBatchLabel}>Selected batch</Text>
          <Text style={styles.selectedBatchName}>
            {batchName || "Loading batch..."}
          </Text>
        </View>
      ) : (
        batches.map(batch => (
          <TouchableOpacity
            key={batch.id}
            style={[
              styles.batch,
              batchId === batch.id && styles.selected
            ]}
            onPress={() => selectBatch(batch)}
            disabled={saving}
          >
            <Text
              style={[
                styles.batchName,
                batchId === batch.id && styles.selectedBatchText
              ]}
            >
              {batch.batchName || "Unnamed batch"}
            </Text>

            <Text
              style={[
                styles.batchMeta,
                batchId === batch.id && styles.selectedBatchText
              ]}
            >
              Starting chickens: {batch.initialChickens || 0}
            </Text>

            {batchId === batch.id && (
              <Text style={styles.selectedBatchText}>✓ Selected</Text>
            )}
          </TouchableOpacity>
        ))
      )}

      <Text style={styles.label}>Record date (YYYY-MM-DD) *</Text>
      <TextInput
        style={styles.input}
        value={recordDate}
        onChangeText={setRecordDate}
        placeholder="2026-10-28"
        placeholderTextColor="#89958B"
        autoCapitalize="none"
        editable={!saving}
      />

      <Text style={styles.label}>Feeding information</Text>
      <TextInput
        style={[styles.input, styles.multiline]}
        value={feedDetails}
        onChangeText={setFeedDetails}
        placeholder="Feed type, amount given, feeding observations..."
        placeholderTextColor="#89958B"
        multiline
        editable={!saving}
      />

      <Text style={styles.label}>Daily notes</Text>
      <TextInput
        style={[styles.input, styles.multiline]}
        value={notes}
        onChangeText={setNotes}
        placeholder="General observations or issues..."
        placeholderTextColor="#89958B"
        multiline
        editable={!saving}
      />

      <TouchableOpacity
        style={[
          styles.button,
          (saving || batchesLoading || !batchId) && styles.disabledButton
        ]}
        onPress={saveRecord}
        disabled={saving || batchesLoading || !batchId}
      >
        {saving ? (
          <ActivityIndicator color="#FFFFFF" />
        ) : (
          <Text style={styles.buttonText}>Save Daily Record</Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.secondaryButton}
        onPress={() => navigation?.goBack()}
        disabled={saving}
      >
        <Text style={styles.secondaryButtonText}>Go Back</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: LIGHT_GREEN
  },
  container: {
    padding: 20,
    paddingBottom: 35
  },
  centered: {
    flex: 1,
    backgroundColor: LIGHT_GREEN,
    justifyContent: "center",
    alignItems: "center",
    padding: 24
  },
  header: {
    backgroundColor: GREEN,
    padding: 20,
    borderRadius: 15,
    marginBottom: 22
  },
  brand: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "bold"
  },
  headerTitle: {
    fontSize: 23,
    fontWeight: "bold",
    color: "#FFFFFF",
    marginTop: 18
  },
  headerSubtitle: {
    color: "#E1EDE3",
    marginTop: 7,
    fontSize: 13,
    lineHeight: 19
  },
  heading: {
    fontSize: 23,
    fontWeight: "bold",
    color: GREEN,
    marginBottom: 12,
    textAlign: "center"
  },
  label: {
    fontWeight: "600",
    color: GREEN,
    marginTop: 14,
    marginBottom: 8
  },
  batch: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#D8E2D5",
    borderRadius: 10,
    padding: 14,
    marginBottom: 9
  },
  selected: {
    backgroundColor: GREEN,
    borderColor: GREEN,
    borderWidth: 2
  },
  batchName: {
    fontSize: 16,
    fontWeight: "bold",
    color: GREEN
  },
  batchMeta: {
    color: "#66736A",
    fontSize: 12,
    marginTop: 5
  },
  selectedBatchText: {
    color: "#FFFFFF",
    fontWeight: "bold",
    marginTop: 5
  },
  selectedBatch: {
    backgroundColor: "#E4F1E5",
    borderColor: "#C7DDC9",
    borderWidth: 1,
    borderRadius: 10,
    padding: 15
  },
  selectedBatchLabel: {
    color: "#526456",
    fontSize: 12
  },
  selectedBatchName: {
    color: GREEN,
    fontSize: 17,
    fontWeight: "bold",
    marginTop: 5
  },
  input: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#D8E2D5",
    borderRadius: 9,
    padding: 12,
    fontSize: 16,
    color: "#222222"
  },
  multiline: {
    minHeight: 100,
    textAlignVertical: "top"
  },
  button: {
    backgroundColor: GREEN,
    padding: 15,
    borderRadius: 10,
    alignItems: "center",
    marginTop: 24
  },
  disabledButton: {
    opacity: 0.6
  },
  buttonText: {
    color: "#FFFFFF",
    fontWeight: "bold",
    fontSize: 16
  },
  secondaryButton: {
    borderWidth: 1,
    borderColor: GREEN,
    padding: 14,
    borderRadius: 10,
    alignItems: "center",
    marginTop: 10
  },
  secondaryButtonText: {
    color: GREEN,
    fontWeight: "600"
  },
  loader: {
    marginVertical: 18
  },
  notice: {
    backgroundColor: "#FFFFFF",
    borderRadius: 10,
    padding: 15
  },
  helperText: {
    color: "#66736A",
    fontSize: 14,
    textAlign: "center",
    lineHeight: 21,
    marginTop: 8
  }
});
