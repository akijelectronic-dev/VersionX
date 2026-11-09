package com.akij.versionx;

import android.app.AlarmManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.content.pm.ResolveInfo;
import android.database.Cursor;
import android.hardware.camera2.CameraManager;
import android.media.AudioManager;
import android.net.Uri;
import android.provider.AlarmClock;
import android.provider.CalendarContract;
import android.provider.ContactsContract;
import android.provider.Settings;
import android.telephony.SmsManager;
import androidx.core.content.ContextCompat;
import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.util.Calendar;
import java.util.List;

@CapacitorPlugin(name = "VXDevice")
public class VXDevicePlugin extends Plugin {

  private void start(Intent i) {
    i.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
    getContext().startActivity(i);
  }

  private PendingIntent pending(String msg, int code) {
    Intent i = new Intent(getContext(), VXAlarm.class).putExtra("msg", msg);
    return PendingIntent.getBroadcast(getContext(), code, i, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
  }

  @PluginMethod
  public void launchApp(PluginCall call) {
    String q = call.getString("name", "").toLowerCase().trim();
    PackageManager pm = getContext().getPackageManager();
    Intent main = new Intent(Intent.ACTION_MAIN, null);
    main.addCategory(Intent.CATEGORY_LAUNCHER);
    List<ResolveInfo> list = pm.queryIntentActivities(main, 0);
    ResolveInfo best = null;
    for (ResolveInfo r : list) {
      String n = r.loadLabel(pm).toString().toLowerCase();
      if (n.equals(q)) { best = r; break; }
      if (best == null && !n.isEmpty() && !q.isEmpty() && (n.contains(q) || q.contains(n))) best = r;
    }
    JSObject o = new JSObject();
    if (best == null) { o.put("ok", false); call.resolve(o); return; }
    Intent i = pm.getLaunchIntentForPackage(best.activityInfo.packageName);
    if (i == null) { o.put("ok", false); call.resolve(o); return; }
    start(i);
    o.put("ok", true);
    o.put("label", best.loadLabel(pm).toString());
    call.resolve(o);
  }

  @PluginMethod
  public void flashlight(PluginCall call) {
    try {
      CameraManager cm = (CameraManager) getContext().getSystemService(Context.CAMERA_SERVICE);
      cm.setTorchMode(cm.getCameraIdList()[0], call.getBoolean("on", true));
      call.resolve();
    } catch (Exception e) { call.reject(e.getMessage()); }
  }

  @PluginMethod
  public void volume(PluginCall call) {
    AudioManager am = (AudioManager) getContext().getSystemService(Context.AUDIO_SERVICE);
    int max = am.getStreamMaxVolume(AudioManager.STREAM_MUSIC);
    am.setStreamVolume(AudioManager.STREAM_MUSIC, Math.round(max * call.getInt("level", 50) / 100f), AudioManager.FLAG_SHOW_UI);
    call.resolve();
  }

  @PluginMethod
  public void settings(PluginCall call) {
    String p = call.getString("page", "");
    String a = Settings.ACTION_SETTINGS;
    switch (p) {
      case "wifi": a = Settings.ACTION_WIFI_SETTINGS; break;
      case "bluetooth": a = Settings.ACTION_BLUETOOTH_SETTINGS; break;
      case "display": a = Settings.ACTION_DISPLAY_SETTINGS; break;
      case "sound": a = Settings.ACTION_SOUND_SETTINGS; break;
      case "battery": a = Intent.ACTION_POWER_USAGE_SUMMARY; break;
      case "location": a = Settings.ACTION_LOCATION_SOURCE_SETTINGS; break;
      case "airplane": a = Settings.ACTION_AIRPLANE_MODE_SETTINGS; break;
      case "apps": a = Settings.ACTION_APPLICATION_SETTINGS; break;
      default: break;
    }
    start(new Intent(a));
    call.resolve();
  }

  @PluginMethod
  public void dial(PluginCall call) {
    start(new Intent(Intent.ACTION_DIAL, Uri.parse("tel:" + call.getString("number", ""))));
    call.resolve();
  }

  @PluginMethod
  public void findContact(PluginCall call) {
    String q = call.getString("name", "").toLowerCase().trim();
    JSObject o = new JSObject();
    try (Cursor c = getContext().getContentResolver().query(
        ContactsContract.CommonDataKinds.Phone.CONTENT_URI,
        new String[]{ContactsContract.CommonDataKinds.Phone.DISPLAY_NAME, ContactsContract.CommonDataKinds.Phone.NUMBER},
        null, null, null)) {
      if (c != null) {
        while (c.moveToNext()) {
          String n = c.getString(0), num = c.getString(1);
          if (n != null && num != null && n.toLowerCase().contains(q)) { o.put("name", n); o.put("number", num); break; }
        }
      }
    } catch (SecurityException e) {
      call.reject("কন্টাক্টের অনুমতি নেই। Settings → Apps → Sadia AI → Permissions থেকে Contacts চালু করুন।");
      return;
    }
    call.resolve(o);
  }

  @PluginMethod
  public void setAlarm(PluginCall call) {
    Intent i = new Intent(AlarmClock.ACTION_SET_ALARM)
        .putExtra(AlarmClock.EXTRA_HOUR, call.getInt("hour", 7))
        .putExtra(AlarmClock.EXTRA_MINUTES, call.getInt("minute", 0))
        .putExtra(AlarmClock.EXTRA_MESSAGE, call.getString("message", "সাদিয়া"))
        .putExtra(AlarmClock.EXTRA_SKIP_UI, true);
    start(i);
    call.resolve();
  }

  @PluginMethod
  public void setTimer(PluginCall call) {
    Intent i = new Intent(AlarmClock.ACTION_SET_TIMER)
        .putExtra(AlarmClock.EXTRA_LENGTH, call.getInt("seconds", 60))
        .putExtra(AlarmClock.EXTRA_MESSAGE, call.getString("message", "টাইমার"))
        .putExtra(AlarmClock.EXTRA_SKIP_UI, true);
    start(i);
    call.resolve();
  }

  @PluginMethod
  public void addEvent(PluginCall call) {
    Double ms = call.getDouble("startMillis", (double) System.currentTimeMillis());
    long start = ms.longValue();
    Intent i = new Intent(Intent.ACTION_INSERT)
        .setData(CalendarContract.Events.CONTENT_URI)
        .putExtra(CalendarContract.Events.TITLE, call.getString("title", "ইভেন্ট"))
        .putExtra(CalendarContract.EXTRA_EVENT_BEGIN_TIME, start)
        .putExtra(CalendarContract.EXTRA_EVENT_END_TIME, start + 3600000L);
    start(i);
    call.resolve();
  }

  @PluginMethod
  public void sendSms(PluginCall call) {
    try {
      SmsManager.getDefault().sendTextMessage(call.getString("number", ""), null, call.getString("text", ""), null, null);
      call.resolve();
    } catch (Exception e) {
      call.reject("এসএমএসের অনুমতি নেই। Settings → Apps → Sadia AI → Permissions থেকে SMS চালু করুন।");
    }
  }

  @PluginMethod
  public void openWhatsApp(PluginCall call) {
    VXAccess.arm(25000);
    String num = call.getString("number", "");
    Uri uri = Uri.parse("https://wa.me/" + num + "?text=" + Uri.encode(call.getString("text", "")));
    start(new Intent(Intent.ACTION_VIEW, uri));
    call.resolve();
  }

  @PluginMethod
  public void readNotifications(PluginCall call) {
    JSArray arr = new JSArray();
    for (String s : VXNotif.recent) arr.put(s);
    JSObject o = new JSObject();
    o.put("items", arr);
    call.resolve(o);
  }

  @PluginMethod
  public void scheduleReminder(PluginCall call) {
    AlarmManager am = (AlarmManager) getContext().getSystemService(Context.ALARM_SERVICE);
    long at = System.currentTimeMillis() + call.getInt("seconds", 60) * 1000L;
    am.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, at,
        pending(call.getString("message", "মনে করিয়ে দিচ্ছি"), (int) (System.nanoTime() & 0x7fffffff)));
    call.resolve();
  }

  @PluginMethod
  public void scheduleDaily(PluginCall call) {
    Calendar c = Calendar.getInstance();
    c.set(Calendar.HOUR_OF_DAY, call.getInt("hour", 7));
    c.set(Calendar.MINUTE, call.getInt("minute", 0));
    c.set(Calendar.SECOND, 0);
    if (c.getTimeInMillis() < System.currentTimeMillis()) c.add(Calendar.DAY_OF_MONTH, 1);
    AlarmManager am = (AlarmManager) getContext().getSystemService(Context.ALARM_SERVICE);
    am.setRepeating(AlarmManager.RTC_WAKEUP, c.getTimeInMillis(), AlarmManager.INTERVAL_DAY,
        pending(call.getString("message", "সুপ্রভাত"), 7001));
    call.resolve();
  }

  @PluginMethod
  public void keepAlive(PluginCall call) {
    Intent i = new Intent(getContext(), VXKeep.class);
    if (call.getBoolean("on", true)) ContextCompat.startForegroundService(getContext(), i);
    else getContext().stopService(i);
    call.resolve();
  }
}
