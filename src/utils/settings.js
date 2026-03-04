// src/utils/settings.js — Persistent App Settings via AsyncStorage
import AsyncStorage from '@react-native-async-storage/async-storage';

const KEYS = {
  DEFAULT_PRESET:    'setting_default_preset',
  LOCATION_DEFAULT:  'setting_location_default',
  WATERMARK_DEFAULT: 'setting_watermark_default',
};

const DEFAULTS = {
  defaultPreset:    'balanced',
  locationDefault:  true,
  watermarkDefault: false,
};

export async function loadSettings() {
  try {
    const [preset, location, watermark] = await Promise.all([
      AsyncStorage.getItem(KEYS.DEFAULT_PRESET),
      AsyncStorage.getItem(KEYS.LOCATION_DEFAULT),
      AsyncStorage.getItem(KEYS.WATERMARK_DEFAULT),
    ]);
    return {
      defaultPreset:    preset    ?? DEFAULTS.defaultPreset,
      locationDefault:  location  !== null ? location  === 'true' : DEFAULTS.locationDefault,
      watermarkDefault: watermark !== null ? watermark === 'true' : DEFAULTS.watermarkDefault,
    };
  } catch {
    return { ...DEFAULTS };
  }
}

export async function saveSettings(settings) {
  try {
    await Promise.all([
      AsyncStorage.setItem(KEYS.DEFAULT_PRESET,    String(settings.defaultPreset)),
      AsyncStorage.setItem(KEYS.LOCATION_DEFAULT,  String(settings.locationDefault)),
      AsyncStorage.setItem(KEYS.WATERMARK_DEFAULT, String(settings.watermarkDefault)),
    ]);
  } catch (e) {
    console.warn('Failed to save settings:', e);
  }
}

export { KEYS, DEFAULTS };
