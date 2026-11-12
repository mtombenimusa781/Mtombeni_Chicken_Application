import React, { useEffect, useState, useRef } from "react";
import {
  View,
  Text,
  ActivityIndicator,
  StyleSheet,
  Alert,
  useWindowDimensions
} from "react-native";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createDrawerNavigator } from "@react-navigation/drawer";
import { auth, db } from "../Config/firebase";
import { useLanguage } from "../context/LanguageContext";
import LoginScreen from "../screens/LoginScreen";
import RegisterScreen from "../screens/RegisterScreen";
import StaffDashboard from "../screens/StaffDashboard";
import AdminDashboard from "../screens/AdminDashboard";
import AddSaleScreen from "../screens/AddSaleScreen";
import AddExpenseScreen from "../screens/AddExpenseScreen";
import BatchesScreen from "../screens/BatchesScreen";
import BatchDetailsScreen from "../screens/BatchDetailsScreen";
import RecordDeathScreen from "../screens/RecordDeathScreen";
import DailyRecordsScreen from "../screens/DailyRecordsScreen";
import StaffManagementScreen from "../screens/StaffManagementScreen";
import StaffActivityScreen from "../screens/StaffActivityScreen";
import SettingsScreen from "../screens/SettingsScreen";
import CustomerNotificationsScreen from "../screens/CustomerNotificationsScreen";

const Stack = createNativeStackNavigator();
const Drawer = createDrawerNavigator();

/* Same palette as LoginScreen */
const GREEN = "#245C38";
const LIGHT_GREEN = "#F4F1E8";
const ACTIVE_GREEN = "#F4F1E8";
const BORDER = "#E8E2D5";

function AuthStack() {
  const { t } = useLanguage();

  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: LIGHT_GREEN },
        headerTintColor: GREEN,
        headerShadowVisible: false,
        headerTitleStyle: { fontWeight: "bold" },
        contentStyle: { backgroundColor: LIGHT_GREEN }
      }}
    >
      <Stack.Screen
        name="Login"
        component={LoginScreen}
        options={{ headerShown: false }}
      />

      <Stack.Screen
        name="Register"
        component={RegisterScreen}
        options={{ title: t("registerStaff") }}
      />
    </Stack.Navigator>
  );
}

function LogoutScreen() {
  const { t } = useLanguage();

  useEffect(() => {
    signOut(auth).catch(error => {
      Alert.alert(t("logoutFailed"), error.message);
    });
  }, []);

  return (
    <View style={styles.loading}>
      <ActivityIndicator size="large" color={GREEN} />
      <Text style={styles.message}>{t("signingOut")}</Text>
    </View>
  );
}

function BusinessDrawer({ role }) {
  const { t } = useLanguage();
  const { width } = useWindowDimensions();
  const isLargeScreen = width >= 768;
  const isStaff = role === "staff";
  const isAdmin = role === "admin";

  return (
    <Drawer.Navigator
      key={role}
      initialRouteName="Dashboard"
      screenOptions={{
        drawerType: isLargeScreen ? "permanent" : "front",
        drawerPosition: "left",
        swipeEnabled: !isLargeScreen,
        overlayColor: "rgba(0,0,0,0.35)",

        headerStyle: {
          backgroundColor: LIGHT_GREEN,
          elevation: 0,
          shadowOpacity: 0,
          borderBottomWidth: 1,
          borderBottomColor: BORDER
        },
        headerTintColor: GREEN,
        headerTitle: "Mtombeni Chickens🐔",
        headerTitleStyle: {
          fontWeight: "bold",
          fontSize: 17,
          color: GREEN
        },

        drawerStyle: {
          width: isLargeScreen ? 250 : 285,
          backgroundColor: "#FFFFFF"
        },

        drawerActiveTintColor: GREEN,
        drawerInactiveTintColor: "#47564B",
        drawerActiveBackgroundColor: ACTIVE_GREEN,

        drawerLabelStyle: {
          fontSize: 15,
          fontWeight: "600",
          marginLeft: -5
        },

        drawerItemStyle: {
          borderRadius: 10,
          marginHorizontal: 10,
          marginVertical: 4
        },

        sceneStyle: {
          backgroundColor: LIGHT_GREEN
        }
      }}
    >
      <Drawer.Screen
        name="Dashboard"
        component={isAdmin ? AdminDashboard : StaffDashboard}
        options={{
          title: "Mtombeni Chickens🐔",
          drawerLabel: t("navDashboard")
        }}
      />

      <Drawer.Screen
        name="Batches"
        component={BatchesScreen}
        options={{
          title: t("chickenBatches"),
          drawerLabel: t("chickenBatches")
        }}
      />

      <Drawer.Screen
        name="BatchDetails"
        component={BatchDetailsScreen}
        options={{
          title: t("batchDetailsTitle"),
          drawerItemStyle: { display: "none" }
        }}
      />

      {isStaff && (
        <>
          <Drawer.Screen
            name="AddSale"
            component={AddSaleScreen}
            options={{
              title: t("recordSalesTitle"),
              drawerLabel: t("recordSales")
            }}
          />

          <Drawer.Screen
            name="RecordDeath"
            component={RecordDeathScreen}
            options={{
              title: t("recordDeaths"),
              drawerLabel: t("recordDeathsLabel")
            }}
          />

          <Drawer.Screen
            name="DailyRecords"
            component={DailyRecordsScreen}
            options={{
              title: t("dailyRecordsTitle"),
              drawerLabel: t("dailyRecords")
            }}
          />

          <Drawer.Screen
            name="AddExpense"
            component={AddExpenseScreen}
            options={{
              title: t("expensesTitle"),
              drawerLabel: t("recordExpensesLabel")
            }}
          />
        </>
      )}

      {isAdmin && (
        <>
          <Drawer.Screen
            name="RecordDeath"
            component={RecordDeathScreen}
            options={{
              title: t("recordDeaths"),
              drawerItemStyle: { display: "none" }
            }}
          />

          <Drawer.Screen
            name="DailyRecords"
            component={DailyRecordsScreen}
            options={{
              title: t("dailyRecordsTitle"),
              drawerItemStyle: { display: "none" }
            }}
          />

          <Drawer.Screen
            name="AddExpense"
            component={AddExpenseScreen}
            options={{
              title: t("expensesTitle"),
              drawerItemStyle: { display: "none" }
            }}
          />

          <Drawer.Screen
            name="StaffManagement"
            component={StaffManagementScreen}
            options={{
              title: t("staffManagement"),
              drawerLabel: t("staffManagement")
            }}
          />

          <Drawer.Screen
            name="StaffActivity"
            component={StaffActivityScreen}
            options={{
              title: t("staffActivityTitle"),
              drawerItemStyle: { display: "none" }
            }}
          />
          <Drawer.Screen
            name="CustomerNotifications"
            component={CustomerNotificationsScreen}
            options={{
              title: "Customer Notifications",
              drawerItemStyle: { display: "none" }
            }}
          />
        </>
      )}

      <Drawer.Screen
        name="Settings"
        component={SettingsScreen}
        options={{
          title: t("settings"),
          drawerLabel: t("settings")
        }}
      />

      <Drawer.Screen
        name="Logout"
        component={LogoutScreen}
        options={{
          title: t("logOut"),
          drawerLabel: t("logOut")
        }}
      />
    </Drawer.Navigator>
  );
}

