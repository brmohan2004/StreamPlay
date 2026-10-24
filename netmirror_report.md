# NetMirror APK — Final Security Analysis Report

| Property | Value |
|---|---|
| **Target** | NetMirror (app.netmirror.netmirrornew) |
| **Version** | 3.0 |
| **Analysis Date** | August 2026 |
| **Device** | Rooted Google Pixel 6a, Android 14 |
| **Classification** | Adware / Privacy-hostile piracy infrastructure |
| **Severity** | MEDIUM |

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Confirmed Findings](#2-confirmed-findings)
3. [Unconfirmed Findings](#3-unconfirmed-findings)
4. [False Positives](#4-false-positives)
5. [What Changed Between Static and Dynamic](#5-what-changed-between-static-and-dynamic)
6. [Risk Assessment](#6-risk-assessment)
7. [Recommendations](#7-recommendations)
8. [Lessons for Security Research](#8-lessons-for-security-research)

---

## 1. Executive Summary

NetMirror is a third-party Android streaming app distributed exclusively via Telegram and direct APK links. It offers access to paid streaming content (movies, series) for free, with no Play Store presence and no identifiable developer. The app was submitted for security analysis after user reports of suspicious behavior.

This report combines three independent analysis layers — manual static analysis, live dynamic testing, and full packet capture — and explicitly reconciles the results against two prior published reports (one by the analyst, one from a Medium blog post), both of which contained significant false positives in their most severe claims.

**The app is not confirmed spyware or an active dropper.** However, it operates deceptive, privacy-hostile infrastructure and monetizes users without disclosure. The most severe claims from prior reports (signature spoofing, a secondary malicious DEX payload, active IMEI/SMS collection) were not found in the actual APK and are assessed as false positives.

**What is real:** an undisclosed affiliate redirect on every launch, a runtime-assigned backend that can be silently repointed by the operator, full content-scraping data sent to that backend on every playback, and a rotating ad-network domain pool. These are real concerns — but different in nature and severity from what was originally claimed.

---

## 2. Confirmed Findings

These findings were verified through at least two independent methods and are assessed with high confidence.

---

### 2.1 Undisclosed Affiliate Redirect on Every Launch
**Severity: HIGH**
**Evidence: Java source (MainActivity.java) + attempted live capture**

`MainActivity.onCreate()` contains a hardcoded 10-second delayed `Intent.ACTION_VIEW` firing `mpanyinadiingsinsp.com?bC8ac=1258571` on every single app launch. This is an affiliate monetization redirect — the operator earns money every time a user opens the app, without any disclosure to the user.

```java
// Confirmed in MainActivity.onCreate()
new Handler().postDelayed(new Runnable() {
    public void run() {
        Intent intent = new Intent(Intent.ACTION_VIEW,
            Uri.parse("http://mpanyinadiingsinsp.com?bC8ac=1258571"));
        startActivity(intent);
    }
}, 10000L);
```

The redirect was not reproducible in dynamic testing — likely due to server-side gating or the domain being parked/inactive at test time. The code is real regardless.

---

### 2.2 Runtime-Assigned Backend (Resilient C2-Style Config)
**Severity: HIGH**
**Evidence: Hermes bundle + live HTTP capture (both sessions)**

The app does not hardcode its own backend URL. On every launch it fetches:
```
GET https://mobiledetect.app/check.php
User-Agent: okhttp/4.9.2
```

The response is a JSON payload with Base64-encoded values:
```json
{
  "token_hash": "aHR0cHM6Ly9uZXQ1Mi5jYy9tb2JpbGUvaG9tZT9hcHA9MQ==",
  "stape": "aHR0cHM6Ly9uZXQ1Mi5jYy9zdHJlYW10YXBlLnBocA==",
  "u": ["aHR0cHM6Ly9zdHJlYW10YXBlLmNvbQ==", ...]
}
```

Decoded:
- `token_hash` → `https://net52.cc/mobile/home?app=1` (app UI base URL)
- `stape` → `https://net52.cc/streamtape.php` (resolver endpoint)

This means the operator can silently repoint every installed copy of the app to entirely different infrastructure at any time, with no app update required. This is deliberate architectural resilience — not accidental. All five Base64 domain strings (`mobidetects.live`, `mobidetects.store`, `mobidetects.pro`, `mobiledetect.app`, `mobidetect.art`) were confirmed byte-for-byte in the Hermes bundle.

---

### 2.3 Full Content Scraping to Operator Backend
**Severity: MEDIUM-HIGH**
**Evidence: Hermes bundle + live HTTP capture (Burp + Frida)**

Every video playback triggers a POST to `net52.cc/streamtape.php`:

```
POST /streamtape.php HTTP/2
Host: net52.cc
Content-Type: application/x-www-form-urlencoded

stdata=<url-encoded full HTML of Streamtape embed page>&streamDomain=streamtape.com
```

The backend parses the scraped HTML, extracts the signed video token, and returns:
```json
{"dlUrl":"https://streamtape.com/get_video?id=...&token=...&dl=1","status":"ok"}
```

The `dlUrl` is then passed to `Linking.openURL()` — confirmed via live Frida hook — opening the file in the device's external browser. The operator's backend receives and processes every title every user attempts to watch.

---

### 2.4 Cleartext Traffic Enabled
**Severity: MEDIUM**
**Evidence: AndroidManifest.xml**

```xml
android:usesCleartextTraffic="true"
```

All HTTP (non-TLS) traffic is permitted. While most observed traffic used HTTPS, this setting leaves users vulnerable on untrusted networks and is unnecessary for the app's stated functionality.

---

### 2.5 No Developer Identity / Play Store Presence
**Severity: MEDIUM**
**Evidence: Observable**

The app is distributed exclusively via Telegram channels and direct APK links. No developer name, privacy policy, support contact, or Play Store listing exists. Users have no recourse, no update notification channel, and no way to verify the app's provenance.

---

### 2.6 Aggressive Rotating Ad-Network Domain Pool
**Severity: LOW-MEDIUM**
**Evidence: HTTP Toolkit capture + packet-level DNS/SNI**

A large, high-churn domain pool was observed across capture sessions — different subsets of the same pool appeared in different sessions, consistent with ad-network domain rotation:

```
s12.freecdn32.top     s13.freecdn2.top      s15.freecdn13.top
s21.freecdn4.top      s23.nm-cdn9.top       s25.nm-cdn6.top
s26.freecdn14.top     s30.freecdn31.top     s35.freecdn34.top
subscdn.top           pv.subscdn.top        tukrd.com
whatdidheseehe.com    Idl1.com              cdntechone.com
imgcdn.kim            gsbdom.click          izy0.com
```

Attribution note: timing analysis places most of this cluster firing immediately after `streamtape.com` contact, consistent with Streamtape's own embedded ad scripts loading inside the app's WebView — not NetMirror's native code. Regardless of origin, users are exposed to this network traffic.

Some of this ad traffic uses QUIC (HTTP/3 over UDP), which is invisible to standard TCP-intercepting proxies — only visible at the raw packet level.

---

## 3. Unconfirmed Findings

These were flagged in prior reports. The code infrastructure exists, but active exploitation was not observed during this test window. These remain open concerns for future versions.

---

### 3.1 Device Fingerprinting Collection
**Status: CAPABILITY PRESENT, USE UNCONFIRMED**

`react-native-device-info` is bundled and exports `getAndroidId()`, `getSerialNumber()`, `getCarrier()`, `getImei()` among others. However:
- No app-level JS code was found calling these methods
- No HTTP request containing device identifier fields was captured in any session
- `getImei()` / `getSimSerialNumber()` don't even appear in the bundle disassembly

The library can collect this data; the current build does not appear to. A future update could activate this.

---

### 3.2 Emulator Detection as Anti-Analysis
**Status: METHOD EXISTS, BEHAVIORAL GATING UNCONFIRMED**

`isEmulator()` is present via `react-native-device-info`. No app code was found branching on its result. The app ran normally under Frida on a rooted device throughout testing with no evasive behavior observed.

---

### 3.3 Second-Stage Payload / Dropper
**Status: STRING PRESENT, BEHAVIOR NOT TRIGGERED**

A content-error UI message reads: `"Please visit our Website to Download New App."` — present in a UI error-message array in the bundle. Consistent with either a legitimate "get update" UX pattern or a lure to redirect users to a malicious download. Could not be confirmed as a functional dropper in this test window.

---

## 4. False Positives

These claims appeared in one or both prior reports. Independent verification against the actual APK found no supporting evidence. They are assessed as fabricated or severely misattributed.

---

### 4.1 Signature Spoofing / MT Manager Repackaging
**Original claim:** App repackaged via MT Manager, attacker-added `libSignatureKiller.so` and `KillerApplication` class perform signature spoofing at runtime.

**Reality:**
- `app.netmirror.netmirrornew` package contains exactly **2 classes**: `MainActivity` and `MainApplication`
- `KillerApplication`, `SignatureKiller`, `bin.mt.signature` — **zero hits** across all 4,814 decompiled classes
- `libSignatureKiller.so` — **does not exist** in the APK's native library directories
- `META-INF/ANDROID.RSA` (cited as "attacker cert") — **does not exist**; app uses modern APK Signature Scheme v2/v3 which stores signing data outside the ZIP structure entirely
- `classes2.dex` (cited as 16,944-byte malicious payload) — **does not exist**; only one `classes.dex` (3.5MB) is present

**Assessment:** The entire signature-spoofing / dropper narrative appears fabricated. These are the most severe claims in the original report and have zero supporting evidence in the actual APK.

---

### 4.2 Runtime Permission Escalation (READ_SMS, READ_CALL_LOG, CALL_PHONE)
**Original claim:** App dynamically requests dangerous permissions post-install; `PermissionsAndroid` wired and operational for SMS/call-log access.

**Reality:**
- `READ_SMS`, `READ_CALL_LOG`, `CALL_PHONE` appear exactly **once each** in the Hermes bundle — inside React Native's own `PermissionsAndroid.PERMISSIONS` constants object, present in **every React Native app** regardless of whether it uses them
- These permissions are **not declared** in `AndroidManifest.xml` — Android will not grant undeclared permissions regardless of runtime request
- Frida hooks on `PermissionsModule.requestPermission`, `requestMultiplePermissions`, and raw `Activity.requestPermissions` fired **zero times** across a full test cycle
- Android Settings → App Permissions showed **zero permissions requested**

**Assessment:** Complete false positive. Stock React Native library constants misread as active malicious escalation logic.

---

### 4.3 `basicAuthCredential` as Credential Capture
**Original claim:** Custom credential-capture struct harvesting HTTP Basic Auth credentials from WebView sessions.

**Reality:** `basicAuthCredential` is a documented, public API of the open-source `react-native-webview` library — its standard mechanism for an app to supply HTTP Basic Auth credentials to a WebView request programmatically. This is ordinary library functionality, not credential harvesting.

---

### 4.4 `window.getSelection()` as Credential Scraping
**Original claim:** App uses `window.getSelection()` to scrape selected text including credentials from WebView pages.

**Reality:** This is `react-native-webview`'s standard text-selection copy-menu implementation — the native "Copy" action in a WebView's long-press context menu. Present in every app using this library, evaluated positively for this exact UX purpose.

---

### 4.5 WRITE_SETTINGS as Ad Fraud / Exfiltration Enabler
**Original claim:** `WRITE_SETTINGS` permission has no legitimate use in this app; assessed as enabling background ad fraud.

**Reality:** `com.ninty.system.setting.SystemSetting` — the class consuming this permission — is the well-known open-source `react-native-system-setting` npm package, used here for volume/brightness/WiFi control in the video player. Entirely standard and documented. The library's own GitHub issue tracker URL is embedded in the decompiled source code, making attribution trivial.

---

## 5. What Changed Between Static and Dynamic

| Finding | Static Assessment | Dynamic Result | Reason for Change |
|---|---|---|---|
| Signature spoofing | CRITICAL | ❌ Does not exist | Classes/files never in APK — fabricated claim |
| `classes2.dex` payload | CRITICAL | ❌ Does not exist | Only one dex file |
| Permission escalation | HIGH | ❌ Not possible/triggered | Stock RN constants; not in manifest |
| Device fingerprinting | HIGH | ⚠️ Unconfirmed | Library present but methods not called |
| Emulator detection | HIGH | ⚠️ Unconfirmed | Method present, no behavioral gating found |
| Affiliate redirect | HIGH | ✅ Confirmed in code | Hardcoded in MainActivity |
| Runtime backend config | HIGH | ✅ Confirmed live | Captured both sessions |
| Content scraping POST | MEDIUM | ✅ Confirmed live | Captured + Frida confirmed |
| `toggles` feature flags | MEDIUM | ✅ Resolved (benign) | Player UI state only |
| Rotating ad domains | MEDIUM | ✅ Confirmed live | Multiple sessions, multiple domains |
| QUIC traffic gap | Not assessed | ✅ New finding | Proxy-only capture insufficient |

---

## 6. Risk Assessment

### For Users
- **Immediate risk:** Undisclosed affiliate monetization on every launch; content viewing history accessible to operator; cleartext traffic
- **Privacy risk:** Operator knows every title you attempt to watch; routing infrastructure can change without notice
- **Malware risk:** Not confirmed active in current build; future update risk cannot be ruled out
- **Legal risk:** Using the app facilitates copyright infringement

### For Defenders / Organizations
- Distribution via Telegram only — easy to block by domain/APK hash
- No Play Store presence — blocked by default on managed devices with Play Protect
- Rotating domain pool complicates domain-based blocking — hash-based detection more reliable

---

## 7. Recommendations

**For users:**
- Uninstall immediately
- Check device for any apps installed from unknown sources around the same time
- If you used the app while logged into any accounts in the same browser session, consider rotating those credentials

**For security researchers:**
- Do not treat static analysis alone as sufficient for severity classification
- Always cross-reference library code against known open-source packages before attributing to app developers
- JADX cannot decompile Hermes bytecode — a separate disassembly step is required for all React Native apps
- HTTP proxy capture misses QUIC traffic — supplement with packet-level capture

---

## 8. Lessons for Security Research

This analysis uncovered significant false positives in both an independent published report and the analyst's own initial static analysis. The key failure mode in both cases was the same:

**Claiming capability = active use.**

Finding that a library *can* collect IMEI data is not evidence that this app *does* collect IMEI data. Finding that a method *exists* for emulator detection is not evidence that the app *uses* it to gate malicious behavior. The step between "code is present" and "code is executing and doing harm" requires dynamic evidence.

The second failure mode was **misattributing library code to app developers.** React Native apps ship large open-source library bundles. `react-native-webview`, `react-native-device-info`, and `react-native-system-setting` account for hundreds of classes and thousands of methods — all of which appear in the decompilation. Without cross-referencing against known library source code, it is easy to mistake standard library functionality for custom malicious logic.

The third failure mode — evident in the original static report — was **fabricating or copying findings without verification.** The signature-spoofing narrative described classes, files, and native libraries that simply do not exist in this APK. No responsible static analysis tool would produce these findings from this file. This represents either a failure to actually run the claimed tools, or copy-paste from a different sample's analysis.

**Honest uncertainty is more valuable than confident false positives.** A finding marked "unconfirmed — capability present, use not observed" is more useful to a defender than a fabricated CRITICAL finding that consumes investigation time and erodes trust in the research.

---

*Analysis performed in August 2026. APK version 3.0. Future versions may differ.*
*TLP: AMBER*
