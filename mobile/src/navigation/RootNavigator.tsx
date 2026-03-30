import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { useAuth } from "../hooks/AuthContext";
import { ForgotPasswordScreen } from "../screens/auth/ForgotPasswordScreen";
import { LoginScreen } from "../screens/auth/LoginScreen";
import { ResetPasswordScreen } from "../screens/auth/ResetPasswordScreen";
import { SignupScreen } from "../screens/auth/SignupScreen";
import { DriverHomeScreen } from "../screens/driver/DriverHomeScreen";
import { DriverPreRegisterScreen } from "../screens/driver/DriverPreRegisterScreen";
import { DriverRentalsScreen } from "../screens/driver/DriverRentalsScreen";
import { DriverStatusScreen } from "../screens/driver/DriverStatusScreen";
import { MarketplaceScreen } from "../screens/marketplace/MarketplaceScreen";
import { VehicleDetailScreen } from "../screens/marketplace/VehicleDetailScreen";
import { OwnerHomeScreen } from "../screens/owner/OwnerHomeScreen";
import { OwnerPendingDriversScreen } from "../screens/owner/OwnerPendingDriversScreen";
import { OwnerDriverProfileScreen } from "../screens/owner/OwnerDriverProfileScreen";
import { OwnerProfileScreen } from "../screens/owner/OwnerProfileScreen";
import { OwnerContractTemplateScreen } from "../screens/owner/OwnerContractTemplateScreen";
import { OwnerProfileEditScreen } from "../screens/owner/OwnerProfileEditScreen";
import { OwnerRentalsScreen } from "../screens/owner/OwnerRentalsScreen";
import { OwnerRentalDetailScreen } from "../screens/owner/OwnerRentalDetailScreen";
import { OwnerVehiclesScreen } from "../screens/owner/OwnerVehiclesScreen";
import { RentalInstructionsScreen } from "../screens/owner/RentalInstructionsScreen";
import { VehicleFormScreen } from "../screens/owner/VehicleFormScreen";
import { VehiclePhotosScreen } from "../screens/owner/VehiclePhotosScreen";
import { RentalDetailScreen } from "../screens/rental/RentalDetailScreen";
import type { RootStackParamList } from "./types";

const Stack = createNativeStackNavigator<RootStackParamList>();

export function RootNavigator() {
  const { token, user, sessionLoading } = useAuth();

  if (sessionLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  const authed = !!(token && user);
  const navKey = authed ? `${user!.role}-${user!.id}` : "guest";
  const initialRouteName = !authed
    ? "Login"
    : user!.role === "OWNER"
      ? "OwnerHome"
      : "DriverHome";

  return (
    <NavigationContainer key={navKey}>
      <Stack.Navigator
        key={navKey}
        initialRouteName={initialRouteName}
        screenOptions={{
          headerTitleStyle: { fontWeight: "600" },
        }}
      >
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="Signup" component={SignupScreen} />
        <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
        <Stack.Screen name="ResetPassword" component={ResetPasswordScreen} />
        <Stack.Screen name="OwnerHome" component={OwnerHomeScreen} />
        <Stack.Screen name="OwnerProfile" component={OwnerProfileScreen} />
        <Stack.Screen
          name="OwnerProfileEdit"
          component={OwnerProfileEditScreen}
        />
        <Stack.Screen
          name="OwnerContractTemplate"
          component={OwnerContractTemplateScreen}
          options={{ title: "Template de contrato" }}
        />
        <Stack.Screen name="OwnerVehicles" component={OwnerVehiclesScreen} />
        <Stack.Screen name="VehicleForm" component={VehicleFormScreen} />
        <Stack.Screen name="VehiclePhotos" component={VehiclePhotosScreen} />
        <Stack.Screen
          name="OwnerPendingDrivers"
          component={OwnerPendingDriversScreen}
        />
        <Stack.Screen
          name="OwnerDriverProfile"
          component={OwnerDriverProfileScreen}
          options={{ title: "Análise do cadastro" }}
        />
        <Stack.Screen name="OwnerRentals" component={OwnerRentalsScreen} />
        <Stack.Screen name="OwnerRentalDetail" component={OwnerRentalDetailScreen} />
        <Stack.Screen
          name="RentalInstructions"
          component={RentalInstructionsScreen}
        />
        <Stack.Screen name="DriverHome" component={DriverHomeScreen} />
        <Stack.Screen
          name="DriverPreRegister"
          component={DriverPreRegisterScreen}
        />
        <Stack.Screen name="DriverStatus" component={DriverStatusScreen} />
        <Stack.Screen name="DriverRentals" component={DriverRentalsScreen} />
        <Stack.Screen name="Marketplace" component={MarketplaceScreen} />
        <Stack.Screen name="VehicleDetail" component={VehicleDetailScreen} />
        <Stack.Screen name="RentalDetail" component={RentalDetailScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
});
