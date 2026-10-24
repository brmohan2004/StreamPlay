package com.streamplay.app;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.content.pm.ServiceInfo;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.media.MediaMetadata;
import android.media.session.MediaSession;
import android.media.session.PlaybackState;
import android.net.wifi.WifiManager;
import android.os.Build;
import android.os.IBinder;
import android.os.PowerManager;

import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

public class BackgroundAudioService extends Service {

    public static final String ACTION_START = "com.streamplay.app.action.START";
    public static final String ACTION_UPDATE = "com.streamplay.app.action.UPDATE";
    public static final String ACTION_STOP = "com.streamplay.app.action.STOP";

    public static final String ACTION_PREVIOUS = "com.streamplay.app.action.PREVIOUS";
    public static final String ACTION_PLAY = "com.streamplay.app.action.PLAY";
    public static final String ACTION_PAUSE = "com.streamplay.app.action.PAUSE";
    public static final String ACTION_NEXT = "com.streamplay.app.action.NEXT";

    public static final String EXTRA_TITLE = "extra_title";
    public static final String EXTRA_ARTIST = "extra_artist";
    public static final String EXTRA_COVER_URL = "extra_cover_url";
    public static final String EXTRA_IS_PLAYING = "extra_is_playing";
    public static final String EXTRA_DURATION = "extra_duration";
    public static final String EXTRA_POSITION = "extra_position";

    private static final String CHANNEL_ID = "streamplay_audio_playback_channel";
    private static final int NOTIFICATION_ID = 2001;

    private PowerManager.WakeLock wakeLock;
    private WifiManager.WifiLock wifiLock;

    private MediaSession mediaSession;
    private String currentTitle = "Playing Audio";
    private String currentArtist = "StreamPlay";
    private String currentCoverUrl = "";
    private boolean currentIsPlaying = true;
    private long currentDuration = 0;
    private long currentPosition = 0;
    private Bitmap currentCoverBitmap = null;

    private final ExecutorService imageExecutor = Executors.newSingleThreadExecutor();

    @Override
    public void onCreate() {
        super.onCreate();
        createNotificationChannel();
        acquireLocks();
        initMediaSession();
    }

    private void acquireLocks() {
        try {
            if (wakeLock == null) {
                PowerManager powerManager = (PowerManager) getSystemService(Context.POWER_SERVICE);
                if (powerManager != null) {
                    wakeLock = powerManager.newWakeLock(
                            PowerManager.PARTIAL_WAKE_LOCK,
                            "StreamPlay:BackgroundAudioWakeLock"
                    );
                    wakeLock.setReferenceCounted(false);
                }
            }
            if (wakeLock != null && !wakeLock.isHeld()) {
                wakeLock.acquire();
            }

            if (wifiLock == null) {
                WifiManager wifiManager = (WifiManager) getApplicationContext().getSystemService(Context.WIFI_SERVICE);
                if (wifiManager != null) {
                    wifiLock = wifiManager.createWifiLock(
                            WifiManager.WIFI_MODE_FULL_HIGH_PERF,
                            "StreamPlay:BackgroundAudioWifiLock"
                    );
                    wifiLock.setReferenceCounted(false);
                }
            }
            if (wifiLock != null && !wifiLock.isHeld()) {
                wifiLock.acquire();
            }
        } catch (Exception ignored) {}
    }

    private void releaseLocks() {
        try {
            if (wakeLock != null && wakeLock.isHeld()) {
                wakeLock.release();
            }
        } catch (Exception ignored) {}
        try {
            if (wifiLock != null && wifiLock.isHeld()) {
                wifiLock.release();
            }
        } catch (Exception ignored) {}
    }

