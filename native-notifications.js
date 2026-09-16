// GlowFit native notification bridge.
// In a normal browser/PWA this file intentionally does nothing.
// Inside the Capacitor Android app it schedules an OS notification only while
// the app is in the background, so YouTube/other apps can stay in the foreground.
(function () {
  const NOTIFICATION_ID = 260916;
  let setupTried = false;

  function getLocalNotifications() {
    try {
      return window.Capacitor && window.Capacitor.Plugins
        ? window.Capacitor.Plugins.LocalNotifications
        : null;
    } catch (_) {
      return null;
    }
  }

  function getRestState() {
    try {
      const raw = localStorage.getItem('rest_timer_state');
      if (!raw) return null;
      const state = JSON.parse(raw);
      if (!state || !state.endTime) return null;
      return state;
    } catch (_) {
      return null;
    }
  }

  async function ensureNotificationPermission() {
    const plugin = getLocalNotifications();
    if (!plugin) return false;

    try {
      let permission = await plugin.checkPermissions();
      if (!permission || permission.display !== 'granted') {
        permission = await plugin.requestPermissions();
      }
      return !!permission && permission.display === 'granted';
    } catch (error) {
      console.warn('Notification permission error:', error);
      return false;
    }
  }

  async function checkExactAlarmOnce() {
    const plugin = getLocalNotifications();
    if (!plugin || setupTried) return;
    setupTried = true;

    try {
      if (!plugin.checkExactNotificationSetting || !plugin.changeExactNotificationSetting) return;
      const status = await plugin.checkExactNotificationSetting();
      if (status && status.exact_alarm === 'granted') return;

      // Ask once. If the user declines, the app still works but Android may deliver
      // the background rest notification slightly late.
      if (!localStorage.getItem('glowfit_exact_alarm_prompted')) {
        localStorage.setItem('glowfit_exact_alarm_prompted', '1');
        setTimeout(async () => {
          const openSettings = confirm(
            '백그라운드에서도 휴식 종료 알림을 정확한 시간에 받으려면 "알람 및 리마인더" 권한이 필요합니다. 설정 화면을 열까요?'
          );
          if (openSettings) {
            try { await plugin.changeExactNotificationSetting(); } catch (_) {}
          }
        }, 700);
      }
    } catch (error) {
      console.warn('Exact alarm check error:', error);
    }
  }

  async function cancelBackgroundRestNotification() {
    const plugin = getLocalNotifications();
    if (!plugin) return;
    try {
      await plugin.cancel({ notifications: [{ id: NOTIFICATION_ID }] });
    } catch (_) {}
  }

  async function scheduleBackgroundRestNotification() {
    const plugin = getLocalNotifications();
    if (!plugin) return;

    const state = getRestState();
    if (!state) return;

    const endTime = Number(state.endTime);
    if (!Number.isFinite(endTime) || endTime <= Date.now()) return;

    const allowed = await ensureNotificationPermission();
    if (!allowed) return;
    await checkExactAlarmOnce();
    await cancelBackgroundRestNotification();

    try {
      const result = await plugin.schedule({
        notifications: [{
          id: NOTIFICATION_ID,
          title: '휴식 종료',
          body: `${state.exName || '운동'} 다음 세트를 시작할 시간입니다.`,
          schedule: { at: new Date(endTime) },
          extra: { type: 'rest-timer' }
        }]
      });
      if (result && result.warning) {
        console.warn('Local notification warning:', result.warning);
      }
    } catch (error) {
      console.warn('Unable to schedule rest notification:', error);
    }
  }

  async function handleVisibility() {
    if (!getLocalNotifications()) return;

    if (document.visibilityState === 'hidden') {
      await scheduleBackgroundRestNotification();
    } else {
      // Foreground: the existing JavaScript timer/beep handles the alert, so cancel
      // the OS notification to avoid a double alarm.
      await cancelBackgroundRestNotification();
    }
  }

  document.addEventListener('visibilitychange', handleVisibility);
  window.addEventListener('pagehide', scheduleBackgroundRestNotification);
  window.addEventListener('pageshow', cancelBackgroundRestNotification);

  // If a rest timer is explicitly stopped (session finish, etc.), cancel the pending OS alarm too.
  const originalStopRestTimer = window.stopRestTimer;
  if (typeof originalStopRestTimer === 'function') {
    window.stopRestTimer = function (...args) {
      cancelBackgroundRestNotification();
      return originalStopRestTimer.apply(this, args);
    };
  }

  // Ask only for normal notification permission at native app startup.
  // Exact-alarm settings are requested only when the feature is first needed.
  window.addEventListener('load', async () => {
    if (getLocalNotifications()) {
      await ensureNotificationPermission();
    }
  });
})();
