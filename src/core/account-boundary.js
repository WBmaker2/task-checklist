(function () {
  function normalizeOwnerState(ownerState) {
    return ownerState || {};
  }

  function resolveOwnerTransition(syncMeta, nextUserId) {
    if (!nextUserId) {
      return {
        kind: "signed-out",
        blocked: false,
        nextOwnerUserId: null,
      };
    }

    const currentOwnerUserId = normalizeOwnerState(syncMeta).ownerUserId || null;
    if (!currentOwnerUserId) {
      return {
        kind: "claim-empty-owner",
        blocked: false,
        nextOwnerUserId: nextUserId,
      };
    }

    if (currentOwnerUserId !== nextUserId) {
      return {
        kind: "account-switch",
        blocked: true,
        previousOwnerUserId: currentOwnerUserId,
        nextOwnerUserId: nextUserId,
      };
    }

    return {
      kind: "same-owner",
      blocked: false,
      ownerUserId: currentOwnerUserId,
      nextOwnerUserId: nextUserId,
    };
  }

  function canScheduleAutoBackup(input) {
    const payload = input || {};
    return Boolean(
      payload.serviceOk &&
        payload.userId &&
        payload.ownerUserId &&
        payload.ownerUserId === payload.userId &&
        payload.dirty &&
        !payload.serverAhead &&
        !payload.busy &&
        !payload.accountSwitchBlocked
    );
  }

  window.AppAccountBoundary = {
    resolveOwnerTransition,
    canScheduleAutoBackup,
  };
})();
