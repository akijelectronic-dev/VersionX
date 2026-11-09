package com.akij.versionx;

import android.accessibilityservice.AccessibilityService;
import android.view.accessibility.AccessibilityEvent;
import android.view.accessibility.AccessibilityNodeInfo;
import java.util.List;

public class VXAccess extends AccessibilityService {
  private static volatile long armedUntil = 0;

  public static void arm(long ms) { armedUntil = System.currentTimeMillis() + ms; }

  @Override
  public void onAccessibilityEvent(AccessibilityEvent e) {
    if (System.currentTimeMillis() > armedUntil) return;
    CharSequence pkg = e.getPackageName();
    if (pkg == null || !"com.whatsapp".contentEquals(pkg)) return;
    AccessibilityNodeInfo root = getRootInActiveWindow();
    if (root == null) return;
    String[] labels = {"Send", "পাঠান"};
    for (String label : labels) {
      List<AccessibilityNodeInfo> nodes = root.findAccessibilityNodeInfosByText(label);
      if (nodes == null) continue;
      for (AccessibilityNodeInfo n : nodes) {
        AccessibilityNodeInfo c = n;
        while (c != null) {
          if (c.isClickable()) {
            c.performAction(AccessibilityNodeInfo.ACTION_CLICK);
            armedUntil = 0;
            return;
          }
          c = c.getParent();
        }
      }
    }
  }

  @Override
  public void onInterrupt() {}
}
