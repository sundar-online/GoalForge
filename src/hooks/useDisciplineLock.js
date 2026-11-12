import { useCallback, useState } from 'react';
import { useAppContext } from '../context/AppContext';
import {
  checkInstagramLockStatus,
  isNativeAndroidPlatform,
  openNativeLockScreen,
} from '../services/disciplineLockService';

/**
 * Unified hook for Discipline Lock state, permissions, syncing, and blocking controls.
 */
export function useDisciplineLock() {
  const {
    disciplineLockState,
    disciplineProgress,
    disciplineDecision,
    disciplinePermissionStatus,
    disciplineSyncing,
    enableDisciplineLock,
    disableDisciplineLock,
    refreshDisciplinePermissions,
    requestDisciplineLockPermission,
    syncDisciplineLockNow,
    showDisciplineLockPreview,
    setShowDisciplineLockPreview,
  } = useAppContext();

  const [instagramStatus, setInstagramStatus] = useState(null);

  const checkInstagram = useCallback(async () => {
    const res = await checkInstagramLockStatus();
    setInstagramStatus(res);
    return res;
  }, []);

  const previewLockScreen = useCallback(async () => {
    if (isNativeAndroidPlatform()) {
      const res = await openNativeLockScreen();
      if (res?.opened) return;
    }
    setShowDisciplineLockPreview(true);
  }, [setShowDisciplineLockPreview]);

  return {
    lockState: disciplineLockState,
    dailyProgress: disciplineProgress,
    decision: disciplineDecision,
    permissionStatus: disciplinePermissionStatus,
    syncing: disciplineSyncing,
    isNativeAndroid: isNativeAndroidPlatform(),
    instagramStatus,
    enableDisciplineLock,
    disableDisciplineLock,
    refreshPermissions: refreshDisciplinePermissions,
    requestPermission: requestDisciplineLockPermission,
    syncNow: syncDisciplineLockNow,
    checkInstagram,
    showPreview: showDisciplineLockPreview,
    setShowPreview: setShowDisciplineLockPreview,
    previewLockScreen,
  };
}

export default useDisciplineLock;

