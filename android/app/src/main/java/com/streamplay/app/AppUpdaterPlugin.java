package com.streamplay.app;

import android.app.AlertDialog;
import android.content.Intent;
import android.net.Uri;
import android.os.Environment;
import android.os.Handler;
import android.os.Looper;
import android.util.Log;
import androidx.core.content.FileProvider;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import org.json.JSONObject;

import java.io.BufferedInputStream;
import java.io.File;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.URL;

@CapacitorPlugin(name = "AppUpdater")
public class AppUpdaterPlugin extends Plugin {

    private static final String TAG = "AppUpdaterPlugin";

    @PluginMethod
    public void checkAndUpdate(PluginCall call) {
        String updateJsonUrl = call.getString("url");
        if (updateJsonUrl == null || updateJsonUrl.isEmpty()) {
            call.reject("Update JSON URL is required");
            return;
        }

        new Thread(() -> {
            try {
                // 1. Fetch update.json from server
                URL url = new URL(updateJsonUrl);
                HttpURLConnection conn = (HttpURLConnection) url.openConnection();
                conn.setRequestMethod("GET");
                conn.setConnectTimeout(10000);
                conn.setReadTimeout(10000);

                InputStream in = new BufferedInputStream(conn.getInputStream());
                java.util.Scanner scanner = new java.util.Scanner(in).useDelimiter("\\A");
                String jsonStr = scanner.hasNext() ? scanner.next() : "";
                conn.disconnect();

                JSONObject jsonObj = new JSONObject(jsonStr);
                int serverVersionCode = jsonObj.getInt("versionCode");
                String apkUrl = jsonObj.getString("apkUrl");

                // 2. Get current app version code
                long currentVersionCode;
                try {
                    android.content.pm.PackageInfo pInfo = getContext().getPackageManager().getPackageInfo(getContext().getPackageName(), 0);
                    if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.P) {
                        currentVersionCode = pInfo.getLongVersionCode();
                    } else {
                        currentVersionCode = pInfo.versionCode;
                    }
                } catch (Exception e) {
                    currentVersionCode = 1;
                }

                JSObject ret = new JSObject();
                ret.put("currentVersion", currentVersionCode);
                ret.put("serverVersion", serverVersionCode);

                if (serverVersionCode > currentVersionCode) {
                    ret.put("updateAvailable", true);
                    // Prompt user on UI thread
                    new Handler(Looper.getMainLooper()).post(() -> showUpdateDialog(apkUrl));
                    call.resolve(ret);
                } else {
                    ret.put("updateAvailable", false);
                    call.resolve(ret);
                }

            } catch (Exception e) {
                Log.e(TAG, "Failed to check update", e);
                call.reject("Failed to check update: " + e.getMessage());
            }
        }).start();
    }

    private void showUpdateDialog(String apkUrl) {
        AlertDialog.Builder builder = new AlertDialog.Builder(getActivity());
        builder.setTitle("Update Available");
        builder.setMessage("A new version of the app is available. Would you like to download and install it now?");
        builder.setPositiveButton("Update", (dialog, which) -> downloadAndInstallApk(apkUrl));
        builder.setNegativeButton("Cancel", (dialog, which) -> dialog.dismiss());
        builder.setCancelable(false);
        builder.show();
    }

    private void downloadAndInstallApk(String apkUrl) {
        new Thread(() -> {
            try {
                URL url = new URL(apkUrl);
                HttpURLConnection conn = (HttpURLConnection) url.openConnection();
                conn.connect();

                File apkFile = new File(getContext().getExternalFilesDir(Environment.DIRECTORY_DOWNLOADS), "update.apk");

                InputStream input = new BufferedInputStream(url.openStream(), 8192);
                FileOutputStream output = new FileOutputStream(apkFile);

                byte[] data = new byte[1024];
                int count;
                while ((count = input.read(data)) != -1) {
                    output.write(data, 0, count);
                }

                output.flush();
                output.close();
                input.close();
                conn.disconnect();

                // Trigger installation
                installApk(apkFile);

            } catch (Exception e) {
                Log.e(TAG, "Download failed", e);
            }
        }).start();
    }

    private void installApk(File apkFile) {
        Intent intent = new Intent(Intent.ACTION_VIEW);
        Uri apkUri = FileProvider.getUriForFile(getContext(), getContext().getPackageName() + ".fileprovider", apkFile);
        intent.setDataAndType(apkUri, "application/vnd.android.package-archive");
        intent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        getContext().startActivity(intent);
    }
}
