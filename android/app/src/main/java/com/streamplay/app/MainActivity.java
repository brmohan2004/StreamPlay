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

        // 100% Workable Sandbox & Ad Breakout Solution:
        // 1. Enable Multiple Windows & JavaScript window opening so embedded players (VidLink, AutoEmbed, VidSrc)
        //    pass all anti-sandbox/popup capability checks without triggering "Playback blocked" errors.
        // 2. Intercept window creation with an offscreen dummy WebView that silently absorbs & drops popup ads
        //    preventing external Chrome browser tabs from ever launching!
        try {
            WebView webView = getBridge().getWebView();
            if (webView != null) {
                // Completely hide right side & bottom scroll indicators for all screens and modes
                webView.setVerticalScrollBarEnabled(false);
                webView.setHorizontalScrollBarEnabled(false);
                webView.setScrollBarStyle(View.SCROLLBARS_INSIDE_OVERLAY);
                webView.setOverScrollMode(View.OVER_SCROLL_NEVER);

                webView.getSettings().setSupportMultipleWindows(true);
                webView.getSettings().setJavaScriptCanOpenWindowsAutomatically(true);
                webView.getSettings().setMediaPlaybackRequiresUserGesture(false);

                webView.setWebChromeClient(new WebChromeClient() {
                    @Override
                    public boolean onCreateWindow(WebView view, boolean isDialog, boolean isUserGesture, Message resultMsg) {
                        // Headless ad disposer: receives popup ad requests and destroys them silently
                        WebView adSink = new WebView(view.getContext());
                        adSink.setWebViewClient(new WebViewClient() {
                            @Override
                            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                                // Silently discard all ad URLs
                                return true;
                            }

                            @Override
                            public boolean shouldOverrideUrlLoading(WebView view, String url) {
                                // Backward compatibility
                                return true;
                            }
                        });

                        WebView.WebViewTransport transport = (WebView.WebViewTransport) resultMsg.obj;
                        transport.setWebView(adSink);
                        resultMsg.sendToTarget();
                        // Handled internally: NO external Chrome tab or popup is ever opened!
                        return true;
                    }
                });
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