    private void createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel = new NotificationChannel(
                    CHANNEL_ID,
                    "StreamPlay Audio Playback",
                    NotificationManager.IMPORTANCE_LOW
            );
            channel.setDescription("Keeps audio playback active while app is minimized or screen is off");
            channel.setShowBadge(false);
            channel.setSound(null, null);
            NotificationManager manager = getSystemService(NotificationManager.class);
            if (manager != null) {
                manager.createNotificationChannel(channel);
            }
        }
    }

    private void initMediaSession() {
        try {
            if (mediaSession == null) {
                mediaSession = new MediaSession(this, "StreamPlaySession");
                mediaSession.setFlags(MediaSession.FLAG_HANDLES_MEDIA_BUTTONS | MediaSession.FLAG_HANDLES_TRANSPORT_CONTROLS);
                mediaSession.setCallback(new MediaSession.Callback() {
                    @Override
                    public void onPlay() {
                        currentIsPlaying = true;
                        updateMediaPlaybackState();
                        BackgroundAudioPlugin.emitMediaAction("play", currentPosition);
                        updateNotification();
                    }

                    @Override
                    public void onPause() {
                        currentIsPlaying = false;
                        updateMediaPlaybackState();
                        BackgroundAudioPlugin.emitMediaAction("pause", currentPosition);
                        updateNotification();
                    }

                    @Override
                    public void onSkipToNext() {
                        BackgroundAudioPlugin.emitMediaAction("next", -1);
                    }

                    @Override
                    public void onSkipToPrevious() {
                        BackgroundAudioPlugin.emitMediaAction("previous", -1);
                    }

                    @Override
                    public void onSeekTo(long pos) {
                        currentPosition = pos;
                        updateMediaPlaybackState();
                        BackgroundAudioPlugin.emitMediaAction("seek", pos);
                    }

                    @Override
                    public void onStop() {
                        currentIsPlaying = false;
                        updateMediaPlaybackState();
                        BackgroundAudioPlugin.emitMediaAction("stop", -1);
                        stopForegroundAndSelf();
                    }
                });
                mediaSession.setActive(true);
            }
        } catch (Exception ignored) {}
    }

    private void updateMediaPlaybackState() {
        try {
            if (mediaSession == null) return;

            long actions = PlaybackState.ACTION_PLAY | PlaybackState.ACTION_PAUSE |
                    PlaybackState.ACTION_SKIP_TO_NEXT | PlaybackState.ACTION_SKIP_TO_PREVIOUS |
                    PlaybackState.ACTION_PLAY_PAUSE | PlaybackState.ACTION_SEEK_TO;

            int state = currentIsPlaying ? PlaybackState.STATE_PLAYING : PlaybackState.STATE_PAUSED;

            PlaybackState.Builder stateBuilder = new PlaybackState.Builder()
                    .setActions(actions)
                    .setState(state, currentPosition, 1.0f);

            mediaSession.setPlaybackState(stateBuilder.build());

            MediaMetadata.Builder metaBuilder = new MediaMetadata.Builder()
                    .putString(MediaMetadata.METADATA_KEY_TITLE, currentTitle)
                    .putString(MediaMetadata.METADATA_KEY_ARTIST, currentArtist)
                    .putString(MediaMetadata.METADATA_KEY_ALBUM, "StreamPlay")
                    .putLong(MediaMetadata.METADATA_KEY_DURATION, currentDuration > 0 ? currentDuration : -1);

            if (currentCoverBitmap != null) {
                metaBuilder.putBitmap(MediaMetadata.METADATA_KEY_ALBUM_ART, currentCoverBitmap);
                metaBuilder.putBitmap(MediaMetadata.METADATA_KEY_ART, currentCoverBitmap);
            }

            mediaSession.setMetadata(metaBuilder.build());
        } catch (Exception ignored) {}
    }

    private Notification buildNotification() {
        Intent notificationIntent = new Intent(this, MainActivity.class);
        notificationIntent.setAction(Intent.ACTION_MAIN);
        notificationIntent.addCategory(Intent.CATEGORY_LAUNCHER);
        notificationIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_SINGLE_TOP);

        int flags = PendingIntent.FLAG_UPDATE_CURRENT;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            flags |= PendingIntent.FLAG_IMMUTABLE;
        }

        PendingIntent pendingIntent = PendingIntent.getActivity(this, 0, notificationIntent, flags);

        PendingIntent prevIntent = getPendingActionIntent(ACTION_PREVIOUS, 1);
        PendingIntent playPauseIntent = getPendingActionIntent(currentIsPlaying ? ACTION_PAUSE : ACTION_PLAY, 2);
        PendingIntent nextIntent = getPendingActionIntent(ACTION_NEXT, 3);

        Notification.Builder builder;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            builder = new Notification.Builder(this, CHANNEL_ID);
        } else {
            builder = new Notification.Builder(this);
        }

        builder.setContentTitle(currentTitle)
                .setContentText(currentArtist)
                .setSmallIcon(R.mipmap.ic_launcher)
                .setContentIntent(pendingIntent)
                .setOngoing(currentIsPlaying)
                .setOnlyAlertOnce(true)
                .setVisibility(Notification.VISIBILITY_PUBLIC);

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
            Notification.MediaStyle mediaStyle = new Notification.MediaStyle();
            if (mediaSession != null) {
                mediaStyle.setMediaSession(mediaSession.getSessionToken());
            }
            mediaStyle.setShowActionsInCompactView(0, 1, 2);
            builder.setStyle(mediaStyle);
        }

        builder.addAction(new Notification.Action.Builder(
                android.R.drawable.ic_media_previous, "Previous", prevIntent).build());

        if (currentIsPlaying) {
            builder.addAction(new Notification.Action.Builder(
                    android.R.drawable.ic_media_pause, "Pause", playPauseIntent).build());
        } else {
            builder.addAction(new Notification.Action.Builder(
                    android.R.drawable.ic_media_play, "Play", playPauseIntent).build());
        }

        builder.addAction(new Notification.Action.Builder(
                android.R.drawable.ic_media_next, "Next", nextIntent).build());

        if (currentCoverBitmap != null) {
            builder.setLargeIcon(currentCoverBitmap);
        }

        return builder.build();
    }

    private PendingIntent getPendingActionIntent(String action, int requestCode) {
        Intent intent = new Intent(this, BackgroundAudioService.class);
        intent.setAction(action);
        int flags = PendingIntent.FLAG_UPDATE_CURRENT;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            flags |= PendingIntent.FLAG_IMMUTABLE;
        }
        return PendingIntent.getService(this, requestCode, intent, flags);
    }

    private void updateNotification() {
        try {
            Notification notification = buildNotification();
            NotificationManager manager = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
            if (manager != null) {
                manager.notify(NOTIFICATION_ID, notification);
            }
        } catch (Exception ignored) {}
    }

    private void loadCoverArtAsync(final String coverUrl) {
        if (coverUrl == null || coverUrl.trim().isEmpty()) {
            currentCoverBitmap = null;
            updateMediaPlaybackState();
            updateNotification();
            return;
        }
        if (coverUrl.equals(currentCoverUrl) && currentCoverBitmap != null) {
            return;
        }
        currentCoverUrl = coverUrl;
        imageExecutor.execute(new Runnable() {
            @Override
            public void run() {
                try {
                    URL url = new URL(coverUrl);
                    HttpURLConnection connection = (HttpURLConnection) url.openConnection();
                    connection.setDoInput(true);
                    connection.setConnectTimeout(5000);
                    connection.setReadTimeout(5000);
                    connection.connect();
                    InputStream input = connection.getInputStream();
                    Bitmap bitmap = BitmapFactory.decodeStream(input);
                    if (bitmap != null) {
                        currentCoverBitmap = bitmap;
                        updateMediaPlaybackState();
                        updateNotification();
                    }
                } catch (Exception ignored) {}
            }
        });
    }

    private void stopForegroundAndSelf() {
        releaseLocks();
        if (mediaSession != null) {
            try {
                mediaSession.setActive(false);
                mediaSession.release();
            } catch (Exception ignored) {}
            mediaSession = null;
        }
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
            stopForeground(STOP_FOREGROUND_REMOVE);
        } else {
            stopForeground(true);
        }
        stopSelf();
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        if (intent == null) {
            return START_STICKY;
        }

        String action = intent.getAction();
        if (ACTION_STOP.equals(action)) {
            stopForegroundAndSelf();
            return START_NOT_STICKY;
        } else if (ACTION_PREVIOUS.equals(action)) {
            BackgroundAudioPlugin.emitMediaAction("previous", -1);
            return START_STICKY;
        } else if (ACTION_PLAY.equals(action)) {
            currentIsPlaying = true;
            updateMediaPlaybackState();
            BackgroundAudioPlugin.emitMediaAction("play", currentPosition);
            updateNotification();
            return START_STICKY;
        } else if (ACTION_PAUSE.equals(action)) {
            currentIsPlaying = false;
            updateMediaPlaybackState();
            BackgroundAudioPlugin.emitMediaAction("pause", currentPosition);
            updateNotification();
            return START_STICKY;
        } else if (ACTION_NEXT.equals(action)) {
            BackgroundAudioPlugin.emitMediaAction("next", -1);
            return START_STICKY;
        }

        String title = intent.getStringExtra(EXTRA_TITLE);
        String artist = intent.getStringExtra(EXTRA_ARTIST);
        String coverUrl = intent.getStringExtra(EXTRA_COVER_URL);
        boolean isPlaying = intent.getBooleanExtra(EXTRA_IS_PLAYING, true);
        long duration = intent.getLongExtra(EXTRA_DURATION, 0L);
        long position = intent.getLongExtra(EXTRA_POSITION, 0L);

        currentTitle = (title != null && !title.trim().isEmpty()) ? title : "Playing Audio";
        currentArtist = (artist != null && !artist.trim().isEmpty()) ? artist : "StreamPlay";
        currentIsPlaying = isPlaying;
        currentDuration = duration;
        currentPosition = position;

        acquireLocks();
        initMediaSession();
        updateMediaPlaybackState();
        loadCoverArtAsync(coverUrl);

        Notification notification = buildNotification();

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.UPSIDE_DOWN_CAKE) { // Android 14+
            startForeground(NOTIFICATION_ID, notification, ServiceInfo.FOREGROUND_SERVICE_TYPE_MEDIA_PLAYBACK);
        } else {
            startForeground(NOTIFICATION_ID, notification);
        }

        return START_STICKY;
    }

    @Override
    public void onDestroy() {
        releaseLocks();
        if (mediaSession != null) {
            try {
                mediaSession.setActive(false);
                mediaSession.release();
            } catch (Exception ignored) {}
            mediaSession = null;
        }
        super.onDestroy();
    }

    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }
}
