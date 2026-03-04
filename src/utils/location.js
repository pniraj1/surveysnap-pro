// src/utils/location.js
import * as Location from 'expo-location';

export async function requestLocationPerm() {
  const { status } = await Location.requestForegroundPermissionsAsync();
  return status === 'granted';
}

export async function getLocation() {
  try {
    const granted = await requestLocationPerm();
    if (!granted) return null;
    const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
    return { lat: loc.coords.latitude, lng: loc.coords.longitude, alt: loc.coords.altitude };
  } catch { return null; }
}

export function coordLabel(lat, lng) {
  if (lat == null || lng == null) return null;
  const latD = lat >= 0 ? 'N' : 'S';
  const lngD = lng >= 0 ? 'E' : 'W';
  return `${Math.abs(lat).toFixed(5)}° ${latD}  ${Math.abs(lng).toFixed(5)}° ${lngD}`;
}
