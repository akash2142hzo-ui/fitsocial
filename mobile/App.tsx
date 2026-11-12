import { StatusBar } from "expo-status-bar";
import { StyleSheet, Text, View } from "react-native";

export default function App() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>FitSocial</Text>
      <Text style={styles.subtitle}>Mobile bootstrap is running.</Text>
      <StatusBar style="auto" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    backgroundColor: "#ffffff",
    flex: 1,
    justifyContent: "center",
    padding: 24,
  },
  title: {
    color: "#111827",
    fontSize: 32,
    fontWeight: "700",
  },
  subtitle: {
    color: "#4b5563",
    fontSize: 16,
    marginTop: 8,
  },
});
