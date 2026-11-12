
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
  getDoc,
  runTransaction
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

const SELLING_PRICE = 85;

// Convert South African cellphone numbers to +27 format
const normalizeSouthAfricanPhone = phone => {
  const digits = phone.replace(/\D/g, "");

  if (digits.length === 10 && digits.startsWith("0")) {
    return `+27${digits.substring(1)}`;
  }

  if (digits.length === 11 && digits.startsWith("27")) {
    return `+${digits}`;
  }

  return null;
};

export default function AddSaleScreen({ route, navigation }) {
  const { t } = useLanguage();

  const [batches, setBatches] = useState([]);
  const [batchId, setBatchId] = useState(route?.params?.batchId || "");
  const [quantity, setQuantity] = useState("");

  // Customer information
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [smsConsent, setSmsConsent] = useState(false);

  const [saving, setSaving] = useState(false);
  const [batchesLoading, setBatchesLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, "batches"), orderBy("createdAt", "desc"));

    return onSnapshot(
      q,
      snapshot => {
        setBatches(
          snapshot.docs.map(item => ({ id: item.id, ...item.data() }))
        );
        setBatchesLoading(false);
      },
      error => {
        setBatchesLoading(false);
        Alert.alert(t("batchError"), error.message);
      }
    );
  }, []);

  const selectedBatch = batches.find(batch => batch.id === batchId);
  const totalAmount = Number(quantity || 0) * SELLING_PRICE;

  const saveSale = async () => {
    const count = Number(quantity);

    if (!selectedBatch) {
      Alert.alert(t("selectBatchTitle"), t("selectBatchSellMsg"));
      return;
    }

    if (!Number.isInteger(count) || count <= 0) {
      Alert.alert(t("invalidQuantity"), t("wholeNumberMsg"));
      return;
    }

    const cleanCustomerName = customerName.trim();

    if (!cleanCustomerName) {
      Alert.alert(
        "Customer Required",
        "Please enter the customer's name."
      );
      return;
    }

    const normalizedPhone = normalizeSouthAfricanPhone(customerPhone);

    if (!normalizedPhone) {
      Alert.alert(
        "Invalid Cellphone Number",
        "Please enter a valid South African cellphone number, for example 0712345678."
      );
      return;
    }

    const currentUser = auth.currentUser;

    if (!currentUser) {
      Alert.alert(t("loginRequired"), t("pleaseLoginAgain"));
      return;
    }

    setSaving(true);

    try {
      // Get current sales and deaths to calculate available stock
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
        .filter(item => item.data().batchId === batchId)
        .reduce(
          (sum, item) => sum + Number(item.data().quantity || 0),
          0
        );

      const dead = deathsSnapshot.docs
        .filter(item => item.data().batchId === batchId)
        .reduce(
          (sum, item) => sum + Number(item.data().quantity || 0),
          0
        );

      const remaining =
        Number(selectedBatch.initialChickens) - sold - dead;

      if (count > remaining) {
        Alert.alert(
          t("notEnoughStock"),
          t("notEnoughStockMsg").replace("{remaining}", remaining)
        );
        return;
      }

      // Customer document ID is the normalized cellphone number.
      // This prevents the same customer being saved more than once.
      const customerRef = doc(db, "customers", normalizedPhone);

      // Create a new sale reference before the transaction.
      const saleRef = doc(collection(db, "sales"));

      // Save the sale and customer update together.
      await runTransaction(db, async transaction => {
        const customerSnapshot = await transaction.get(customerRef);

        const saleData = {
          batchId,
          batchName: selectedBatch.batchName,

          customerName: cleanCustomerName,
          customerPhone: normalizedPhone,
          customerSmsConsent: smsConsent,
          customerSmsConsentAt: smsConsent
            ? serverTimestamp()
            : null,

          quantity: count,
          pricePerChicken: SELLING_PRICE,
          purchaseCostPerChicken: Number(
            selectedBatch.pricePerChicken
          ),
          totalAmount,

          createdBy: currentUser.uid,
          staffEmail: currentUser.email || "",

          saleDate: new Date().toISOString().slice(0, 10),
          createdAt: serverTimestamp()
        };

        transaction.set(saleRef, saleData);

        if (!customerSnapshot.exists()) {
          // First purchase by this customer
          transaction.set(customerRef, {
            phone: normalizedPhone,
            name: cleanCustomerName,

            smsConsent,
            smsConsentAt: smsConsent
              ? serverTimestamp()
              : null,

            smsOptOut: false,
            smsOptOutAt: null,

            createdBy: currentUser.uid,
            createdAt: serverTimestamp(),

            lastPurchaseAt: serverTimestamp(),
            lastPurchaseBy: currentUser.uid,
            updatedAt: serverTimestamp()
          });
        } else {
          // Existing customer: preserve their consent and opt-out status.
          const existingCustomer = customerSnapshot.data();

          const customerUpdate = {
            name: cleanCustomerName,
            lastPurchaseAt: serverTimestamp(),
            lastPurchaseBy: currentUser.uid,
            updatedAt: serverTimestamp()
          };

          // Only record new consent when the customer explicitly
          // agrees and has not previously opted out.
          if (
            smsConsent === true &&
            existingCustomer.smsConsent !== true &&
            existingCustomer.smsOptOut !== true
          ) {
            customerUpdate.smsConsent = true;
            customerUpdate.smsConsentAt = serverTimestamp();
          }

          transaction.set(customerRef, customerUpdate, {
            merge: true
          });
        }
      });

      // Record staff activity separately.
      // A failure here will not undo the successfully saved sale.
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

        console.log(
          "Activity tracking error:",
          activityError.code,
          activityError.message
        );
      }

      // Clear the form after a successful sale
      setQuantity("");
      setCustomerName("");
      setCustomerPhone("");
      setSmsConsent(false);

      const revenueText = t("revenueRecorded").replace(
        "{amount}",
        totalAmount.toFixed(2)
      );

      Alert.alert(
        activitySaved ? t("saleSaved") : t("saleSavedLogFailed"),
        activitySaved
          ? revenueText
          : `${revenueText}. ${t("activityNotSaved")}`,
        [
          {
            text: t("ok"),
            onPress: () => navigation.goBack()
          }
        ]
      );
    } catch (error) {
      console.log("Sale saving error:", error.code, error.message);

      Alert.alert(
        t("couldNotSaveSale"),
        error.message || "Please try again."
      );
    } finally {
      setSaving(false);
    }
  };

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
        <View style={styles.headerCard}>
          <Text style={styles.logo}>💰</Text>
          <Text style={styles.heading}>{t("recordSaleHeading")}</Text>

          <View style={styles.priceBadge}>
            <Text style={styles.priceLabel}>
              {t("sellingPriceLabel")}
            </Text>

            <Text style={styles.price}>
              R {SELLING_PRICE.toFixed(2)}
            </Text>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={[styles.label, styles.firstLabel]}>
            {t("selectBatch")}
          </Text>

          {batchesLoading ? (
            <ActivityIndicator
              color={GREEN}
              style={styles.batchLoader}
            />
          ) : batches.length === 0 ? (
            <View style={styles.notice}>
              <Text style={styles.noticeText}>
                {t("noBatchesAskAdmin")}
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
                    onPress={() => setBatchId(batch.id)}
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
                        {t("purchasePriceEach").replace(
                          "{price}",
                          Number(batch.pricePerChicken || 0).toFixed(2)
                        )}
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

          {/* CUSTOMER DETAILS */}
          <Text style={styles.label}>Customer Name</Text>

          <TextInput
            style={styles.input}
            value={customerName}
            onChangeText={setCustomerName}
            placeholder="Enter customer's full name"
            placeholderTextColor={PLACEHOLDER}
            editable={!saving}
            autoCapitalize="words"
          />

          <Text style={styles.label}>
            Customer Cellphone Number
          </Text>

          <TextInput
            style={styles.input}
            value={customerPhone}
            onChangeText={setCustomerPhone}
            placeholder="e.g. 0712345678"
            placeholderTextColor={PLACEHOLDER}
            keyboardType="phone-pad"
            maxLength={13}
            editable={!saving}
          />

          {/* SMS CONSENT */}
          <TouchableOpacity
            style={styles.consentRow}
            onPress={() => setSmsConsent(!smsConsent)}
            disabled={saving}
            activeOpacity={0.8}
          >
            <Ionicons
              name={smsConsent ? "checkbox" : "square-outline"}
              size={24}
              color={GREEN}
            />

            <Text style={styles.consentText}>
              Customer agrees to receive SMS updates about chicken
              availability.
            </Text>
          </TouchableOpacity>

          <Text style={styles.consentNote}>
            Only select this option after the customer has agreed to
            receive these messages. Customers who have not consented
            should not receive marketing SMS messages.
          </Text>

          {/* QUANTITY */}
          <Text style={styles.label}>
            {t("numSoldLabel")}
          </Text>

          <TextInput
            style={styles.input}
            value={quantity}
            onChangeText={text =>
              setQuantity(text.replace(/[^0-9]/g, ""))
            }
            keyboardType="number-pad"
            placeholder={t("numSoldPlaceholder")}
            placeholderTextColor={PLACEHOLDER}
            editable={!saving}
          />

          {/* TOTAL */}
          <View style={styles.totalCard}>
            <Text style={styles.totalLabel}>
              {t("expectedRevenue")}
            </Text>

            <Text style={styles.total}>
              R {totalAmount.toFixed(2)}
            </Text>

            <Text style={styles.totalHint}>
              {quantity || "0"} × R {SELLING_PRICE.toFixed(2)}
            </Text>
          </View>

          {/* SAVE */}
          <TouchableOpacity
            style={[
              styles.button,
              saveDisabled && styles.disabledButton
            ]}
            onPress={saveSale}
            disabled={saveDisabled}
          >
            {saving ? (
              <ActivityIndicator color={WHITE} />
            ) : (
              <Text style={styles.buttonText}>
                {t("saveSale")}
              </Text>
            )}
          </TouchableOpacity>
        </View>

        <Text style={styles.footer}>
          {t("appFooter")}
        </Text>
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

  priceBadge: {
    backgroundColor: INPUT_BG,
    borderWidth: 1,
    borderColor: INPUT_BORDER,
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 22,
    marginTop: 16,
    alignItems: "center"
  },

  priceLabel: {
    color: MUTED,
    fontSize: 12
  },

  price: {
    color: GOLD,
    fontSize: 26,
    fontWeight: "bold",
    marginTop: 4
  },

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

  consentRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 18,
    padding: 12,
    backgroundColor: INPUT_BG,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: INPUT_BORDER,
    gap: 10
  },

  consentText: {
    flex: 1,
    color: LABEL,
    fontSize: 13,
    lineHeight: 19
  },

  consentNote: {
    color: MUTED,
    fontSize: 11,
    lineHeight: 17,
    marginTop: 8
  },

  totalCard: {
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

  footer: {
    textAlign: "center",
    color: FOOTER,
    fontSize: 12,
    marginTop: 26
  }
});
