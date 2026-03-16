(function () {
  function toVersion(value) {
    const n = Number(value);
    return Number.isFinite(n) && n > 0 ? Math.floor(n) : null;
  }

  function isServerAhead(meta, syncMeta) {
    if (!meta || !meta.exists) {
      return false;
    }

    const serverVersion = toVersion(meta.version) || 0;
    const baseVersion = toVersion(syncMeta?.baseVersion) || 0;
    return serverVersion > baseVersion;
  }

  function resolveNextBaseVersion(resultVersion, latestVersion, currentBaseVersion) {
    return toVersion(resultVersion) || toVersion(latestVersion) || toVersion(currentBaseVersion) || null;
  }

  window.AppSyncState = {
    toVersion,
    isServerAhead,
    resolveNextBaseVersion,
  };
})();
