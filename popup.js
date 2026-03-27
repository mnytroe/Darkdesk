const toggle = document.getElementById("toggle");
const status = document.getElementById("status");

chrome.storage.local.get({ darkdesk_enabled: true }, (data) => {
  toggle.checked = data.darkdesk_enabled;
  updateStatus(data.darkdesk_enabled);
});

toggle.addEventListener("change", () => {
  const enabled = toggle.checked;
  chrome.storage.local.set({ darkdesk_enabled: enabled });
  updateStatus(enabled);
});

function updateStatus(enabled) {
  status.textContent = enabled ? "Aktiv på *.freshdesk.com" : "Deaktivert";
}
