
import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Alert
} from "react-native";

import {
  collection,
  onSnapshot,
  query,
  orderBy,
  doc,
  writeBatch,
  serverTimestamp
} from "firebase/firestore";

import { Ionicons } from "@expo/vector-icons";
import { auth, db } from "../Config/firebase";

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

const SMS_WORKER_URL =
  "https://mtombeni-chicken-sms.mtombenimusa781.workers.dev";

export default function CustomerNotificationsScreen() {
  const [sales, setSales] = useState([]);
  const [customerRecords, setCustomerRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [message, setMessage] = useState("");
  const [updatingPhone, setUpdatingPhone] = useState(null);
  const [sending, setSending] = useState(false);

  // LOAD SALES AND CUSTOMERS
  useEffect(() => {
    let salesLoaded = false;
    let customersLoaded = false;

    const checkLoading = () => {
      if (salesLoaded && customersLoaded) {
        setLoading(false);
      }
    };

    const salesQuery = query(
      collection(db, "sales"),
      orderBy("createdAt", "desc")
    );

    const unsubscribeSales = onSnapshot(
      salesQuery,
      snapshot => {
        setSales(
          snapshot.docs.map(item => ({
            id: item.id,
            ...item.data()
          }))
        );

        salesLoaded = true;
        checkLoading();
      },
      error => {
        console.log("Sales loading error:", error.code, error.message);
        salesLoaded = true;
        checkLoading();

        Alert.alert("Sales Error", error.message);
      }
    );

    const unsubscribeCustomers = onSnapshot(
      collection(db, "customers"),
      snapshot => {
        setCustomerRecords(
          snapshot.docs.map(item => ({
            id: item.id,
            ...item.data()
          }))
        );

        customersLoaded = true;
        checkLoading();
      },
      error => {
        console.log(
          "Customer loading error:",
          error.code,
          error.message
        );

        customersLoaded = true;
        checkLoading();

        Alert.alert("Customer Error", error.message);
      }
    );

    return () => {
      unsubscribeSales();
      unsubscribeCustomers();
    };
  }, []);

  // COMBINE CUSTOMER RECORDS WITH SALES
  const customers = useMemo(() => {
    const customerMap = new Map();

    sales.forEach(sale => {
      if (!sale.customerPhone) return;

      const phone = String(sale.customerPhone).trim();

      if (!phone) return;

      if (!customerMap.has(phone)) {
        customerMap.set(phone, {
          phone,
          name: sale.customerName || "Unknown customer",
          purchases: 1,
          customerRecord: null
        });
      } else {
        const existing = customerMap.get(phone);
        existing.purchases += 1;
      }
    });

    customerRecords.forEach(record => {
      const phone = record.phone || record.id;

      if (!phone) return;

      const existing = customerMap.get(phone);

      if (existing) {
        existing.customerRecord = record;
        existing.name = record.name || existing.name;
      } else {
        customerMap.set(phone, {
          phone,
          name: record.name || "Unknown customer",
          purchases: 0,
          customerRecord: record
        });
      }
    });

    return Array.from(customerMap.values()).map(customer => {
      const record = customer.customerRecord;

      const hasRecord = !!record;
      const consent = hasRecord && record.smsConsent === true;
      const optedOut = hasRecord && record.smsOptOut === true;

      return {
        ...customer,
        hasRecord,
        consent,
        optedOut,
        eligible: consent && !optedOut
      };
    });
  }, [sales, customerRecords]);

  const filteredCustomers = customers.filter(customer => {
    const searchValue = search.toLowerCase();

    return (
      customer.name.toLowerCase().includes(searchValue) ||
      customer.phone.toLowerCase().includes(searchValue)
    );
  });

  const eligibleCustomers = customers.filter(
    customer => customer.eligible
  );

  const consentCount = eligibleCustomers.length;

  const optedOutCount = customers.filter(
    customer => customer.optedOut
  ).length;

  const notConsentedCount = customers.filter(
    customer => !customer.eligible && !customer.optedOut
  ).length;

  // UPDATE CUSTOMER CONSENT OR OPT-OUT
  const updateCustomerConsent = (customer, action) => {
    if (!customer.hasRecord) {
      Alert.alert(
        "Customer Record Missing",
        "This is an older customer without a customer record. Their consent must be verified before they can be added to the SMS list."
      );
      return;
    }

    const isOptOut = action === "optOut";

    const title = isOptOut
      ? "Opt Out Customer"
      : "Confirm SMS Consent";

    const description = isOptOut
      ? `Stop SMS updates for ${customer.name}?`
      : `Has ${customer.name} explicitly agreed again to receive SMS updates? Only continue after receiving their agreement.`;

    Alert.alert(title, description, [
      {
        text: "Cancel",
        style: "cancel"
      },
      {
        text: "Confirm",
        onPress: async () => {
          const currentUser = auth.currentUser;

          if (!currentUser) {
            Alert.alert("Login Required", "Please sign in again.");
            return;
          }

          setUpdatingPhone(customer.phone);

          try {
            const customerRef = doc(
              db,
              "customers",
              customer.phone
            );

            const historyRef = doc(
              collection(
                db,
                "customers",
                customer.phone,
                "consentHistory"
              )
            );

            const batch = writeBatch(db);

            if (isOptOut) {
              batch.update(customerRef, {
                smsConsent: false,
                smsConsentAt: null,
                smsOptOut: true,
                smsOptOutAt: serverTimestamp(),
                updatedAt: serverTimestamp()
              });
            } else {
              batch.update(customerRef, {
                smsConsent: true,
                smsConsentAt: serverTimestamp(),
                smsOptOut: false,
                smsOptOutAt: null,
                updatedAt: serverTimestamp()
              });
            }

            batch.set(historyRef, {
              phone: customer.phone,
              customerName: customer.name,
              action: isOptOut
                ? "OPT_OUT"
                : "CONSENT_GRANTED",
              changedBy: currentUser.uid,
              changedByEmail: currentUser.email || "",
              changedAt: serverTimestamp()
            });

            await batch.commit();

            Alert.alert(
              "Updated",
              isOptOut
                ? "The customer has been opted out of SMS messages."
                : "The customer's SMS consent has been updated."
            );
          } catch (error) {
            console.log(
              "Consent update error:",
              error.code,
              error.message
            );

            Alert.alert(
              "Update Failed",
              error.message || "Could not update customer consent."
            );
          } finally {
            setUpdatingPhone(null);
          }
        }
      }
    ]);
  };

  // SEND SMS THROUGH CLOUDFLARE WORKER
  const sendSMS = async () => {
    if (sending) return;

    const currentUser = auth.currentUser;

    if (!currentUser) {
      Alert.alert("Login Required", "Please sign in again.");
      return;
    }

    if (!message.trim()) {
      Alert.alert("Message Required", "Please write your SMS message.");
      return;
    }

    if (consentCount === 0) {
      Alert.alert("No Recipients", "There are no eligible customers.");
      return;
    }

    setSending(true);

    try {
      const idToken = await currentUser.getIdToken();

      const response = await fetch(SMS_WORKER_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${idToken}`
        },
        body: JSON.stringify({
          message: message.trim()
        })
      });

      let result;

      try {
        result = await response.json();
      } catch {
        throw new Error(
          "The SMS service returned an unexpected response. Please check the Cloudflare Worker."
        );
      }

      if (!response.ok || result.success === false) {
        throw new Error(
          result.error ||
          result.message ||
          `SMS request failed. Server status: ${response.status}`
        );
      }

      Alert.alert(
        "SMS Service Response",
        result.message ||
          "The SMS service accepted the request. Check your WinSMS account to confirm delivery status."
      );

      setMessage("");
    } catch (error) {
      console.log("SMS sending error:", error);

      Alert.alert(
        "SMS Sending Failed",
        error.message ||
          "Could not connect to the SMS service."
      );
    } finally {
      setSending(false);
    }
  };

  // CONFIRM BEFORE SENDING
  const handleSend = () => {
    if (!message.trim()) {
      Alert.alert(
        "Message Required",
        "Please write your SMS message."
      );
      return;
    }

    if (consentCount === 0) {
      Alert.alert(
        "No Recipients",
        "There are no eligible customers."
      );
      return;
    }

    if (sending) return;

    Alert.alert(
      "Confirm SMS Sending",
      `You are about to send your message to ${consentCount} eligible customer(s).\n\n"${message.trim()}"\n\nSMS charges may apply. Do you want to continue?`,
      [
        {
          text: "Cancel",
          style: "cancel"
        },
        {
          text: "Send",
          onPress: sendSMS
        }
      ]
    );
  };

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.container}
      showsVerticalScrollIndicator={false}
    >
      {/* HEADER */}
      <View style={styles.headerCard}>
        <Text style={styles.logo}>📩</Text>

        <Text style={styles.heading}>
          Customer Notifications
        </Text>

        <Text style={styles.subtitle}>
          Manage customers and send chicken availability updates.
        </Text>
      </View>

      {loading ? (
        <ActivityIndicator
          size="large"
          color={GREEN}
          style={{ margin: 30 }}
        />
      ) : (
        <>
          {/* CUSTOMER SUMMARY */}
          <View style={styles.summaryRow}>
            <View style={styles.summaryCard}>
              <Text style={styles.summaryNumber}>
                {customers.length}
              </Text>

              <Text style={styles.summaryLabel}>
                Total Customers
              </Text>
            </View>

            <View style={styles.summaryCard}>
              <Text style={styles.summaryNumber}>
                {consentCount}
              </Text>

              <Text style={styles.summaryLabel}>
                SMS Eligible
              </Text>
            </View>
          </View>

          <View style={styles.summaryRow}>
            <View style={styles.summaryCard}>
              <Text style={styles.summaryNumber}>
                {notConsentedCount}
              </Text>

              <Text style={styles.summaryLabel}>
                No Verified Consent
              </Text>
            </View>

            <View style={styles.summaryCard}>
              <Text style={styles.summaryNumber}>
                {optedOutCount}
              </Text>

              <Text style={styles.summaryLabel}>
                Opted Out
              </Text>
            </View>
          </View>

          {/* CUSTOMER LIST */}
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>
              Customer List
            </Text>

            <Text style={styles.countText}>
              {customers.length} unique customers
            </Text>
          </View>

          <View style={styles.searchBox}>
            <Ionicons
              name="search"
              size={20}
              color={MUTED}
            />

            <TextInput
              style={styles.searchInput}
              value={search}
              onChangeText={setSearch}
              placeholder="Search name or cellphone number"
              placeholderTextColor={MUTED}
            />
          </View>

          {filteredCustomers.length === 0 ? (
            <View style={styles.emptyCard}>
              <Ionicons
                name="people-outline"
                size={35}
                color={MUTED}
              />

              <Text style={styles.emptyText}>
                No customers found.
              </Text>
            </View>
          ) : (
            filteredCustomers.map(customer => {
              let statusText = "Needs verification";
              let statusStyle = styles.notEligibleBadge;
              let statusTextStyle = styles.notEligibleText;

              if (customer.optedOut) {
                statusText = "Opted out";
              } else if (customer.eligible) {
                statusText = "SMS Eligible";
                statusStyle = styles.eligibleBadge;
                statusTextStyle = styles.eligibleText;
              } else if (!customer.hasRecord) {
                statusText = "Needs verification";
              } else {
                statusText = "No consent";
              }

              return (
                <View
                  style={styles.customerCard}
                  key={customer.phone}
                >
                  <View style={styles.customerIcon}>
                    <Ionicons
                      name="person"
                      size={23}
                      color={GREEN}
                    />
                  </View>

                  <View style={styles.customerInfo}>
                    <Text style={styles.customerName}>
                      {customer.name}
                    </Text>

                    <Text style={styles.phone}>
                      {customer.phone}
                    </Text>

                    <Text style={styles.purchaseCount}>
                      {customer.purchases} purchase(s)
                    </Text>

                    <View
                      style={[
                        styles.statusBadge,
                        statusStyle
                      ]}
                    >
                      <Text
                        style={[
                          styles.statusText,
                          statusTextStyle
                        ]}
                      >
                        {statusText}
                      </Text>
                    </View>

                    {customer.hasRecord && (
                      <View style={styles.actionRow}>
                        {customer.optedOut ||
                        !customer.consent ? (
                          <TouchableOpacity
                            style={styles.consentButton}
                            disabled={updatingPhone !== null}
                            onPress={() =>
                              updateCustomerConsent(
                                customer,
                                "consent"
                              )
                            }
                          >
                            {updatingPhone === customer.phone ? (
                              <ActivityIndicator color={WHITE} />
                            ) : (
                              <Text style={styles.actionButtonText}>
                                {customer.optedOut
                                  ? "Record New Consent"
                                  : "Mark Consented"}
                              </Text>
                            )}
                          </TouchableOpacity>
                        ) : (
                          <TouchableOpacity
                            style={styles.optOutButton}
                            disabled={updatingPhone !== null}
                            onPress={() =>
                              updateCustomerConsent(
                                customer,
                                "optOut"
                              )
                            }
                          >
                            {updatingPhone === customer.phone ? (
                              <ActivityIndicator color={WHITE} />
                            ) : (
                              <Text style={styles.actionButtonText}>
                                Opt Out
                              </Text>
                            )}
                          </TouchableOpacity>
                        )}
                      </View>
                    )}
                  </View>
                </View>
              );
            })
          )}

          {/* MESSAGE COMPOSER */}
          <Text style={styles.sectionTitle}>
            Compose SMS
          </Text>

          <View style={styles.messageCard}>
            <Text style={styles.label}>
              Your Message
            </Text>

            <TextInput
              style={styles.messageInput}
              value={message}
              onChangeText={setMessage}
              placeholder="Write your chicken availability message here..."
              placeholderTextColor={MUTED}
              multiline
              maxLength={459}
              textAlignVertical="top"
            />

            <Text style={styles.characterCount}>
              {message.length}/459 characters
            </Text>

            <View style={styles.recipientBox}>
              <Ionicons
                name="people"
                size={21}
                color={GREEN}
              />

              <Text style={styles.recipientText}>
                {consentCount} eligible SMS recipients
              </Text>
            </View>

            <TouchableOpacity
              style={[
                styles.sendButton,
                (
                  !message.trim() ||
                  consentCount === 0 ||
                  sending
                ) && styles.disabledButton
              ]}
              onPress={handleSend}
              disabled={
                !message.trim() ||
                consentCount === 0 ||
                sending
              }
            >
              {sending ? (
                <ActivityIndicator color={WHITE} />
              ) : (
                <>
                  <Ionicons
                    name="send"
                    size={18}
                    color={WHITE}
                  />

                  <Text style={styles.sendButtonText}>
                    Send SMS
                  </Text>
                </>
              )}
            </TouchableOpacity>

            <Text style={styles.warning}>
              SMS messages are sent only to customers with verified
              consent who have not opted out. SMS charges may apply.
            </Text>
          </View>
        </>
      )}

      <Text style={styles.footer}>
        Mtombeni Chicken Business
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: CREAM
  },

  container: {
    padding: 20,
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
    elevation: 3
  },

  logo: {
    fontSize: 48,
    marginBottom: 10
  },

  heading: {
    color: GREEN,
    fontSize: 22,
    fontWeight: "bold",
    textAlign: "center"
  },

  subtitle: {
    color: MUTED,
    fontSize: 13,
    marginTop: 8,
    lineHeight: 20,
    textAlign: "center"
  },

  summaryRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 12
  },

  summaryCard: {
    flex: 1,
    backgroundColor: WHITE,
    padding: 18,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: BORDER,
    alignItems: "center"
  },

  summaryNumber: {
    color: GREEN,
    fontSize: 27,
    fontWeight: "bold"
  },

  summaryLabel: {
    color: MUTED,
    fontSize: 12,
    marginTop: 5,
    textAlign: "center"
  },

  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12
  },

  sectionTitle: {
    color: GREEN,
    fontSize: 19,
    fontWeight: "bold",
    marginBottom: 12
  },

  countText: {
    color: MUTED,
    fontSize: 12
  },

  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: WHITE,
    borderWidth: 1,
    borderColor: INPUT_BORDER,
    borderRadius: 12,
    paddingHorizontal: 13,
    marginBottom: 14
  },

  searchInput: {
    flex: 1,
    height: 48,
    marginLeft: 8,
    color: LABEL
  },

  customerCard: {
    backgroundColor: WHITE,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 14,
    padding: 13,
    marginBottom: 10,
    flexDirection: "row",
    alignItems: "flex-start"
  },

  customerIcon: {
    width: 43,
    height: 43,
    borderRadius: 12,
    backgroundColor: INPUT_BG,
    borderWidth: 1,
    borderColor: INPUT_BORDER,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 11
  },

  customerInfo: {
    flex: 1
  },

  customerName: {
    color: LABEL,
    fontSize: 14,
    fontWeight: "bold"
  },

  phone: {
    color: MUTED,
    fontSize: 12,
    marginTop: 4
  },

  purchaseCount: {
    color: MUTED,
    fontSize: 11,
    marginTop: 4
  },

  statusBadge: {
    alignSelf: "flex-start",
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: 8,
    marginTop: 8
  },

  eligibleBadge: {
    backgroundColor: "#E4F1E5"
  },

  notEligibleBadge: {
    backgroundColor: "#F5E8E5"
  },

  statusText: {
    fontSize: 10,
    fontWeight: "bold"
  },

  eligibleText: {
    color: GREEN
  },

  notEligibleText: {
    color: "#A33B32"
  },

  actionRow: {
    flexDirection: "row",
    marginTop: 10
  },

  consentButton: {
    backgroundColor: GREEN,
    paddingVertical: 9,
    paddingHorizontal: 12,
    borderRadius: 8,
    minWidth: 125,
    alignItems: "center"
  },

  optOutButton: {
    backgroundColor: "#A33B32",
    paddingVertical: 9,
    paddingHorizontal: 12,
    borderRadius: 8,
    minWidth: 100,
    alignItems: "center"
  },

  actionButtonText: {
    color: WHITE,
    fontSize: 11,
    fontWeight: "bold"
  },

  emptyCard: {
    backgroundColor: WHITE,
    padding: 25,
    borderRadius: 14,
    alignItems: "center",
    marginBottom: 20
  },

  emptyText: {
    color: MUTED,
    marginTop: 10
  },

  messageCard: {
    backgroundColor: WHITE,
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: BORDER
  },

  label: {
    color: LABEL,
    fontSize: 14,
    fontWeight: "bold",
    marginBottom: 10
  },

  messageInput: {
    minHeight: 125,
    backgroundColor: INPUT_BG,
    borderWidth: 1,
    borderColor: INPUT_BORDER,
    borderRadius: 12,
    padding: 13,
    color: LABEL,
    fontSize: 14
  },

  characterCount: {
    color: MUTED,
    fontSize: 11,
    textAlign: "right",
    marginTop: 7
  },

  recipientBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: INPUT_BG,
    borderRadius: 10,
    padding: 13,
    marginTop: 18,
    gap: 10
  },

  recipientText: {
    color: GREEN,
    fontSize: 13,
    fontWeight: "bold"
  },

  sendButton: {
    backgroundColor: GOLD,
    borderRadius: 12,
    padding: 16,
    marginTop: 17,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 9
  },

  disabledButton: {
    opacity: 0.5
  },

  sendButtonText: {
    color: WHITE,
    fontSize: 15,
    fontWeight: "bold"
  },

  warning: {
    color: MUTED,
    fontSize: 11,
    lineHeight: 17,
    marginTop: 12,
    textAlign: "center"
  },

  footer: {
    textAlign: "center",
    color: FOOTER,
    fontSize: 12,
    marginTop: 22
  }
});






