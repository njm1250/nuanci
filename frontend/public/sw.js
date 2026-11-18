// nuanci 알림 서비스 워커. 서버가 보낸 한 통을 띄우고, 누르면 그 장면을 열면서 "알림을 눌러 들어왔다"를 남긴다
self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {}
  const title = data.title || "nuanci";
  event.waitUntil(
    self.registration.showNotification(title, {
      body: data.body || "",
      icon: "/apple-icon",
      tag: "nuanci-next",
      data: { url: data.url || "/", visitorId: data.visitorId },
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const { url, visitorId } = event.notification.data || {};
  const opened = visitorId
    ? fetch("/api/events", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ type: "push_opened", visitorId }) }).catch(() => {})
    : Promise.resolve();
  event.waitUntil(Promise.all([opened, self.clients.openWindow(url || "/")]));
});
