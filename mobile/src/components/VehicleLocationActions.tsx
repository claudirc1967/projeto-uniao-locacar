import { useState } from "react";
import {
  ActionSheetIOS,
  Platform,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { Button, Dialog, Icon, Portal, Surface, Text, useTheme } from "react-native-paper";
import { appAlert } from "../utils/appAlert";
import {
  buildVehiclePickupSearchQuery,
  googleMapsSearchUrl,
  openExternalUrl,
  type VehiclePickupFields,
  wazeSearchUrl,
} from "../utils/vehicleLocationLinks";

type Props = {
  vehicle: VehiclePickupFields;
  style?: StyleProp<ViewStyle>;
};

export function VehicleLocationActions({ vehicle, style }: Props) {
  const theme = useTheme();
  const query = buildVehiclePickupSearchQuery(vehicle);
  const [dialogVisible, setDialogVisible] = useState(false);

  if (!query) return null;

  const googleUrl = googleMapsSearchUrl(query);
  const wazeUrl = wazeSearchUrl(query);

  const closeDialog = () => setDialogVisible(false);

  const openMaps = () => {
    closeDialog();
    openExternalUrl(googleUrl);
  };

  const openWaze = () => {
    closeDialog();
    openExternalUrl(wazeUrl);
  };

  const onPress = () => {
    if (Platform.OS === "web") {
      setDialogVisible(true);
      return;
    }

    if (Platform.OS === "ios") {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: ["Cancelar", "Google Maps", "Waze"],
          cancelButtonIndex: 0,
          title: "Localização do veículo",
          message: query,
        },
        (i) => {
          if (i === 1) openExternalUrl(googleUrl);
          else if (i === 2) openExternalUrl(wazeUrl);
        }
      );
      return;
    }

    appAlert("Localização do veículo", query, [
      { text: "Cancelar", style: "cancel" },
      { text: "Google Maps", onPress: () => openExternalUrl(googleUrl) },
      { text: "Waze", onPress: () => openExternalUrl(wazeUrl) },
    ]);
  };

  return (
    <>
      <Button
        mode="outlined"
        icon="map-marker-radius"
        onPress={onPress}
        style={[styles.triggerBtn, style]}
      >
        Localização do veículo
      </Button>

      {Platform.OS === "web" ? (
        <Portal>
          <Dialog
            visible={dialogVisible}
            onDismiss={closeDialog}
            style={[styles.dialog, { backgroundColor: theme.colors.surface }]}
          >
            <Dialog.Title style={styles.dialogTitle}>
              Localização do veículo
            </Dialog.Title>
            <Dialog.Content style={styles.dialogContent}>
              <Text variant="bodySmall" style={styles.dialogHint}>
                Endereço cadastrado para retirada do veículo:
              </Text>
              <Surface
                mode="outlined"
                style={[
                  styles.addressCard,
                  { borderColor: theme.colors.outlineVariant },
                ]}
              >
                <View style={styles.addressRow}>
                  <Icon source="map-marker-radius" size={22} color={theme.colors.primary} />
                  <Text
                    variant="bodyLarge"
                    style={[styles.addressText, { color: theme.colors.onSurface }]}
                  >
                    {query}
                  </Text>
                </View>
              </Surface>
              <Text variant="bodySmall" style={styles.dialogHint}>
                Abra no app de mapas de sua preferência:
              </Text>
              <Button
                mode="contained"
                icon="google-maps"
                onPress={openMaps}
                style={styles.actionBtn}
                contentStyle={styles.actionBtnContent}
              >
                Abrir no Google Maps
              </Button>
              <Button
                mode="outlined"
                icon="waze"
                onPress={openWaze}
                style={styles.actionBtn}
                contentStyle={styles.actionBtnContent}
              >
                Abrir no Waze
              </Button>
              <Button
                mode="text"
                onPress={closeDialog}
                style={styles.cancelBtn}
              >
                Cancelar
              </Button>
            </Dialog.Content>
          </Dialog>
        </Portal>
      ) : null}
    </>
  );
}

const styles = StyleSheet.create({
  triggerBtn: {
    marginTop: 12,
  },
  dialog: {
    alignSelf: "center",
    width: "100%",
    maxWidth: 420,
    marginHorizontal: 16,
    borderRadius: 16,
  },
  dialogTitle: {
    paddingBottom: 0,
  },
  dialogContent: {
    paddingTop: 4,
    gap: 12,
  },
  dialogHint: {
    opacity: 0.75,
  },
  addressCard: {
    borderRadius: 12,
    padding: 14,
  },
  addressRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
  },
  addressText: {
    flex: 1,
    lineHeight: 22,
  },
  actionBtn: {
    borderRadius: 10,
  },
  actionBtnContent: {
    height: 44,
  },
  cancelBtn: {
    marginTop: 4,
  },
});
