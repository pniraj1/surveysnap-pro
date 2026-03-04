// src/utils/admob.js
import {
  InterstitialAd,
  RewardedAd,
  AdEventType,
  RewardedAdEventType,
  TestIds,
} from 'react-native-google-mobile-ads';

export const AD_UNITS = {
  BANNER:       __DEV__ ? TestIds.BANNER       : 'ca-app-pub-6365268430069678/9574699422',
  INTERSTITIAL: __DEV__ ? TestIds.INTERSTITIAL : 'ca-app-pub-6365268430069678/8814987800',
  REWARDED:     __DEV__ ? TestIds.REWARDED     : 'ca-app-pub-6365268430069678/6002644716',
};

// ── Interstitial (every 5 photos) ─────────────────────────────────────────
let _interstitial      = null;
let _interstitialReady = false;
let _photosSinceAd     = 0;

export function loadInterstitial() {
  _interstitial = InterstitialAd.createForAdRequest(AD_UNITS.INTERSTITIAL);
  _interstitial.addAdEventListener(AdEventType.LOADED,  () => { _interstitialReady = true; });
  _interstitial.addAdEventListener(AdEventType.ERROR,   () => {
    _interstitialReady = false;
    setTimeout(loadInterstitial, 30000);
  });
  _interstitial.addAdEventListener(AdEventType.CLOSED,  () => {
    _interstitialReady = false;
    loadInterstitial();
  });
  _interstitial.load();
}

export function onPhotoCaptured() {
  _photosSinceAd++;
  if (_photosSinceAd >= 5 && _interstitialReady && _interstitial) {
    _interstitial.show();
    _photosSinceAd = 0;
  }
}

// ── Rewarded (unlock PDF export) ─────────────────────────────────────────
let _rewarded      = null;
let _rewardedReady = false;

export function loadRewarded() {
  _rewarded = RewardedAd.createForAdRequest(AD_UNITS.REWARDED);
  _rewarded.addAdEventListener(RewardedAdEventType.LOADED, () => { _rewardedReady = true; });
  _rewarded.addAdEventListener(RewardedAdEventType.ERROR,  () => {
    _rewardedReady = false;
    setTimeout(loadRewarded, 30000);
  });
  _rewarded.addAdEventListener(RewardedAdEventType.CLOSED, () => {
    _rewardedReady = false;
    loadRewarded();
  });
  _rewarded.load();
}

// FIX: track whether the reward was actually earned before the ad closed.
// Previously onEarned could fire even when the user dismissed the ad early.
export function showRewarded(onEarned) {
  if (!_rewardedReady || !_rewarded) return false;

  let earned = false;

  const earnedSub = _rewarded.addAdEventListener(
    RewardedAdEventType.EARNED_REWARD,
    () => { earned = true; }
  );

  const closedSub = _rewarded.addAdEventListener(
    RewardedAdEventType.CLOSED,
    () => {
      earnedSub?.();   // remove listener
      closedSub?.();   // remove listener
      if (earned) onEarned();
    }
  );

  _rewarded.show();
  return true;
}

export function initAds() {
  loadInterstitial();
  loadRewarded();
}
