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

export default function DailyRecordsScreen({ route, navigation }) {
  const { t } = useLanguage();

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

        const selectedBatch = batchList.find(item => item.id === batchId);

        if (selectedBatch) {
          setBatchName(selectedBatch.batchName || "");
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
  }, [batchId]);

  const selectBatch = batch => {
    setBatchId(batch.id);
    setBatchName(batch.batchName || t("unnamedBatch"));
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
      Alert.alert(t("notSignedIn"), t("pleaseLoginAgain"));
      return;
    }

    if (userRole !== "staff") {
      Alert.alert(t("staffAccessRequired"), t("onlyStaffDailyShort"));
      return;
    }

    const selectedBatch = batches.find(item => item.id === batchId);

    if (!selectedBatch) {
      Alert.alert(t("selectBatchTitle"), t("selectExistingChickenBatch"));
      return;
    }

    if (!isValidDate(recordDate.trim())) {
      Alert.alert(t("invalidDate"), t("invalidDateMsg"));
      return;
    }

    if (!feedDetails.trim() && !notes.trim()) {
      Alert.alert(t("addDetails"), t("addDetailsMsg"));
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

      Alert.alert(t("saved"), t("dailySaved"));
    } catch (error) {
      console.log("Daily record save error:", error.code, error.message);

      Alert.alert(
        t("couldNotSave"),
        error.code === "permission-denied"
          ? t("permissionDeniedDaily")
          : error.message || t("tryAgain")
      );
    } finally {
      setSaving(false);
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
          <Text style={styles.heading}>{t("dailyBatchRecord")}</Text>
          <Text style={styles.helperText}>{t("onlyStaffDaily")}</Text>

          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={() => navigation?.goBack()}
          >
            <Text style={styles.secondaryButtonText}>{t("goBack")}</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const saveDisabled = saving || batchesLoading || !batchId;

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
          <Text style={styles.logo}>📅</Text>
          <Text style={styles.heading}>{t("dailyBatchRecord")}</Text>
          <Text style={styles.subtitle}>{t("dailySubtitle")}</Text>
        </View>

        <View style={styles.card}>
          {/* BATCH */}
          <Text style={[styles.label, styles.firstLabel]}>
            {t("selectBatchStar")}
          </Text>

          {batchesLoading ? (
            <ActivityIndicator color={GREEN} style={styles.batchLoader} />
          ) : batches.length === 0 ? (
            <View style={styles.notice}>
              <Text style={styles.noticeText}>{t("noBatchesAskAdmin")}</Text>
            </View>
          ) : routeBatchId ? (
            <View style={styles.selectedBatch}>
              <Text style={styles.selectedBatchLabel}>
                {t("selectedBatch")}
              </Text>
              <Text style={styles.selectedBatchName}>
                {batchName || t("loadingBatchShort")}
              </Text>
            </View>
          ) : (
            <View style={styles.batchList}>
              {batches.map(batch => {
                const selected = batchId === batch.id;

                return (
                  <TouchableOpacity
                    key={batch.id}
                    style={[
                      styles.batchOption,
                      selected && styles.batchOptionSelected
                    ]}
                    onPress={() => selectBatch(batch)}
                    disabled={saving}
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

                      {selected && (
                        <Text style={styles.selectedTag}>
                          ✓ {t("selectedLabel")}
                        </Text>
                      )}
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

          {/* DATE */}
          <Text style={styles.label}>{t("recordDateLabel")}</Text>
          <TextInput
            style={styles.input}
            value={recordDate}
            onChangeText={setRecordDate}
            placeholder="2026-10-28"
            placeholderTextColor={PLACEHOLDER}
            autoCapitalize="none"
            keyboardType="numbers-and-punctuation"
            editable={!saving}
          />

          {/* FEEDING */}
          <Text style={styles.label}>{t("feedingInfoLabel")}</Text>
          <TextInput
            style={[styles.input, styles.multiline]}
            value={feedDetails}
            onChangeText={setFeedDetails}
            placeholder={t("feedingPlaceholder")}
            placeholderTextColor={PLACEHOLDER}
            multiline
            textAlignVertical="top"
            editable={!saving}
          />

          {/* NOTES */}
          <Text style={styles.label}>{t("dailyNotesLabel")}</Text>
          <TextInput
            style={[styles.input, styles.multiline]}
            value={notes}
            onChangeText={setNotes}
            placeholder={t("dailyNotesPlaceholder")}
            placeholderTextColor={PLACEHOLDER}
            multiline
            textAlignVertical="top"
            editable={!saving}
          />

          {/* SAVE */}
          <TouchableOpacity
            style={[styles.button, saveDisabled && styles.disabledButton]}
            onPress={saveRecord}
            disabled={saveDisabled}
          >
            {saving ? (
              <ActivityIndicator color={WHITE} />
            ) : (
              <Text style={styles.buttonText}>{t("saveDailyRecord")}</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={() => navigation?.goBack()}
            disabled={saving}
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

  multiline: {
    height: 110,
    paddingTop: 14
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

  selectedTag: {
    color: GREEN,
    fontSize: 12,
    fontWeight: "bold",
    marginTop: 6
  },

  emptyCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: INPUT_BORDER
  },

  /* BUTTONS */
  button: {
    height: 54,
    backgroundColor: GOLD,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 24,
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