(function (global) {
  'use strict';

  const SYNC_MODE_KEY = 'deutschwort_sync_mode_v1';
  const SHARED_USER_KEY = 'deutschwort_shared_user_v1';
  const CLOUD_DIRTY_KEY = 'deutschwort_cloud_dirty_v1';

  const VIRTUAL_DOMAIN = global.DEUTSCHWORT_VIRTUAL_EMAIL_DOMAIN || 'noemail.vocab.local';

  let app = null;
  let auth = null;
  let db = null;
  let firebaseReady = false;
  let authActionInFlight = false;
  let pushTimer = null;
  let initialized = false;

  const callbacks = {
    onStateChange: null,
    onProgressUpdated: null,
    onConflict: null,
    getLang: null
  };

  function currentLang(explicitLang) {
    if (explicitLang === 'en' || explicitLang === 'zh') return explicitLang;
    if (typeof callbacks.getLang === 'function') {
      try {
        return callbacks.getLang() === 'en' ? 'en' : 'zh';
      } catch (_e) {
        return 'zh';
      }
    }
    return 'zh';
  }

  const state = {
    mode: 'guest', // 'guest' | 'auth' | 'shared'
    uid: null,
    username: '',
    email: '',
    hasRealEmail: false,
    syncStatus: 'local', // 'local' | 'syncing' | 'synced' | 'error'
    lastSyncedAt: null,
    lastError: '',
    firebaseReady: false
  };

  function isVirtualEmail(email) {
    return typeof email === 'string' && email.toLowerCase().endsWith('@' + VIRTUAL_DOMAIN);
  }

  function extractUsernameFromVirtualEmail(email) {
    if (!isVirtualEmail(email)) return '';
    return email.slice(0, email.indexOf('@'));
  }

  function setDirty(dirty) {
    try {
      if (dirty) {
        global.localStorage.setItem(CLOUD_DIRTY_KEY, '1');
      } else {
        global.localStorage.removeItem(CLOUD_DIRTY_KEY);
      }
    } catch (_e) {
      // ignore
    }
  }

  function isDirty() {
    try {
      return global.localStorage.getItem(CLOUD_DIRTY_KEY) === '1';
    } catch (_e) {
      return false;
    }
  }

  function saveModeMeta(mode, sharedUsername) {
    try {
      global.localStorage.setItem(SYNC_MODE_KEY, mode);
      if (mode === 'shared' && sharedUsername) {
        global.localStorage.setItem(SHARED_USER_KEY, sharedUsername);
      } else {
        global.localStorage.removeItem(SHARED_USER_KEY);
      }
    } catch (_e) {
      // ignore
    }
  }

  function loadModeMeta() {
    try {
      const savedMode = global.localStorage.getItem(SYNC_MODE_KEY);
      const savedShared = global.localStorage.getItem(SHARED_USER_KEY) || '';
      if (savedMode === 'auth' || savedMode === 'shared' || savedMode === 'guest') {
        return { mode: savedMode, sharedUsername: savedShared };
      }
    } catch (_e) {
      // ignore
    }
    return { mode: 'guest', sharedUsername: '' };
  }

  function emitState() {
    if (typeof callbacks.onStateChange === 'function') {
      try {
        callbacks.onStateChange(getState());
      } catch (_e) {
        // ignore
      }
    }
  }

  function emitProgressUpdated() {
    if (typeof callbacks.onProgressUpdated === 'function') {
      try {
        callbacks.onProgressUpdated();
      } catch (_e) {
        // ignore
      }
    }
  }

  function getState() {
    return Object.assign({}, state);
  }

  function initFirebase() {
    const cfg = global.DEUTSCHWORT_FIREBASE_CONFIG;
    if (!global.firebase || !cfg || !cfg.apiKey) {
      firebaseReady = false;
      state.firebaseReady = false;
      return false;
    }
    try {
      app = global.firebase.apps && global.firebase.apps.length > 0
        ? global.firebase.app()
        : global.firebase.initializeApp(cfg);
      auth = global.firebase.auth();
      db = global.firebase.firestore();
      firebaseReady = true;
      state.firebaseReady = true;
      return true;
    } catch (err) {
      console.warn('Firebase init failed:', err);
      firebaseReady = false;
      state.firebaseReady = false;
      return false;
    }
  }

  function formatError(err, lang) {
    const isEn = lang === 'en';
    const code = String((err && err.code) || '').toLowerCase();

    if (code === 'auth/invalid-credential' || code === 'auth/invalid-login-credentials' || code === 'auth/wrong-password') {
      return isEn
        ? 'Incorrect email/username or password. Please try again.'
        : '账号或密码错误，请检查后重试。';
    }
    if (code === 'auth/user-not-found') {
      return isEn
        ? 'Account not found. Check your email/username or sign up first.'
        : '未找到该账号，请检查邮箱或用户名（若尚未注册请先注册）。';
    }
    if (code === 'auth/email-already-in-use') {
      return isEn
        ? 'This username or email is already registered. Please sign in or choose another.'
        : '该用户名或邮箱已被注册，请直接登录或更换其他用户名/邮箱。';
    }
    if (code === 'auth/weak-password') {
      return isEn
        ? 'Password must be at least 6 characters long.'
        : '密码强度不足，请至少输入 6 位字符。';
    }
    if (code === 'auth/invalid-email') {
      return isEn
        ? 'Invalid email format. Please check and try again.'
        : '邮箱格式不正确，请检查后重试。';
    }
    if (code === 'auth/missing-email') {
      return isEn
        ? 'Please enter your email address.'
        : '请输入邮箱地址。';
    }
    if (code === 'auth/network-request-failed') {
      return isEn
        ? 'Network connection failed. Please check your internet connection and try again.'
        : '网络连接失败，请检查网络后重试。';
    }
    if (code === 'auth/too-many-requests') {
      return isEn
        ? 'Too many failed attempts. Please wait a moment and try again.'
        : '尝试次数过多，请稍后再试。';
    }
    if (code === 'auth/operation-not-allowed') {
      return isEn
        ? 'Email/Password sign-in is not enabled in Firebase Console.'
        : 'Firebase 控制台尚未开启「电子邮件/密码」登录方式。';
    }
    if (code === 'auth/user-disabled') {
      return isEn
        ? 'This account has been disabled.'
        : '该账号已被停用。';
    }
    if (code === 'permission-denied' || code === 'firestore/permission-denied') {
      return isEn
        ? 'Cloud permission denied. Please check your Firestore security rules.'
        : '云端读写权限不足，请检查 Firebase Firestore 安全规则配置。';
    }
    if (code === 'unavailable' || code === 'deadline-exceeded' || code === 'failed-precondition') {
      return isEn
        ? 'Cloud service is temporarily unreachable. Progress is safely cached locally.'
        : '云端服务暂时不可用或网络已断开，进度已暂存本地。';
    }
    if (err && err.customMessage) {
      return err.customMessage;
    }
    if (!firebaseReady) {
      return isEn
        ? 'Firebase SDK failed to load. Please check your network and refresh.'
        : 'Firebase 服务未就绪，请检查网络连接后刷新页面。';
    }
    return isEn
      ? 'Sync operation failed' + (code ? ' (' + code + ')' : '') + '. Please try again.'
      : '云同步操作失败' + (code ? '（' + code + '）' : '') + '，请稍后重试。';
  }

  function validateAuthUsername(raw, lang) {
    const isEn = lang === 'en';
    const trimmed = String(raw || '').trim();
    if (!trimmed) {
      return {
        ok: false,
        error: isEn ? 'Please enter a username.' : '请输入用户名。'
      };
    }
    if (!/^[a-zA-Z0-9_]{2,24}$/.test(trimmed)) {
      return {
        ok: false,
        error: isEn
          ? 'Username must be 2–24 characters using only letters, numbers, and underscores (_).'
          : '用户名需为 2-24 位，仅支持英文字母、数字和下划线（_）。'
      };
    }
    return { ok: true, value: trimmed };
  }

  function validateSharedUsername(raw, lang) {
    const isEn = lang === 'en';
    const trimmed = String(raw || '').trim().toLowerCase();
    if (!trimmed) {
      return {
        ok: false,
        error: isEn ? 'Please enter a username.' : '请输入用于同步的用户名。'
      };
    }
    if (
      trimmed === '.' ||
      trimmed === '..' ||
      trimmed.indexOf('/') !== -1 ||
      !/^[a-z0-9_-]{2,32}$/.test(trimmed)
    ) {
      return {
        ok: false,
        error: isEn
          ? 'Username must be 2–32 characters using only letters, numbers, underscores (_), and hyphens (-). Spaces, slashes (/), and dots (.) are not allowed.'
          : '用户名需为 2-32 位，仅支持字母、数字、下划线（_）和连字符（-），不能包含空格、斜杠（/）或点号（.）。'
      };
    }
    return { ok: true, value: trimmed };
  }

  function validateEmail(raw, required, lang) {
    const isEn = lang === 'en';
    const trimmed = String(raw || '').trim();
    if (!trimmed) {
      if (required) {
        return {
          ok: false,
          error: isEn ? 'Please enter your email address.' : '请输入邮箱地址。'
        };
      }
      return { ok: true, value: '' };
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      return {
        ok: false,
        error: isEn ? 'Invalid email format. Please check and try again.' : '邮箱格式不正确，请检查后重试。'
      };
    }
    if (isVirtualEmail(trimmed)) {
      return {
        ok: false,
        error: isEn ? 'Please enter a valid real email address.' : '请输入有效的真实邮箱地址。'
      };
    }
    return { ok: true, value: trimmed };
  }

  function getDocRef(mode, uid, username) {
    if (!db) return null;
    if (mode === 'auth' && uid) {
      return db.collection('users').doc(uid);
    }
    if (mode === 'shared' && username) {
      return db.collection('shared_profiles').doc(username);
    }
    return null;
  }

  async function readCloudDoc(mode, uid, username) {
    const ref = getDocRef(mode, uid, username);
    if (!ref) return { exists: false, data: null, progress: {} };
    const snap = await ref.get();
    if (!snap.exists) {
      return { exists: false, data: null, progress: {} };
    }
    const data = snap.data() || {};
    const progress = global.SM2Store.sanitizeProgressMap(data.progress || {});
    return { exists: true, data: data, progress: progress };
  }

  async function writeCloudDoc(mode, uid, username, profileMeta, progressMap) {
    const ref = getDocRef(mode, uid, username);
    if (!ref) throw new Error('Firestore reference unavailable');
    const cleanProgress = global.SM2Store.sanitizeProgressMap(progressMap || {});
    const timestamp =
      global.firebase &&
      global.firebase.firestore &&
      global.firebase.firestore.FieldValue
        ? global.firebase.firestore.FieldValue.serverTimestamp()
        : Date.now();

    if (mode === 'auth') {
      await ref.set({
        profile: {
          username: (profileMeta && profileMeta.username) || username || '',
          hasRealEmail: Boolean(profileMeta && profileMeta.hasRealEmail),
          email: (profileMeta && profileMeta.email) || ''
        },
        progress: cleanProgress,
        updatedAt: timestamp
      });
    } else if (mode === 'shared') {
      await ref.set({
        username: username,
        progress: cleanProgress,
        updatedAt: timestamp
      });
    }
  }

  async function resolveGuestMigration(targetMode, uid, username, profileMeta, cloudProgress) {
    const SM2 = global.SM2Store;
    const guestMap = SM2.sanitizeProgressMap(SM2.loadFromKey(SM2.GUEST_STORAGE_KEY));
    const guestCount = Object.keys(guestMap).length;
    const cloudCount = Object.keys(cloudProgress).length;

    // 1) 本地无进度 -> 直接使用云端数据
    if (guestCount === 0) {
      SM2.setStorageKey(SM2.CLOUD_CACHE_KEY);
      SM2.replaceAll(cloudProgress, { silent: true });
      setDirty(false);
      return { ok: true, migration: 'loaded', progress: cloudProgress };
    }

    // 2) 本地有进度、云端为空 -> 自动上传到云端并清空游客进度避免后续误迁移
    if (cloudCount === 0) {
      await writeCloudDoc(targetMode, uid, username, profileMeta, guestMap);
      SM2.setStorageKey(SM2.CLOUD_CACHE_KEY);
      SM2.replaceAll(guestMap, { silent: true });
      SM2.clearKey(SM2.GUEST_STORAGE_KEY);
      setDirty(false);
      return { ok: true, migration: 'uploaded', uploadedCount: guestCount, progress: guestMap };
    }

    // 3) 两端都有进度，先判断是否完全一致
    if (SM2.areProgressMapsEqual(guestMap, cloudProgress)) {
      SM2.setStorageKey(SM2.CLOUD_CACHE_KEY);
      SM2.replaceAll(cloudProgress, { silent: true });
      SM2.clearKey(SM2.GUEST_STORAGE_KEY);
      setDirty(false);
      return { ok: true, migration: 'loaded', progress: cloudProgress };
    }

    // 4) 两端均有进度且存在差异 -> 弹窗询问用户
    let choice = 'merge';
    if (typeof callbacks.onConflict === 'function') {
      choice = await callbacks.onConflict({
        guestCount: guestCount,
        cloudCount: cloudCount,
        targetMode: targetMode,
        username: username
      });
    }

    if (choice === 'cancel') {
      return { ok: false, cancelled: true };
    }

    if (choice === 'merge') {
      const merged = SM2.mergeProgress(guestMap, cloudProgress);
      await writeCloudDoc(targetMode, uid, username, profileMeta, merged);
      SM2.setStorageKey(SM2.CLOUD_CACHE_KEY);
      SM2.replaceAll(merged, { silent: true });
      SM2.clearKey(SM2.GUEST_STORAGE_KEY);
      setDirty(false);
      return {
        ok: true,
        migration: 'merged',
        mergedCount: Object.keys(merged).length,
        progress: merged
      };
    }

    // choice === 'cloud'
    SM2.setStorageKey(SM2.CLOUD_CACHE_KEY);
    SM2.replaceAll(cloudProgress, { silent: true });
    SM2.clearKey(SM2.GUEST_STORAGE_KEY);
    setDirty(false);
    return { ok: true, migration: 'cloud', progress: cloudProgress };
  }

  function resetCloudCacheOnly() {
    if (pushTimer) {
      clearTimeout(pushTimer);
      pushTimer = null;
    }
    global.SM2Store.clearKey(global.SM2Store.CLOUD_CACHE_KEY);
    setDirty(false);
  }

  async function registerWithPassword(opts) {
    const lang = opts && opts.lang;
    if (!firebaseReady) {
      return { ok: false, error: formatError(null, lang) };
    }

    const userCheck = validateAuthUsername(opts && opts.username, lang);
    if (!userCheck.ok) return { ok: false, error: userCheck.error };

    const password = String((opts && opts.password) || '');
    if (password.length < 6) {
      return {
        ok: false,
        error: lang === 'en'
          ? 'Password must be at least 6 characters long.'
          : '密码长度至少为 6 位。'
      };
    }

    const emailCheck = validateEmail(opts && opts.email, false, lang);
    if (!emailCheck.ok) return { ok: false, error: emailCheck.error };

    const username = userCheck.value;
    const hasRealEmail = Boolean(emailCheck.value);
    const authEmail = hasRealEmail
      ? emailCheck.value
      : username.toLowerCase() + '@' + VIRTUAL_DOMAIN;

    const wasGuest = state.mode === 'guest';
    authActionInFlight = true;

    try {
      // 如果之前在另一个云账号下，先清空旧缓存并退出旧 Auth 会话，防止串数据
      if (!wasGuest) {
        resetCloudCacheOnly();
        if (auth.currentUser) {
          await auth.signOut();
        }
      }

      const cred = await auth.createUserWithEmailAndPassword(authEmail, password);
      const user = cred.user;

      try {
        await user.updateProfile({ displayName: username });
      } catch (_profileErr) {
        // non-fatal
      }

      const profileMeta = {
        username: username,
        hasRealEmail: hasRealEmail,
        email: hasRealEmail ? emailCheck.value : ''
      };

      const SM2 = global.SM2Store;
      let initialProgress = {};
      let migration = 'created';
      let uploadedCount = 0;

      if (wasGuest) {
        const guestMap = SM2.sanitizeProgressMap(SM2.loadFromKey(SM2.GUEST_STORAGE_KEY));
        uploadedCount = Object.keys(guestMap).length;
        if (uploadedCount > 0) {
          initialProgress = guestMap;
          migration = 'uploaded';
        }
      }

      await writeCloudDoc('auth', user.uid, username, profileMeta, initialProgress);

      SM2.setStorageKey(SM2.CLOUD_CACHE_KEY);
      SM2.replaceAll(initialProgress, { silent: true });
      if (wasGuest && uploadedCount > 0) {
        SM2.clearKey(SM2.GUEST_STORAGE_KEY);
      }
      setDirty(false);

      state.mode = 'auth';
      state.uid = user.uid;
      state.username = username;
      state.email = profileMeta.email;
      state.hasRealEmail = hasRealEmail;
      state.syncStatus = 'synced';
      state.lastSyncedAt = Date.now();
      state.lastError = '';
      saveModeMeta('auth', '');

      emitState();
      emitProgressUpdated();
      return {
        ok: true,
        migration: migration,
        uploadedCount: uploadedCount,
        username: username
      };
    } catch (err) {
      return { ok: false, error: formatError(err, lang) };
    } finally {
      authActionInFlight = false;
    }
  }

  async function loginWithPassword(opts) {
    const lang = opts && opts.lang;
    if (!firebaseReady) {
      return { ok: false, error: formatError(null, lang) };
    }

    const rawId = String((opts && opts.identifier) || '').trim();
    const password = String((opts && opts.password) || '');

    if (!rawId) {
      return {
        ok: false,
        error: lang === 'en'
          ? 'Please enter your email or username.'
          : '请输入邮箱或用户名。'
      };
    }
    if (!password) {
      return {
        ok: false,
        error: lang === 'en' ? 'Please enter your password.' : '请输入密码。'
      };
    }

    const authEmail =
      rawId.indexOf('@') !== -1
        ? rawId
        : rawId.toLowerCase() + '@' + VIRTUAL_DOMAIN;

    const wasGuest = state.mode === 'guest';
    authActionInFlight = true;

    try {
      // 如果从另一个已登录账号切换，先清空旧云端缓存，避免串数据
      if (!wasGuest) {
        resetCloudCacheOnly();
        if (auth.currentUser) {
          await auth.signOut();
        }
      }

      const cred = await auth.signInWithEmailAndPassword(authEmail, password);
      const user = cred.user;
      const cloud = await readCloudDoc('auth', user.uid, '');
      const docProfile = (cloud.data && cloud.data.profile) || {};

      const resolvedHasRealEmail =
        typeof docProfile.hasRealEmail === 'boolean'
          ? docProfile.hasRealEmail
          : !isVirtualEmail(user.email || '');

      const resolvedUsername =
        docProfile.username ||
        user.displayName ||
        extractUsernameFromVirtualEmail(user.email || '') ||
        (user.email ? user.email.split('@')[0] : 'User');

      const profileMeta = {
        username: resolvedUsername,
        hasRealEmail: resolvedHasRealEmail,
        email: resolvedHasRealEmail ? (user.email || docProfile.email || '') : ''
      };

      let migrationResult = { ok: true, migration: 'loaded' };

      if (wasGuest) {
        migrationResult = await resolveGuestMigration(
          'auth',
          user.uid,
          resolvedUsername,
          profileMeta,
          cloud.progress
        );
        if (!migrationResult.ok && migrationResult.cancelled) {
          // 用户取消迁移 -> 退回未登录，保持原游客模式与本地数据不变
          await auth.signOut();
          return { ok: false, cancelled: true };
        }
      } else {
        global.SM2Store.setStorageKey(global.SM2Store.CLOUD_CACHE_KEY);
        global.SM2Store.replaceAll(cloud.progress, { silent: true });
        setDirty(false);
      }

      state.mode = 'auth';
      state.uid = user.uid;
      state.username = resolvedUsername;
      state.email = profileMeta.email;
      state.hasRealEmail = resolvedHasRealEmail;
      state.syncStatus = 'synced';
      state.lastSyncedAt = Date.now();
      state.lastError = '';
      saveModeMeta('auth', '');

      emitState();
      emitProgressUpdated();
      return Object.assign({ ok: true, username: resolvedUsername }, migrationResult);
    } catch (err) {
      return { ok: false, error: formatError(err, lang) };
    } finally {
      authActionInFlight = false;
    }
  }

  async function sendPasswordReset(opts) {
    const lang = opts && opts.lang;
    if (!firebaseReady) {
      return { ok: false, error: formatError(null, lang) };
    }
    const check = validateEmail(opts && opts.email, true, lang);
    if (!check.ok) {
      return { ok: false, error: check.error };
    }
    try {
      await auth.sendPasswordResetEmail(check.value);
      return { ok: true };
    } catch (err) {
      return { ok: false, error: formatError(err, lang) };
    }
  }

  async function loginSharedUsername(opts) {
    const lang = opts && opts.lang;
    if (!firebaseReady) {
      return { ok: false, error: formatError(null, lang) };
    }

    const check = validateSharedUsername(opts && opts.username, lang);
    if (!check.ok) {
      return { ok: false, error: check.error };
    }
    const username = check.value;

    // 已经在同一个免密用户名下 -> 直接执行一次同步即可
    if (state.mode === 'shared' && state.username === username) {
      return syncNow(lang);
    }

    const wasGuest = state.mode === 'guest';
    authActionInFlight = true;

    try {
      // 从其他账号（模式 1 或另一个模式 2 用户名）切换 -> 清空旧缓存 & 退出 Auth，防串数据
      if (!wasGuest) {
        resetCloudCacheOnly();
        if (auth && auth.currentUser) {
          await auth.signOut();
        }
      }

      const cloud = await readCloudDoc('shared', null, username);
      let migrationResult = { ok: true, migration: 'loaded' };

      if (wasGuest) {
        migrationResult = await resolveGuestMigration(
          'shared',
          null,
          username,
          null,
          cloud.progress
        );
        if (!migrationResult.ok && migrationResult.cancelled) {
          return { ok: false, cancelled: true };
        }
      } else {
        global.SM2Store.setStorageKey(global.SM2Store.CLOUD_CACHE_KEY);
        global.SM2Store.replaceAll(cloud.progress, { silent: true });
        setDirty(false);
      }

      state.mode = 'shared';
      state.uid = null;
      state.username = username;
      state.email = '';
      state.hasRealEmail = false;
      state.syncStatus = 'synced';
      state.lastSyncedAt = Date.now();
      state.lastError = '';
      saveModeMeta('shared', username);

      emitState();
      emitProgressUpdated();
      return Object.assign({ ok: true, username: username }, migrationResult);
    } catch (err) {
      return { ok: false, error: formatError(err, lang) };
    } finally {
      authActionInFlight = false;
    }
  }

  async function switchToGuest() {
    authActionInFlight = true;
    try {
      // 清空已登录账号在浏览器中缓存的云端进度，彻底避免多账号串数据
      resetCloudCacheOnly();

      if (firebaseReady && auth && auth.currentUser) {
        try {
          await auth.signOut();
        } catch (_err) {
          // ignore signOut network errors
        }
      }

      global.SM2Store.setStorageKey(global.SM2Store.GUEST_STORAGE_KEY);
      saveModeMeta('guest', '');

      state.mode = 'guest';
      state.uid = null;
      state.username = '';
      state.email = '';
      state.hasRealEmail = false;
      state.syncStatus = 'local';
      state.lastSyncedAt = null;
      state.lastError = '';

      emitState();
      emitProgressUpdated();
      return { ok: true };
    } finally {
      authActionInFlight = false;
    }
  }

  async function syncNow(lang) {
    const activeLang = currentLang(lang);
    if (state.mode === 'guest') {
      return { ok: true, mode: 'guest' };
    }
    if (!firebaseReady) {
      return { ok: false, error: formatError(null, activeLang) };
    }

    if (pushTimer) {
      clearTimeout(pushTimer);
      pushTimer = null;
    }

    state.syncStatus = 'syncing';
    state.lastError = '';
    emitState();

    try {
      const cloud = await readCloudDoc(state.mode, state.uid, state.username);
      const SM2 = global.SM2Store;
      SM2.setStorageKey(SM2.CLOUD_CACHE_KEY);

      let finalProgress = cloud.progress;
      if (isDirty()) {
        const localCached = SM2.sanitizeProgressMap(SM2.loadFromKey(SM2.CLOUD_CACHE_KEY));
        finalProgress = SM2.mergeProgress(localCached, cloud.progress);
        await writeCloudDoc(
          state.mode,
          state.uid,
          state.username,
          {
            username: state.username,
            hasRealEmail: state.hasRealEmail,
            email: state.email
          },
          finalProgress
        );
        setDirty(false);
      }

      SM2.replaceAll(finalProgress, { silent: true });
      state.syncStatus = 'synced';
      state.lastSyncedAt = Date.now();
      state.lastError = '';

      emitState();
      emitProgressUpdated();
      return { ok: true, count: Object.keys(finalProgress).length };
    } catch (err) {
      state.syncStatus = 'error';
      state.lastError = formatError(err, activeLang);
      emitState();
      return { ok: false, error: state.lastError };
    }
  }

  function pushCurrentProgress(lang) {
    const activeLang = currentLang(lang);
    if (state.mode !== 'auth' && state.mode !== 'shared') {
      return;
    }
    setDirty(true);
    state.syncStatus = 'syncing';
    state.lastError = '';
    emitState();

    if (pushTimer) {
      clearTimeout(pushTimer);
    }

    pushTimer = setTimeout(async () => {
      pushTimer = null;
      if (state.mode !== 'auth' && state.mode !== 'shared') return;
      if (!firebaseReady) {
        state.syncStatus = 'error';
        state.lastError = formatError(null, currentLang(activeLang));
        emitState();
        return;
      }

      try {
        const currentProgress = global.SM2Store.loadAll();
        await writeCloudDoc(
          state.mode,
          state.uid,
          state.username,
          {
            username: state.username,
            hasRealEmail: state.hasRealEmail,
            email: state.email
          },
          currentProgress
        );
        setDirty(false);
        state.syncStatus = 'synced';
        state.lastSyncedAt = Date.now();
        state.lastError = '';
        emitState();
      } catch (err) {
        state.syncStatus = 'error';
        state.lastError = formatError(err, currentLang(activeLang));
        emitState();
      }
    }, 350);
  }

  function init(options) {
    if (initialized) return;
    initialized = true;

    if (options) {
      callbacks.onStateChange = options.onStateChange || null;
      callbacks.onProgressUpdated = options.onProgressUpdated || null;
      callbacks.onConflict = options.onConflict || null;
      callbacks.getLang = options.getLang || null;
    }

    initFirebase();
    const meta = loadModeMeta();

    // 1) 模式 2（免密用户名）恢复
    if (meta.mode === 'shared' && meta.sharedUsername) {
      const check = validateSharedUsername(meta.sharedUsername, 'en');
      if (check.ok) {
        global.SM2Store.setStorageKey(global.SM2Store.CLOUD_CACHE_KEY);
        state.mode = 'shared';
        state.username = check.value;
        state.syncStatus = firebaseReady ? 'syncing' : 'error';
        emitState();
        if (firebaseReady) {
          syncNow();
        }
      } else {
        global.SM2Store.setStorageKey(global.SM2Store.GUEST_STORAGE_KEY);
        saveModeMeta('guest', '');
        state.mode = 'guest';
        state.syncStatus = 'local';
        emitState();
      }
    } else if (meta.mode === 'auth') {
      // 2) 模式 1（账号+密码）先使用云端缓存键，待 onAuthStateChanged 确认会话
      global.SM2Store.setStorageKey(global.SM2Store.CLOUD_CACHE_KEY);
      state.mode = 'auth';
      state.syncStatus = firebaseReady ? 'syncing' : 'error';
      emitState();
    } else {
      // 3) 游客模式：仅本地，不发起任何云端请求
      global.SM2Store.setStorageKey(global.SM2Store.GUEST_STORAGE_KEY);
      state.mode = 'guest';
      state.syncStatus = 'local';
      emitState();
    }

    // 监听 Firebase Auth 会话状态（仅用于模式 1 刷新自动恢复或会话过期清理）
    if (firebaseReady && auth) {
      auth.onAuthStateChanged(async (user) => {
        if (authActionInFlight) return;

        const currentMeta = loadModeMeta();
        if (currentMeta.mode === 'shared') {
          return;
        }

        if (user) {
          global.SM2Store.setStorageKey(global.SM2Store.CLOUD_CACHE_KEY);
          state.mode = 'auth';
          state.uid = user.uid;
          state.hasRealEmail = !isVirtualEmail(user.email || '');
          state.email = state.hasRealEmail ? (user.email || '') : '';
          state.username =
            user.displayName ||
            extractUsernameFromVirtualEmail(user.email || '') ||
            (user.email ? user.email.split('@')[0] : 'User');
          state.syncStatus = 'syncing';
          saveModeMeta('auth', '');
          emitState();

          try {
            const cloud = await readCloudDoc('auth', user.uid, '');
            const docProfile = (cloud.data && cloud.data.profile) || {};
            if (docProfile.username) state.username = docProfile.username;
            if (typeof docProfile.hasRealEmail === 'boolean') {
              state.hasRealEmail = docProfile.hasRealEmail;
            }
            if (state.hasRealEmail && docProfile.email) {
              state.email = docProfile.email;
            }

            let finalProgress = cloud.progress;
            if (isDirty()) {
              const localCached = global.SM2Store.sanitizeProgressMap(
                global.SM2Store.loadFromKey(global.SM2Store.CLOUD_CACHE_KEY)
              );
              finalProgress = global.SM2Store.mergeProgress(localCached, cloud.progress);
              await writeCloudDoc(
                'auth',
                user.uid,
                state.username,
                {
                  username: state.username,
                  hasRealEmail: state.hasRealEmail,
                  email: state.email
                },
                finalProgress
              );
              setDirty(false);
            }

            global.SM2Store.replaceAll(finalProgress, { silent: true });
            state.syncStatus = 'synced';
            state.lastSyncedAt = Date.now();
            state.lastError = '';
            emitState();
            emitProgressUpdated();
          } catch (err) {
            state.syncStatus = 'error';
            state.lastError = formatError(err, currentLang());
            emitState();
          }
        } else if (currentMeta.mode === 'auth') {
          // 之前是 auth 模式但会话已失效 -> 清理云缓存并退回游客模式
          resetCloudCacheOnly();
          global.SM2Store.setStorageKey(global.SM2Store.GUEST_STORAGE_KEY);
          saveModeMeta('guest', '');
          state.mode = 'guest';
          state.uid = null;
          state.username = '';
          state.email = '';
          state.hasRealEmail = false;
          state.syncStatus = 'local';
          state.lastSyncedAt = null;
          state.lastError = '';
          emitState();
          emitProgressUpdated();
        }
      });
    }
  }

  global.CloudSync = {
    init,
    getState,
    registerWithPassword,
    loginWithPassword,
    sendPasswordReset,
    loginSharedUsername,
    switchToGuest,
    signOut: switchToGuest,
    syncNow,
    pushCurrentProgress,
    validateAuthUsername,
    validateSharedUsername,
    formatError
  };
})(window);
