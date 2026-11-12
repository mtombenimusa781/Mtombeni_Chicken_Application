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

import { createUserWithEmailAndPassword } from "firebase/auth";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { auth, db } from "../Config/firebase";

export default function RegisterScreen({ navigation }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const scrollViewRef = useRef(null);

  const handleRegister = async () => {
    if (!name.trim() || !email.trim() || !password) {
      Alert.alert("Missing details", "Please fill in all fields.");
      return;
    }

    if (password.length < 6) {
      Alert.alert(
        "Weak password",
        "Your password must contain at least 6 characters."
      );
      return;
    }

    try {
      setLoading(true);

      const result = await createUserWithEmailAndPassword(
        auth,
        email.trim(),
        password
      );

      await setDoc(doc(db, "users", result.user.uid), {
        name: name.trim(),
        email: email.trim(),
        role: "staff",
        createdAt: serverTimestamp()
      });

      Alert.alert("Success", "Staff account created successfully.", [
        {
          text: "OK",
          onPress: () => navigation.goBack()
        }
      ]);
    } catch (error) {
      Alert.alert(
        "Registration failed",
        error.code === "auth/email-already-in-use"
          ? "This email address is already registered."
          : error.message
      );
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

          <Text style={styles.title}>Mtombeni Chicken Business</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.heading}>Register Staff</Text>

          <Text style={styles.description}>
            Create a new staff account.
          </Text>

          {/* FULL NAME */}
          <Text style={styles.label}>Full Name</Text>

          <TextInput
            style={styles.input}
            placeholder="Enter your full name"
            placeholderTextColor="#888888"
            value={name}
            onChangeText={setName}
            autoCapitalize="words"
            editable={!loading}
            returnKeyType="next"
          />

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
              placeholder="Minimum 6 characters"
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
              onSubmitEditing={handleRegister}
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

          {/* REGISTER BUTTON */}
          <TouchableOpacity
            style={[styles.registerButton, loading && styles.disabledButton]}
            onPress={handleRegister}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.registerButtonText}>
                Create Staff Account
              </Text>
            )}
          </TouchableOpacity>

          {/* BACK TO LOGIN */}
          <View style={styles.loginContainer}>
            <Text style={styles.loginText}>Already have an account?</Text>

            <TouchableOpacity
              onPress={() => navigation.goBack()}
              disabled={loading}
            >
              <Text style={styles.loginLink}> Sign In</Text>
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

  registerButton: {
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

  registerButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "bold",
    letterSpacing: 0.5
  },

  loginContainer: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 24,
    flexWrap: "wrap"
  },

  loginText: {
    color: "#7A817A",
    fontSize: 14
  },

  loginLink: {
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