(function () {
  const LOCAL_HOSTS = new Set(["", "localhost", "127.0.0.1"]);

  const CONFIGS = {
    dev: {
      apiKey: "AIzaSyDuGV6pMtabU0RfodV02EPa4W_LVBKskUA",
      authDomain: "task-checklist-dev.firebaseapp.com",
      projectId: "task-checklist-dev",
      appId: "1:286657851164:web:398e76bc05e00642b214d9",
      storageBucket: "task-checklist-dev.firebasestorage.app",
      messagingSenderId: "286657851164",
    },
    prod: {
      apiKey: "AIzaSyAJbdt-MQt3xLMEwpn7rwLoc1B3_Kv5ew0",
      authDomain: "task-checklist-prod.firebaseapp.com",
      projectId: "task-checklist-prod",
      appId: "1:1085328819177:web:b61e302c783a615c2b4178",
      storageBucket: "task-checklist-prod.firebasestorage.app",
      messagingSenderId: "1085328819177",
    },
  };

  function resolveFirebaseEnv() {
    const params = new URLSearchParams(window.location.search);
    const requested = (params.get("firebaseEnv") || window.FIREBASE_ENV || "").trim().toLowerCase();
    if (requested === "dev" || requested === "prod") {
      return requested;
    }

    const hostname = (window.location.hostname || "").trim().toLowerCase();
    return LOCAL_HOSTS.has(hostname) ? "dev" : "prod";
  }

  const env = resolveFirebaseEnv();

  window.FIREBASE_ENV = env;
  window.FIREBASE_CONFIGS = CONFIGS;
  window.FIREBASE_CONFIG = { ...CONFIGS[env] };
})();
