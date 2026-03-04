// src/components/BannerAd.js
import React from 'react';
import { View, StyleSheet } from 'react-native';
import { BannerAd, BannerAdSize } from 'react-native-google-mobile-ads';
import { AD_UNITS } from '../utils/admob';
import { Colors } from '../theme';

export default function AdBanner() {
  return (
    <View style={styles.wrap}>
      <BannerAd
        unitId={AD_UNITS.BANNER}
        size={BannerAdSize.ANCHORED_ADAPTIVE_BANNER}
        onAdFailedToLoad={e => console.log('Banner err:', e)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: Colors.surface,
    borderTopWidth: 0.5,
    borderTopColor: Colors.border,
    alignItems: 'center',
  },
});
