(function (global) {
  'use strict';

  const STORAGE_KEY = 'deutschwort_progress_v1';
  const MIN_EASE = 1.3;
  const DEFAULT_EASE = 2.5;

  function pad2(n) {
    return n < 10 ? '0' + n : String(n);
  }

  function getTodayStr() {
    const d = new Date();
    return d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate());
  }

  function addDays(dateStr, days) {
    const parts = String(dateStr).split('-').map(Number);
    const d = new Date(parts[0], parts[1] - 1, parts[2]);
    d.setDate(d.getDate() + days);
    return d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate());
  }

  function diffDays(fromDateStr, toDateStr) {
    const a = String(fromDateStr).split('-').map(Number);
    const b = String(toDateStr).split('-').map(Number);
    const utcA = Date.UTC(a[0], a[1] - 1, a[2]);
    const utcB = Date.UTC(b[0], b[1] - 1, b[2]);
    return Math.round((utcB - utcA) / 86400000);
  }

  function createDefaultRecord(wordId, todayStr) {
    const today = todayStr || getTodayStr();
    return {
      wordId: wordId,
      repetitions: 0,
      interval: 0,
      easeFactor: DEFAULT_EASE,
      nextReviewDate: today,
      lastReviewDate: null,
      lapses: 0,
      totalReviews: 0,
      addedAt: today
    };
  }

  function loadAll() {
    try {
      const raw = global.localStorage.getItem(STORAGE_KEY);
      if (!raw) return {};
      const parsed = JSON.parse(raw);
      return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
    } catch (e) {
      return {};
    }
  }

  function saveAll(progressMap) {
    try {
      global.localStorage.setItem(STORAGE_KEY, JSON.stringify(progressMap));
      return true;
    } catch (e) {
      return false;
    }
  }

  function getRecord(wordId) {
    const all = loadAll();
    return all[wordId] || null;
  }

  function addWordToStudy(wordId) {
    const all = loadAll();
    if (!all[wordId]) {
      all[wordId] = createDefaultRecord(wordId);
      saveAll(all);
    }
    return all[wordId];
  }

  function addWordsToStudy(wordIds) {
    const all = loadAll();
    const today = getTodayStr();
    let added = 0;
    wordIds.forEach((id) => {
      if (!all[id]) {
        all[id] = createDefaultRecord(id, today);
        added += 1;
      }
    });
    if (added > 0) {
      saveAll(all);
    }
    return added;
  }

  function removeWordFromStudy(wordId) {
    const all = loadAll();
    if (all[wordId]) {
      delete all[wordId];
      saveAll(all);
      return true;
    }
    return false;
  }

  /**
   * SM-2 核心调度计算
   * rating: 'again' | 'hard' | 'good' | 'easy'
   */
  function calculateNext(currentRecord, rating, todayStr) {
    const today = todayStr || getTodayStr();
    const base = currentRecord
      ? Object.assign({}, currentRecord)
      : createDefaultRecord('', today);

    let repetitions = Number(base.repetitions) || 0;
    let interval = Number(base.interval) || 0;
    let ef = Number(base.easeFactor) || DEFAULT_EASE;
    let lapses = Number(base.lapses) || 0;
    const totalReviews = (Number(base.totalReviews) || 0) + 1;

    if (rating === 'again') {
      repetitions = 0;
      interval = 0;
      ef = Math.max(MIN_EASE, Number((ef - 0.2).toFixed(2)));
      lapses += 1;
    } else if (rating === 'hard') {
      if (repetitions === 0) {
        interval = 1;
      } else if (repetitions === 1) {
        interval = 3;
      } else {
        interval = Math.max(interval + 1, Math.round(interval * 1.2));
      }
      repetitions += 1;
      // SM-2 quality = 3 -> EF' = EF + (0.1 - 2 * (0.08 + 2 * 0.02)) = EF - 0.14
      ef = Math.max(MIN_EASE, Number((ef - 0.14).toFixed(2)));
    } else if (rating === 'good') {
      if (repetitions === 0) {
        interval = 1;
      } else if (repetitions === 1) {
        interval = 6;
      } else {
        interval = Math.max(interval + 1, Math.round(interval * ef));
      }
      repetitions += 1;
      // SM-2 quality = 4 -> EF' = EF + (0.1 - 1 * (0.08 + 1 * 0.02)) = EF
      ef = Math.max(MIN_EASE, Number(ef.toFixed(2)));
    } else if (rating === 'easy') {
      if (repetitions === 0) {
        interval = 4;
      } else if (repetitions === 1) {
        interval = 8;
      } else {
        interval = Math.max(interval + 2, Math.round(interval * ef * 1.3));
      }
      repetitions += 1;
      // SM-2 quality = 5 -> EF' = EF + 0.1
      ef = Math.max(MIN_EASE, Number((ef + 0.1).toFixed(2)));
    }

    const nextReviewDate = interval === 0 ? today : addDays(today, interval);

    return {
      wordId: base.wordId,
      repetitions: repetitions,
      interval: interval,
      easeFactor: ef,
      nextReviewDate: nextReviewDate,
      lastReviewDate: today,
      lapses: lapses,
      totalReviews: totalReviews,
      addedAt: base.addedAt || today
    };
  }

  function recordReview(wordId, rating) {
    const all = loadAll();
    const current = all[wordId] || createDefaultRecord(wordId);
    const updated = calculateNext(current, rating);
    updated.wordId = wordId;
    all[wordId] = updated;
    saveAll(all);
    return updated;
  }

  function formatIntervalLabel(days) {
    if (days <= 0) return '稍后重学';
    if (days === 1) return '1 天后';
    if (days < 30) return days + ' 天后';
    const months = (days / 30).toFixed(1).replace(/\.0$/, '');
    return months + ' 个月后';
  }

  function previewIntervals(wordId) {
    const rec = getRecord(wordId) || createDefaultRecord(wordId);
    return {
      again: formatIntervalLabel(calculateNext(rec, 'again').interval),
      hard: formatIntervalLabel(calculateNext(rec, 'hard').interval),
      good: formatIntervalLabel(calculateNext(rec, 'good').interval),
      easy: formatIntervalLabel(calculateNext(rec, 'easy').interval)
    };
  }

  function isDue(record, todayStr) {
    if (!record) return false;
    const today = todayStr || getTodayStr();
    return String(record.nextReviewDate || '') <= today;
  }

  function getStatusInfo(record) {
    if (!record) {
      return { code: 'new', label: '未加入复习', shortLabel: '新词' };
    }
    const today = getTodayStr();
    const delta = diffDays(today, record.nextReviewDate);
    if (delta <= 0) {
      return {
        code: 'due',
        label: record.totalReviews > 0 ? '今日待复习' : '待首次学习',
        shortLabel: '待复习'
      };
    }
    if (record.interval >= 21) {
      return {
        code: 'mastered',
        label: '已熟悉 · ' + delta + ' 天后复习',
        shortLabel: delta + '天后'
      };
    }
    return {
      code: 'scheduled',
      label: delta + ' 天后复习（' + record.nextReviewDate + '）',
      shortLabel: delta + '天后'
    };
  }

  function exportJSON() {
    const payload = {
      app: 'DeutschWort',
      version: 1,
      exportedAt: new Date().toISOString(),
      progress: loadAll()
    };
    return JSON.stringify(payload, null, 2);
  }

  function isValidDateStr(str) {
    return typeof str === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(str);
  }

  function importJSON(jsonText) {
    let parsed;
    try {
      parsed = JSON.parse(jsonText);
    } catch (e) {
      return { ok: false, error: '文件不是有效的 JSON 格式。' };
    }

    const rawProgress =
      parsed && typeof parsed === 'object' && parsed.progress && typeof parsed.progress === 'object'
        ? parsed.progress
        : parsed;

    if (!rawProgress || typeof rawProgress !== 'object' || Array.isArray(rawProgress)) {
      return { ok: false, error: 'JSON 中缺少有效的学习进度数据。' };
    }

    const today = getTodayStr();
    const cleaned = {};
    let count = 0;

    Object.keys(rawProgress).forEach((wordId) => {
      const item = rawProgress[wordId];
      if (!item || typeof item !== 'object') return;
      if (!isValidDateStr(item.nextReviewDate)) return;

      cleaned[wordId] = {
        wordId: wordId,
        repetitions: Math.max(0, Number(item.repetitions) || 0),
        interval: Math.max(0, Number(item.interval) || 0),
        easeFactor: Math.max(MIN_EASE, Number(item.easeFactor) || DEFAULT_EASE),
        nextReviewDate: item.nextReviewDate,
        lastReviewDate: isValidDateStr(item.lastReviewDate) ? item.lastReviewDate : null,
        lapses: Math.max(0, Number(item.lapses) || 0),
        totalReviews: Math.max(0, Number(item.totalReviews) || 0),
        addedAt: isValidDateStr(item.addedAt) ? item.addedAt : today
      };
      count += 1;
    });

    if (count === 0 && Object.keys(rawProgress).length > 0) {
      return { ok: false, error: '未识别到符合格式的学习进度记录，请检查导入文件。' };
    }

    if (!saveAll(cleaned)) {
      return { ok: false, error: '写入浏览器本地存储失败，请检查存储空间。' };
    }

    return { ok: true, count: count };
  }

  global.SM2Store = {
    getTodayStr,
    addDays,
    loadAll,
    saveAll,
    getRecord,
    addWordToStudy,
    addWordsToStudy,
    removeWordFromStudy,
    calculateNext,
    recordReview,
    previewIntervals,
    isDue,
    getStatusInfo,
    exportJSON,
    importJSON
  };
})(window);
