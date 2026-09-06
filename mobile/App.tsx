import React from "react";
import { Pressable, Text } from "react-native";
import { StatusBar } from "expo-status-bar";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { LiveMatchesScreen } from "./src/screens/LiveMatches";
import { MatchDetailScreen } from "./src/screens/MatchDetail";
import { SearchScreen } from "./src/screens/Search";

const Stack = createNativeStackNavigator();

export default function App() {
  return (
    <NavigationContainer>
      <StatusBar style="light" />
      <Stack.Navigator screenOptions={{ headerStyle: { backgroundColor: "#05070a" }, headerTintColor: "#fff" }}>
        <Stack.Screen
          name="LiveMatches"
          component={LiveMatchesScreen}
          options={({ navigation }) => ({
            title: "En vivo",
            headerRight: () => (
              <Pressable onPress={() => navigation.navigate("Search")}>
                <Text style={{ color: "#ffffff", fontSize: 14 }}>Buscar</Text>
              </Pressable>
            ),
          })}
        />
        <Stack.Screen name="MatchDetail" component={MatchDetailScreen} options={{ title: "Partido" }} />
        <Stack.Screen name="Search" component={SearchScreen} options={{ title: "Buscar" }} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
