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
import { OwnerPartnersScreen } from "../screens/owner/OwnerPartnersScreen";
import { RentalContractEditScreen } from "../screens/owner/RentalContractEditScreen";
import { RentalInspectionFormScreen } from "../screens/owner/RentalInspectionFormScreen";
import { RentalInstructionsScreen } from "../screens/owner/RentalInstructionsScreen";
import { VehicleFormScreen } from "../screens/owner/VehicleFormScreen";
import { VehiclePhotosScreen } from "../screens/owner/VehiclePhotosScreen";
import { RentalDetailScreen } from "../screens/rental/RentalDetailScreen";
import { AccountDeletionScreen } from "../screens/legal/AccountDeletionScreen";
import { AccountPrivacyScreen } from "../screens/legal/AccountPrivacyScreen";
import { PrivacyAcceptanceScreen } from "../screens/legal/PrivacyAcceptanceScreen";
import { PrivacyPolicyScreen } from "../screens/legal/PrivacyPolicyScreen";
import { TermsAcceptanceScreen } from "../screens/legal/TermsAcceptanceScreen";
import { TermsOfUseScreen } from "../screens/legal/TermsOfUseScreen";
import { UserReviewsScreen } from "../screens/reviews/UserReviewsScreen";
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
  const needsPrivacy =
    authed && user?.needsPrivacyPolicyAcceptance === true;
  const needsTerms = authed && user?.needsTermsOfUseAcceptance === true;
  const initialRouteName = !authed
    ? "Login"
    : needsPrivacy
      ? "PrivacyAcceptance"
      : needsTerms
        ? "TermsAcceptance"
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
        <Stack.Screen
          name="PrivacyPolicy"
          component={PrivacyPolicyScreen}
          options={{ title: "Política de Privacidade" }}
        />
        <Stack.Screen
          name="TermsOfUse"
          component={TermsOfUseScreen}
          options={{ title: "Termos de uso" }}
        />
        <Stack.Screen
          name="PrivacyAcceptance"
          component={PrivacyAcceptanceScreen}
          options={{
            title: "Privacidade",
            headerBackVisible: false,
            gestureEnabled: false,
          }}
        />
        <Stack.Screen
          name="TermsAcceptance"
          component={TermsAcceptanceScreen}
          options={{
            title: "Termos de uso",
            headerBackVisible: false,
            gestureEnabled: false,
          }}
        />
        <Stack.Screen
          name="AccountPrivacy"
          component={AccountPrivacyScreen}
          options={{ title: "Privacidade e conta" }}
        />
        <Stack.Screen
          name="AccountDeletion"
          component={AccountDeletionScreen}
          options={{ title: "Excluir conta" }}
        />
        <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} options={{ title: "Esqueci a senha" }} />
        <Stack.Screen name="ResetPassword" component={ResetPasswordScreen} options={{ title: "Redefinir senha" }} />
        <Stack.Screen name="OwnerHome" component={OwnerHomeScreen} options={{ title: "Início" }} />
        <Stack.Screen name="OwnerProfile" component={OwnerProfileScreen} options={{ title: "Perfil" }} />
        <Stack.Screen
          name="OwnerProfileEdit"
          component={OwnerProfileEditScreen}
          options={{ title: "Editar perfil" }}
        />
        <Stack.Screen
          name="OwnerContractTemplate"
          component={OwnerContractTemplateScreen}
          options={{ title: "Modelo de contrato" }}
        />
        <Stack.Screen name="OwnerVehicles" component={OwnerVehiclesScreen} options={{ title: "Veículos" }}  />
        <Stack.Screen
          name="OwnerPartners"
          component={OwnerPartnersScreen}
          options={{ title: "Parceiros" }}
        />
        <Stack.Screen name="VehicleForm" component={VehicleFormScreen} options={{ title: "Cadastrar veículo" }} />
        <Stack.Screen name="VehiclePhotos" component={VehiclePhotosScreen} options={{ title: "Fotos do veículo" }} />
        <Stack.Screen
          name="OwnerPendingDrivers"
          component={OwnerPendingDriversScreen}
          options={{ title: "Motoristas pendentes" }}
        />
        <Stack.Screen
          name="OwnerDriverProfile"
          component={OwnerDriverProfileScreen}
          options={{ title: "Análise do cadastro" }}
        />
        <Stack.Screen name="OwnerRentals" component={OwnerRentalsScreen} options={{ title: "Solicitações de locação" }}   />
        <Stack.Screen name="OwnerRentalDetail" component={OwnerRentalDetailScreen} options={{ title: "Detalhes da solicitação" }} />
        <Stack.Screen
          name="RentalInstructions"
          component={RentalInstructionsScreen}
          options={{ title: "Retirada e contrato" }}
        />
        <Stack.Screen
          name="RentalContractEdit"
          component={RentalContractEditScreen}
          options={{ title: "Editar contrato" }}
        />
        <Stack.Screen
          name="RentalInspectionForm"
          component={RentalInspectionFormScreen}
          options={{ title: "Vistoria" }}
        />
        <Stack.Screen name="DriverHome" component={DriverHomeScreen} options={{ title: "Início" }} />
        <Stack.Screen
          name="DriverPreRegister"
          component={DriverPreRegisterScreen}
          options={{ title: "Cadastro de motorista" }}
        />
        <Stack.Screen name="DriverStatus" component={DriverStatusScreen} options={{ title: "Situação motorista" }} />
        <Stack.Screen name="DriverRentals" component={DriverRentalsScreen} options={{ title: "Solicitações de locação" }} />
        <Stack.Screen name="Marketplace" component={MarketplaceScreen} options={{ title: "Veículos disponíveis" }} />
        <Stack.Screen name="VehicleDetail" component={VehicleDetailScreen} options={{ title: "Detalhes do veículo" }} />
        <Stack.Screen
          name="UserReviews"
          component={UserReviewsScreen}
          options={({ route }) => ({ title: route.params.title })}
        />
        <Stack.Screen name="RentalDetail" component={RentalDetailScreen} options={{ title: "Detalhes da locação" }} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
});
