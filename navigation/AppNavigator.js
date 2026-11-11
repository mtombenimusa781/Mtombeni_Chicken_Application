
import React, { useEffect, useState } from "react";
import {View,Text,ActivityIndicator,StyleSheet,Alert,useWindowDimensions} from "react-native";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createDrawerNavigator } from "@react-navigation/drawer";
import { auth, db } from "../Config/firebase";
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

const Stack = createNativeStackNavigator();
const Drawer = createDrawerNavigator();
const GREEN = "#245C38";
const LIGHT_GREEN = "#F4F8F2";
const ACTIVE_GREEN = "#E4F1E5";

function AuthStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: GREEN },
        headerTintColor: "#FFFFFF",
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
        options={{ title: "Register Staff" }}
      />
    </Stack.Navigator>
  );
}

function LogoutScreen() {
  useEffect(() => {
    signOut(auth).catch(error => {
      Alert.alert("Logout failed", error.message);
    });
  }, []);

  return (
    <View style={styles.loading}>
      <ActivityIndicator size="large" color={GREEN} />
      <Text style={styles.message}>Signing out...</Text>
    </View>
  );
}

function BusinessDrawer({ role }) {
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
          backgroundColor: GREEN
        },
        headerTintColor: "#FFFFFF",
        headerTitle: "Mtombeni Chickens🐔",
        headerTitleStyle: {
          fontWeight: "bold",
          fontSize: 17
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
          drawerLabel: "Dashboard"
        }}
      />

      <Drawer.Screen
        name="Batches"
        component={BatchesScreen}
        options={{
          title: "Chicken Batches",
          drawerLabel: "Chicken Batches"
        }}
      />

      <Drawer.Screen
        name="BatchDetails"
        component={BatchDetailsScreen}
        options={{
          title: "Batch Details",
          drawerItemStyle: { display: "none" }
        }}
      />

      {isStaff && (
        <>
          <Drawer.Screen
            name="AddSale"
            component={AddSaleScreen}
            options={{
              title: "Record Sales",
              drawerLabel: "Record Chicken Sales"
            }}
          />

          <Drawer.Screen
            name="RecordDeath"
            component={RecordDeathScreen}
            options={{
              title: "Record Chicken Deaths",
              drawerLabel: "Record Deaths"
            }}
          />

          <Drawer.Screen
            name="DailyRecords"
            component={DailyRecordsScreen}
            options={{
              title: "Daily Batch Records",
              drawerLabel: "Daily Records"
            }}
          />

          <Drawer.Screen
            name="AddExpense"
            component={AddExpenseScreen}
            options={{
              title: "Business Expenses",
              drawerLabel: "Record Expenses"
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
              title: "Chicken Death Records",
              drawerItemStyle: { display: "none" }
            }}
          />

          <Drawer.Screen
            name="DailyRecords"
            component={DailyRecordsScreen}
            options={{
              title: "Daily Batch Records",
              drawerItemStyle: { display: "none" }
            }}
          />

          <Drawer.Screen
            name="AddExpense"
            component={AddExpenseScreen}
            options={{
              title: "Business Expenses",
              drawerItemStyle: { display: "none" }
            }}
          />
                  <Drawer.Screen
          name="StaffManagement"
          component={StaffManagementScreen}
          options={{
            title: "Staff Management",
            drawerLabel: "Staff Management"
          }}
        />

        <Drawer.Screen
          name="StaffActivity"
          component={StaffActivityScreen}
          options={{
            title: "Staff Activity",
            drawerItemStyle: { display: "none" }
          }}
        />
        </>
      )}

      <Drawer.Screen
        name="Logout"
        component={LogoutScreen}
        options={{
          title: "Log Out",
          drawerLabel: "Log Out"
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
            "Profile not found",
            "Your account profile is missing."
          );
          await signOut(auth);
          return;
        }

        const userRole = snapshot.data().role;

        if (userRole !== "admin" && userRole !== "staff") {
          Alert.alert(
            "Invalid role",
            "Your role must be admin or staff."
          );
          await signOut(auth);
          return;
        }

        setRole(userRole);
      } catch (error) {
        console.log("Account error:", error.code, error.message);
        Alert.alert("Account error", error.message);
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

      <Text style={styles.splashTitle}>
        MTOMBENI CHICKENS
      </Text>

      <Text style={styles.splashSubtitle}>
        Quality Chickens, Better Business
      </Text>

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
      <Text style={styles.message}>
        Loading Mtombeni Chickens...
      </Text>
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
  marginTop: 10
},

splashLoader: {
  marginTop: 35
},
});
