import { StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Marker } from "react-native-maps";

import { RiderArrowPin } from "@/components/map/rider-arrow-pin";

type Coord = { latitude: number; longitude: number };

export type TrackingMarkerKind = "restaurant" | "customer" | "rider";

const MARKER_META: Record<
  TrackingMarkerKind,
  {
    icon: keyof typeof Ionicons.glyphMap;
    color: string;
    bg: string;
    label: string;
  }
> = {
  restaurant: {
    icon: "restaurant",
    color: "#ffffff",
    bg: "#ff5a00",
    label: "Pickup",
  },
  customer: { icon: "home", color: "#ffffff", bg: "#1a1c1c", label: "Drop" },
  rider: { icon: "navigate", color: "#ffffff", bg: "#00BCD4", label: "You" },
};

export function TrackingMarker({
  kind,
  coordinate,
  zIndex = 1,
  heading,
  navigationPov = false,
}: {
  kind: TrackingMarkerKind;
  coordinate: Coord;
  zIndex?: number;
  heading?: number;
  navigationPov?: boolean;
}) {
  const meta = MARKER_META[kind];

  if (kind === "rider") {
    return (
      <Marker
        coordinate={coordinate}
        title={meta.label}
        anchor={{ x: 0.5, y: 0.5 }}
        zIndex={zIndex}
        tracksViewChanges={false}
        flat={navigationPov}
      >
        <RiderArrowPin heading={navigationPov ? 0 : heading} />
      </Marker>
    );
  }

  return (
    <Marker
      coordinate={coordinate}
      title={meta.label}
      anchor={{ x: 0.5, y: 0.5 }}
      zIndex={zIndex}
      tracksViewChanges={false}
    >
      <View style={styles.markerWrap}>
        <View style={[styles.pin, { backgroundColor: meta.bg }]}>
          <Ionicons name={meta.icon} size={16} color={meta.color} />
        </View>
      </View>
    </Marker>
  );
}

const styles = StyleSheet.create({
  markerWrap: {
    alignItems: "center",
    justifyContent: "center",
    width: 44,
    height: 44,
  },
  pin: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#ffffff",
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },
});
