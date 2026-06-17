// ESix10 push service worker — PUSH NOTIFICATIONS ONLY.
//
// Intentionally has NO 'fetch' handler and does NO caching, so it can never
// interfere with the app's build-time auto-updater or serve stale code.
// Its only jobs: receive a push and show the banner, and open the app on tap.

self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch (e) {
    data = { title: "ESix10", body: event.data ? event.data.text() : "" };
  }
  const title = data.title || "ESix10";
  const options = {
    body: data.body || "",
    icon: "/esix10logo.png",
    badge: "/esix10logo.png",
    data: { url: data.url || "/" },
    tag: data.tag || undefined,        // same tag collapses duplicates
    renotify: !!data.tag,
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || "/";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((list) => {
      for (const client of list) {
        if ("focus" in client) {
          if ("navigate" in client) client.navigate(url);
          return client.focus();
        }
      }
      if (self.clients.openWindow) return self.clients.openWindow(url);
    })
  );
});

// Activate immediately so push works without an extra reload.
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));
