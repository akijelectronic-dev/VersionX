package com.akij.versionx;

import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.os.Build;
import androidx.core.app.NotificationCompat;

public class VXAlarm extends BroadcastReceiver {
  @Override
  public void onReceive(Context ctx, Intent intent) {
    String msg = intent.getStringExtra("msg");
    if (msg == null) msg = "সাদিয়া মনে করিয়ে দিচ্ছে";
    NotificationManager nm = (NotificationManager) ctx.getSystemService(Context.NOTIFICATION_SERVICE);
    if (Build.VERSION.SDK_INT >= 26)
      nm.createNotificationChannel(new NotificationChannel("vx_remind", "সাদিয়ার রিমাইন্ডার", NotificationManager.IMPORTANCE_HIGH));
    Intent open = ctx.getPackageManager().getLaunchIntentForPackage(ctx.getPackageName());
    NotificationCompat.Builder b = new NotificationCompat.Builder(ctx, "vx_remind")
        .setSmallIcon(android.R.drawable.ic_dialog_info)
        .setContentTitle("সাদিয়া")
        .setContentText(msg)
        .setPriority(NotificationCompat.PRIORITY_HIGH)
        .setAutoCancel(true);
    if (open != null) b.setContentIntent(PendingIntent.getActivity(ctx, 0, open, PendingIntent.FLAG_IMMUTABLE));
    nm.notify((int) (System.currentTimeMillis() & 0x7fffffff), b.build());
  }
}
