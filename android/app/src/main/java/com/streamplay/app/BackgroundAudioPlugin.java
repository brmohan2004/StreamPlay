package com.streamplay.app;

import android.content.Context;
import android.content.Intent;
import androidx.core.content.ContextCompat;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "BackgroundAudio")
public class BackgroundAudioPlugin extends Plugin {

    private static BackgroundAudioPlugin instance;

    @Override
    public void load() {
        super.load();
        instance = this;
    }

    public static void emitMediaAction(String action, long position) {
        if (instance != null) {
            JSObject data = new JSObject();
            data.put("action", action);
            if (position >= 0) {
                data.put("position", position);
            }
            instance.notifyListeners("mediaAction", data);
        }
    }

    @PluginMethod
    public void start(PluginCall call) {
        try {
            String title = call.getString("title", "Playing Music");
            String artist = call.getString("artist", "StreamPlay");
            String coverUrl = call.getString("coverUrl", "");
            boolean isPlaying = call.getBoolean("isPlaying", true);
            long duration = call.getLong("duration", 0L);
            long position = call.getLong("position", 0L);

            Context context = getContext();
            Intent intent = new Intent(context, BackgroundAudioService.class);
            intent.setAction(BackgroundAudioService.ACTION_START);
            intent.putExtra(BackgroundAudioService.EXTRA_TITLE, title);
            intent.putExtra(BackgroundAudioService.EXTRA_ARTIST, artist);
            intent.putExtra(BackgroundAudioService.EXTRA_COVER_URL, coverUrl);
            intent.putExtra(BackgroundAudioService.EXTRA_IS_PLAYING, isPlaying);
            intent.putExtra(BackgroundAudioService.EXTRA_DURATION, duration);
            intent.putExtra(BackgroundAudioService.EXTRA_POSITION, position);

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
            String coverUrl = call.getString("coverUrl", "");
            boolean isPlaying = call.getBoolean("isPlaying", true);
            long duration = call.getLong("duration", 0L);
            long position = call.getLong("position", 0L);

            Context context = getContext();
            Intent intent = new Intent(context, BackgroundAudioService.class);
            intent.setAction(BackgroundAudioService.ACTION_UPDATE);
            intent.putExtra(BackgroundAudioService.EXTRA_TITLE, title);
            intent.putExtra(BackgroundAudioService.EXTRA_ARTIST, artist);
            intent.putExtra(BackgroundAudioService.EXTRA_COVER_URL, coverUrl);
            intent.putExtra(BackgroundAudioService.EXTRA_IS_PLAYING, isPlaying);
            intent.putExtra(BackgroundAudioService.EXTRA_DURATION, duration);
            intent.putExtra(BackgroundAudioService.EXTRA_POSITION, position);

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

