package com.streamplay.app;

import android.content.Context;
import android.content.Intent;
import android.os.Build;
import androidx.core.content.ContextCompat;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "BackgroundAudio")
public class BackgroundAudioPlugin extends Plugin {

    @PluginMethod
    public void start(PluginCall call) {
        try {
            String title = call.getString("title", "Playing Music");
            String artist = call.getString("artist", "StreamPlay");

            Context context = getContext();
            Intent intent = new Intent(context, BackgroundAudioService.class);
            intent.setAction(BackgroundAudioService.ACTION_START);
            intent.putExtra(BackgroundAudioService.EXTRA_TITLE, title);
            intent.putExtra(BackgroundAudioService.EXTRA_ARTIST, artist);

            ContextCompat.startForegroundService(context, intent);

            JSObject ret = new JSObject();
            ret.put("success", true);
            call.resolve(ret);
        } catch (Exception e) {
            call.reject("Failed to start background audio service: " + e.getMessage(), e);
        }
    }

    @PluginMethod
    public void update(PluginCall call) {
        try {
            String title = call.getString("title", "Playing Music");
            String artist = call.getString("artist", "StreamPlay");

            Context context = getContext();
            Intent intent = new Intent(context, BackgroundAudioService.class);
            intent.setAction(BackgroundAudioService.ACTION_UPDATE);
            intent.putExtra(BackgroundAudioService.EXTRA_TITLE, title);
            intent.putExtra(BackgroundAudioService.EXTRA_ARTIST, artist);

            ContextCompat.startForegroundService(context, intent);

            JSObject ret = new JSObject();
            ret.put("success", true);
            call.resolve(ret);
        } catch (Exception e) {
            call.reject("Failed to update background audio service: " + e.getMessage(), e);
        }
    }

    @PluginMethod
    public void stop(PluginCall call) {
        try {
            Context context = getContext();
            Intent intent = new Intent(context, BackgroundAudioService.class);
            intent.setAction(BackgroundAudioService.ACTION_STOP);
            context.startService(intent);

            JSObject ret = new JSObject();
            ret.put("success", true);
            call.resolve(ret);
        } catch (Exception e) {
            call.reject("Failed to stop background audio service: " + e.getMessage(), e);
        }
    }
}