export default function AppNavigator() {
  const [user, setUser] = useState(null);
  const [role, setRole] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showSplash, setShowSplash] = useState(true);

  const { t } = useLanguage();

  // Keeps the latest translator available inside the auth listener
  const tRef = useRef(t);
  tRef.current = t;

  useEffect(() => {
    const timer = setTimeout(() => {
      setShowSplash(false);
    }, 4000);

    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async currentUser => {
      setLoading(true);
      setUser(currentUser);
      setRole(null);

      if (!currentUser) {
        setLoading(false);
        return;
      }

      try {
        const userRef = doc(db, "users", currentUser.uid);
        const snapshot = await getDoc(userRef);

        if (!snapshot.exists()) {
          Alert.alert(
            tRef.current("profileNotFound"),
            tRef.current("profileMissing")
          );
          await signOut(auth);
          return;
        }

        const userRole = snapshot.data().role;

        if (userRole !== "admin" && userRole !== "staff") {
          Alert.alert(
            tRef.current("invalidRole"),
            tRef.current("invalidRoleMsg")
          );
          await signOut(auth);
          return;
        }

        setRole(userRole);
      } catch (error) {
        console.log("Account error:", error.code, error.message);
        Alert.alert(tRef.current("accountError"), error.message);
        await signOut(auth);
      } finally {
        setLoading(false);
      }
    });

    return unsubscribe;
  }, []);

  if (showSplash) {
    return (
      <View style={styles.splashContainer}>
        <Text style={styles.chicken}>🐔</Text>

        <Text style={styles.splashTitle}>MTOMBENI CHICKENS</Text>

        <Text style={styles.splashSubtitle}>{t("splashSubtitle")}</Text>

        <ActivityIndicator
          size="large"
          color={GREEN}
          style={styles.splashLoader}
        />
      </View>
    );
  }

  if (loading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={GREEN} />
        <Text style={styles.message}>{t("loading")}</Text>
      </View>
    );
  }

  return (
    <NavigationContainer>
      {user && role ? (
        <BusinessDrawer key={`${user.uid}-${role}`} role={role} />
      ) : (
        <AuthStack />
      )}
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: LIGHT_GREEN
  },

  message: {
    marginTop: 12,
    color: GREEN,
    fontSize: 15
  },

  splashContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#FFFFFF"
  },

  chicken: {
    fontSize: 100,
    marginBottom: 20
  },

  splashTitle: {
    fontSize: 25,
    fontWeight: "bold",
    color: GREEN,
    letterSpacing: 1,
    textAlign: "center"
  },

  splashSubtitle: {
    fontSize: 14,
    color: "#647568",
    marginTop: 10,
    textAlign: "center",
    paddingHorizontal: 24
  },

  splashLoader: {
    marginTop: 35
  }
});