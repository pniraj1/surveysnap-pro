# 📷 SurveySnap Pro
### Premium Field Survey Photography App — Play Store Ready

---

## 🎨 Design System

**Aesthetic:** Precision Instrument — Leica / Carl Zeiss optics meets field technology  
**Logo:** Hexagonal camera aperture with survey crosshair — aperture blades + theodolite precision  
**Colours:** Deep Space Navy `#06080F` · Electric Blue `#2563EB` · Cyan GPS `#22D3EE`  
**Typography:** Cormorant Garant (display) + Nunito (UI)  

---

## 📁 Project Structure

```
surveysnap/
├── App.js                        # Entry, navigation, font loading
├── app.json                      # Expo config + AdMob IDs
├── eas.json                      # Play Store build
├── google-services.json          # ⚠️ Replace with yours
├── babel.config.js
├── package.json
└── src/
    ├── screens/
    │   ├── HomeScreen.js         # Project manager
    │   ├── ProjectScreen.js      # Folder/subfolder manager
    │   ├── CameraScreen.js       # Camera + quality + toggles
    │   ├── GalleryScreen.js      # Photos + PDF export
    │   └── SettingsScreen.js     # App settings
    ├── components/
    │   ├── SurveySnapLogo.js     # SVG precision-instrument logo
    │   └── BannerAd.js           # AdMob banner
    └── utils/
        ├── fs.js                 # Local file storage
        ├── compress.js           # 4 quality presets
        ├── location.js           # GPS utilities
        ├── pdfReport.js          # A4 PDF engine (4/6/8 per sheet)
        └── admob.js              # Banner + Interstitial + Rewarded
```

---

## 🚀 Getting Started

### Step 1 — Install
```bash
cd surveysnap
npm install
```

### Step 2 — Firebase (Required for AdMob)
1. Go to https://console.firebase.google.com
2. Create project: `surveysnap-pro`
3. Add Android app: `com.surveysnap.pro`
4. Download `google-services.json` → replace the placeholder

### Step 3 — Test
```bash
npx expo start --android
```

---

## 📱 Feature Breakdown

### 🗂️ Projects
- Unlimited survey projects (each = top-level folder)
- Local storage: `/Documents/SurveySnap/`
- Metadata tracked in `meta.json`
- Long-press to delete

### 📁 Folders
- Unlimited nested subfolders
- Breadcrumb navigation
- **Re-open any folder to add more photos** — tap "Add Photos" on any existing folder card
- Subfolder count + photo count shown on each card
- Quick actions per folder: Add Photos · Gallery · Sub-folders

### 📷 Camera
- Uses device's native internal camera
- **Location Tagging** — optional toggle, GPS embedded in filename
- **Watermark** — optional toggle, shown in PDF reports
- **4 Quality Presets:**

| Preset | File Size | Quality | Resolution | Best For |
|--------|-----------|---------|------------|----------|
| Compact | ~150–250 KB | 55% | 1280px | Email, WhatsApp |
| Balanced ★ | ~400–600 KB | 72% | 1920px | Field reports |
| Detailed | ~1.2–2 MB | 85% | 2560px | Inspections |
| Archival | ~3–6 MB | 96% | 4096px | Legal/archive |

- Flash: Off / On / Auto
- Front/rear camera flip
- Survey crosshair overlay

### 🖼️ Gallery
- Per-folder photo grid (3 columns)
- Full-screen viewer
- Share individual photos (WhatsApp, Email, Drive…)
- Delete individual photos
- **PDF Report generation**

### 📄 PDF Reports
- A4 portrait, printable
- **3 layout options:** 4 photos/sheet (2×2) · 6 photos/sheet (2×3) · 8 photos/sheet (2×4)
- Per-page header: Project name, folder name, date
- Per-page footer: Layout info, page number
- Optional GPS display under each photo
- Optional watermark overlay
- Share via any app (WhatsApp, Email, Drive, Print)
- Gated by Rewarded Ad

---

## 💰 AdMob

| Type | Unit ID | Trigger |
|------|---------|---------|
| Banner | `ca-app-pub-6365268430069678/9574699422` | Home + Project screens |
| Interstitial | `ca-app-pub-6365268430069678/8814987800` | Every 5 photos captured |
| Rewarded | `ca-app-pub-6365268430069678/6002644716` | Unlock PDF export |
| App ID | `ca-app-pub-6365268430069678~9213608900` | app.json + google-services.json |

> In `__DEV__` mode, Google Test IDs are used automatically.

---

## 📂 Local File Structure

```
/Documents/SurveySnap/
├── meta.json                          ← All project metadata
└── p_1709123000000/                   ← Project folder
    ├── North Elevation/
    │   ├── SS_1709123456_51.50745_-0.12775.jpg
    │   └── SS_1709123999_51.50746_-0.12776_WM.jpg
    └── Roof Level/
        └── SS_1709124500_51.50745_-0.12775.jpg
```

**Filename anatomy:**  
`SS_{timestamp}_{latitude}_{longitude}_{WM if watermark}.jpg`

---

## 🏪 Play Store Checklist

- [ ] Replace `google-services.json` with real Firebase file
- [ ] Update EAS project ID in `app.json` (run `eas build:configure`)
- [ ] Create icon: 1024×1024 PNG → `assets/icon.png`
- [ ] Create adaptive icon: 1024×1024 PNG → `assets/adaptive-icon.png`
- [ ] Create splash: 1284×2778 PNG, `#06080F` bg → `assets/splash.png`
- [ ] Build: `eas build --platform android --profile production`
- [ ] Create listing at https://play.google.com/console
- [ ] Add Privacy Policy URL (AdMob mandatory)
- [ ] Complete content rating questionnaire
- [ ] Upload AAB + screenshots + store description
- [ ] Submit for review (3–7 days typical)

---

## 🔑 App Details

| Field | Value |
|-------|-------|
| Package | `com.surveysnap.pro` |
| AdMob App ID | `ca-app-pub-6365268430069678~9213608900` |
| Framework | Expo SDK 51 / React Native 0.74 |
| Storage | Local device only (Documents directory) |
| Permissions | Camera, Location (optional), Storage, Internet |
