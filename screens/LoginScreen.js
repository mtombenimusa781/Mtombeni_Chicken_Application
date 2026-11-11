
import React, { useState, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView
} from "react-native";

import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "../Config/firebase";

export default function LoginScreen({ navigation }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const scrollViewRef = useRef(null);

  const handleLogin = async () => {
    if (!email.trim() || !password) {
      Alert.alert(
        "Missing details",
        "Please enter your email address and password."
      );
      return;
    }

    try {
      setLoading(true);

      await signInWithEmailAndPassword(
        auth,
        email.trim(),
        password
      );

    } catch (error) {
      let message = "Something went wrong. Please try again.";

      if (error.code === "auth/invalid-credential") {
        message = "Incorrect email or password. Please check your details.";
      } else if (error.code === "auth/invalid-email") {
        message = "Please enter a valid email address.";
      } else if (error.code === "auth/user-disabled") {
        message = "This account has been disabled.";
      } else if (error.code === "auth/too-many-requests") {
        message = "Too many attempts. Please wait before trying again.";
      } else if (error.code === "auth/network-request-failed") {
        message = "Network error. Check your internet connection.";
      }

      Alert.alert("Login failed", message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={Platform.OS === "ios" ? 20 : 0}
    >
      <ScrollView
        ref={scrollViewRef}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.logoContainer}>
          <Text style={styles.logo}>🐔</Text>

          <Text style={styles.title}>
            Mtombeni Chicken Business
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.heading}>Welcome Back</Text>

          <Text style={styles.description}>
            Sign in to access your account.
          </Text>

          {/* EMAIL */}
          <Text style={styles.label}>Email Address</Text>

          <TextInput
            style={styles.input}
            placeholder="Enter your email"
            placeholderTextColor="#888888"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            editable={!loading}
            returnKeyType="next"
          />

          {/* PASSWORD */}
          <Text style={styles.label}>Password</Text>

          <View style={styles.passwordContainer}>
            <TextInput
              style={styles.passwordInput}
              placeholder="Enter your password"
              placeholderTextColor="#888888"
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
              autoCapitalize="none"
              autoCorrect={false}
              editable={!loading}
              onFocus={() => {
                scrollViewRef.current?.scrollTo({
                  y: 150,
                  animated: true
                });
              }}
              onSubmitEditing={handleLogin}
              returnKeyType="go"
            />

            <TouchableOpacity
              style={styles.showPasswordButton}
              onPress={() => setShowPassword(!showPassword)}
              disabled={loading}
            >
              <Text style={styles.showPasswordText}>
                {showPassword ? "Hide" : "Show"}
              </Text>
            </TouchableOpacity>
          </View>

          {/* LOGIN BUTTON */}
          <TouchableOpacity
            style={[
              styles.loginButton,
              loading && styles.disabledButton
            ]}
            onPress={handleLogin}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.loginButtonText}>
                Sign In
              </Text>
            )}
          </TouchableOpacity>

          {/* REGISTER */}
          <View style={styles.registerContainer}>
            <Text style={styles.registerText}>
              Need a staff account?
            </Text>

            <TouchableOpacity
              onPress={() => navigation.navigate("Register")}
              disabled={loading}
            >
              <Text style={styles.registerLink}>
                {" "}Register
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        <Text style={styles.footer}>
          Mtombeni Chicken Business | Business Management
        </Text>

      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F4F1E8"
  },

  scrollContent: {
    flexGrow: 1,
    justifyContent: "center",
    padding: 24
  },

  logoContainer: {
    alignItems: "center",
    marginBottom: 32
  },

  logo: {
    fontSize: 72,
    marginBottom: 12
  },

  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#245C38",
    textAlign: "center",
    letterSpacing: 1
  },

  subtitle: {
    fontSize: 14,
    color: "#8B5E3C",
    marginTop: 8,
    textAlign: "center"
  },

  card: {
    backgroundColor: "#FFFFFF",
    padding: 25,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#E8E2D5",
    elevation: 4,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 8
  },

  heading: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#245C38",
    marginBottom: 8
  },

  description: {
    color: "#7A817A",
    fontSize: 14,
    marginBottom: 25
  },

  label: {
    fontSize: 14,
    fontWeight: "700",
    color: "#354638",
    marginBottom: 9
  },

  input: {
    height: 52,
    borderWidth: 1,
    borderColor: "#DDD8CA",
    borderRadius: 12,
    paddingHorizontal: 15,
    fontSize: 15,
    color: "#26372B",
    backgroundColor: "#FCFBF8",
    marginBottom: 19
  },

  passwordContainer: {
    height: 52,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#DDD8CA",
    borderRadius: 12,
    backgroundColor: "#FCFBF8",
    marginBottom: 19
  },

  passwordInput: {
    flex: 1,
    height: 52,
    paddingHorizontal: 15,
    fontSize: 15,
    color: "#26372B"
  },

  showPasswordButton: {
    paddingHorizontal: 15,
    height: 52,
    justifyContent: "center"
  },

  showPasswordText: {
    color: "#245C38",
    fontSize: 14,
    fontWeight: "bold"
  },

  loginButton: {
    height: 54,
    backgroundColor: "#af7c0f",
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
    borderBottomWidth: 3,
    borderBottomColor: "#af7c0f"
  },

  disabledButton: {
    opacity: 0.6
  },

  loginButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "bold",
    letterSpacing: 0.5
  },

  registerContainer: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 24,
    flexWrap: "wrap"
  },

  registerText: {
    color: "#7A817A",
    fontSize: 14
  },


  
  registerLink: {
    color: "#245C38",
    fontSize: 14,
    fontWeight: "bold"
  },

  footer: {
    textAlign: "center",
    color: "#9A9A8E",
    fontSize: 12,
    marginTop: 26
  }
});
