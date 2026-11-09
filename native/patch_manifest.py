p = 'android/app/src/main/AndroidManifest.xml'
s = open(p, encoding='utf-8').read()
perms = ['CAMERA', 'RECORD_AUDIO', 'MODIFY_AUDIO_SETTINGS', 'VIBRATE', 'POST_NOTIFICATIONS',
         'READ_CONTACTS', 'SEND_SMS', 'FOREGROUND_SERVICE', 'FOREGROUND_SERVICE_MICROPHONE', 'WAKE_LOCK']
block = ''.join('<uses-permission android:name="android.permission.%s"/>' % x for x in perms)
block += '<uses-permission android:name="com.android.alarm.permission.SET_ALARM"/>'
block += '<queries><intent><action android:name="android.intent.action.MAIN"/><category android:name="android.intent.category.LAUNCHER"/></intent></queries>'
assert s.count('<application') == 1
s = s.replace('<application', block + '<application', 1)
svc = ('<service android:name=".VXAccess" android:exported="true" android:permission="android.permission.BIND_ACCESSIBILITY_SERVICE">'
       '<intent-filter><action android:name="android.accessibilityservice.AccessibilityService"/></intent-filter>'
       '<meta-data android:name="android.accessibilityservice" android:resource="@xml/vx_access"/></service>'
       '<service android:name=".VXNotif" android:exported="true" android:permission="android.permission.BIND_NOTIFICATION_LISTENER_SERVICE">'
       '<intent-filter><action android:name="android.service.notification.NotificationListenerService"/></intent-filter></service>'
       '<service android:name=".VXKeep" android:exported="false" android:foregroundServiceType="microphone"/>'
       '<receiver android:name=".VXAlarm" android:exported="false"/>')
s = s.replace('</application>', svc + '</application>', 1)
open(p, 'w', encoding='utf-8').write(s)
print('manifest patched')
