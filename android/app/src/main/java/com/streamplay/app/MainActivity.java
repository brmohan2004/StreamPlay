package com.streamplay.app;

import android.Manifest;
import android.content.pm.PackageManager;
import android.os.Bundle;
import android.os.Message;
import android.view.View;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    private static final int MIC_PERMISSION_REQUEST_CODE = 101;

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        registerPlugin(AppUpdaterPlugin.class);
        registerPlugin(BackgroundAudioPlugin.class);

        // Auto-request microphone permission for voice search on app launch
        if (ContextCompat.checkSelfPermission(this, Manifest.permission.RECORD_AUDIO)
                != PackageManager.PERMISSION_GRANTED) {
            ActivityCompat.requestPermissions(
                    this,
                    new String[]{Manifest.permission.RECORD_AUDIO},
                    MIC_PERMISSION_REQUEST_CODE
            );
        }

        // High-Speed Streaming & Zero-Ad WebView Configuration:
        // 1. Enable Third-Party Cookies, DOM Storage, & Mixed Content so Cloudflare & video CDNs load instantly in mobile APK.
        // 2. Disallow multiple windows & auto-open windows so ad popups cannot launch external Chrome tabs.
        // 3. Clean User-Agent (strip '; wv') so streaming servers treat WebView as full Chrome Mobile.
        try {
            WebView webView = getBridge().getWebView();
            if (webView != null) {
                // Completely hide right side & bottom scroll indicators for all screens and modes
                webView.setVerticalScrollBarEnabled(false);
                webView.setHorizontalScrollBarEnabled(false);
                webView.setScrollBarStyle(View.SCROLLBARS_INSIDE_OVERLAY);
                webView.setOverScrollMode(View.OVER_SCROLL_NEVER);

                android.webkit.WebSettings settings = webView.getSettings();
                settings.setJavaScriptEnabled(true);
                settings.setDomStorageEnabled(true);
                settings.setDatabaseEnabled(true);
                settings.setAllowFileAccess(true);
                settings.setAllowContentAccess(true);
                settings.setMediaPlaybackRequiresUserGesture(false);
                settings.setMixedContentMode(android.webkit.WebSettings.MIXED_CONTENT_ALWAYS_ALLOW);
                
                // Block ad breakout popups: disallow new windows/tabs from spawning external Chrome
                settings.setSupportMultipleWindows(false);
                settings.setJavaScriptCanOpenWindowsAutomatically(false);

                // Enable Third-Party Cookies required for cross-domain embed players & Cloudflare tokens
                android.webkit.CookieManager cookieManager = android.webkit.CookieManager.getInstance();
                cookieManager.setAcceptCookie(true);
                cookieManager.setAcceptThirdPartyCookies(webView, true);

                // Clean User-Agent: Strip '; wv' and 'Version/4.0' so streaming providers don't block mobile APK
                String defaultUa = settings.getUserAgentString();
                if (defaultUa != null) {
                    String cleanUa = defaultUa.replace("; wv", "").replaceAll("Version/[0-9.]+\\s*", "");
                    settings.setUserAgentString(cleanUa);
                }
            }
        } catch (Exception e) {
            // Safe fallback
        }
    }

    @Override
    public void onPause() {
        super.onPause();
        try {
            WebView webView = getBridge().getWebView();
            if (webView != null) {
                // Keep background audio playback, event dispatch, and auto-next track timers running smoothly
                webView.resumeTimers();
            }
        } catch (Exception ignored) {}
    }

    @Override
    public void onStop() {
        super.onStop();
        try {
            WebView webView = getBridge().getWebView();
            if (webView != null) {
                // Keep JS timers active even when screen is locked or app is sent to background
                webView.resumeTimers();
            }
        } catch (Exception ignored) {}
    }

    @Override
    public void onResume() {
        super.onResume();
        try {
            WebView webView = getBridge().getWebView();
            if (webView != null) {
                webView.resumeTimers();
            }
        } catch (Exception ignored) {}
    }
}
