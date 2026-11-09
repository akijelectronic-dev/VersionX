package com.akij.versionx;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.content.pm.ServiceInfo;
import android.os.Build;
import android.os.IBinder;
import androidx.core.app.NotificationCompat;

public class VXKeep extends Service {
  @Override
  public void onCreate() {
    super.onCreate();
    NotificationManager nm = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
    if (Build.VERSION.SDK_INT >= 26)
      nm.createNotificationChannel(new NotificationChannel("vx_keep", "সাদিয়া পাশে আছে", NotificationManager.IMPORTANCE_LOW));
    Notification n = new NotificationCompat.Builder(this, "vx_keep")
        .setSmallIcon(android.R.drawable.ic_btn_speak_now)
        .setContentTitle("সাদিয়া পাশে আছে")
        .setContentText("ডাকলেই সাড়া দেব")
        .setOngoing(true)
        .build();
    if (Build.VERSION.SDK_INT >= 29) startForeground(1, n, ServiceInfo.FOREGROUND_SERVICE_TYPE_MICROPHONE);
    else startForeground(1, n);
  }

  @Override
  public int onStartCommand(Intent intent, int flags, int startId) { return START_STICKY; }

  @Override
  public IBinder onBind(Intent intent) { return null; }
}
