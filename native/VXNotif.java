package com.akij.versionx;

import android.app.Notification;
import android.service.notification.NotificationListenerService;
import android.service.notification.StatusBarNotification;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

public class VXNotif extends NotificationListenerService {
  public static final List<String> recent = Collections.synchronizedList(new ArrayList<String>());

  @Override
  public void onNotificationPosted(StatusBarNotification sbn) {
    if (sbn == null || sbn.getNotification() == null) return;
    if (sbn.getPackageName() != null && sbn.getPackageName().equals(getPackageName())) return;
    Notification n = sbn.getNotification();
    CharSequence t = n.extras.getCharSequence(Notification.EXTRA_TITLE);
    CharSequence x = n.extras.getCharSequence(Notification.EXTRA_TEXT);
    String s = sbn.getPackageName() + ": " + (t == null ? "" : t) + " - " + (x == null ? "" : x);
    recent.add(0, s);
    while (recent.size() > 10) recent.remove(recent.size() - 1);
  }
}
