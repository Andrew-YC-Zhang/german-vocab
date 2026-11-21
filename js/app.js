(function () {
  'use strict';

  const LEVELS = ['a1', 'a2', 'b1', 'b2'];
  const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
  const LANG_STORAGE_KEY = 'deutschwort_lang_v1';
  const CJK_REGEX = /[\u4e00-\u9fff]/;
  const germanCollator = new Intl.Collator('de-DE', {
    usage: 'sort',
    sensitivity: 'variant'
  });

  const I18N = {
    zh: {
      htmlLang: 'zh-CN',
      pageTitle: 'DeutschWort · 德语分级词库',
      brandSubtitle: '德语分级词库 · SM-2 记忆复习',
      modeBrowse: '词库浏览',
      modeReview: '今日复习',
      exportBtn: '导出进度',
      exportTitle: '导出学习进度为 JSON 文件',
      importBtn: '导入恢复',
      importTitle: '从 JSON 文件恢复学习进度',
      searchPlaceholder: '搜索德语单词、中文或英文释义...',
      clearSearchLabel: '清除搜索',
      mobileBack: '← 返回列表',
      navHint: '左右滑或按 ← → 切词',
      prevWord: '‹ 上一个',
      prevWordTitle: '上一个单词（左方向键 / 右滑）',
      nextWord: '下一个 ›',
      nextWordTitle: '下一个单词（右方向键 / 左滑）',
      scopeAll: '全部等级',
      scopeLevel: (lv) => '当前等级 (' + lv + ')',
      loadingVocab: '加载词库中...',
      progressSummary: (lv, learned, total, due) =>
        lv + '：已学 ' + learned + ' / ' + total + ' 词 · 今日待复习 ' + due + ' 词',
      alphaAll: '全部',
      listSortLabel: '按德语字母表排序（ä/ö/ü/ß）',
      listCount: (n) => '共 ' + n + ' 词',
      emptyLevelListHtml: (lv, file) =>
        '当前 <strong>' +
        lv +
        '</strong> 词库暂未添加单词。<br/>后续可直接向 <code>data/' +
        file +
        '.json</code> 填入词条。',
      emptyLevelTitle: (lv) => lv + ' 词库待扩充',
      emptyLevelDesc:
        '目前完整词库已收录在 A1 中，您可以切换到 A1 体验全部功能，或后续按相同 JSON 格式扩充此等级词库。',
      jumpA1: '切换到 A1 词库',
      noSearchResult: (q) => '未找到与“' + q + '”匹配的单词。',
      selectWordTitle: '请选择一个单词',
      selectWordDesc: '点击左侧列表中的任意德语单词，查看完整释义、变格/变位表和例句。',
      detailPosition: (idx, total) => '第 ' + idx + ' / ' + total + ' 词',
      toastFirstWord: '已经是第一个单词了',
      toastLastWord: '已经是最后一个单词了',
      articleLabel: '定冠词：',
      pluralLabel: '复数：',
      verbTypeLabel: '类型：',
      verbAuxLabel: '完成时助动词：',
      addStudyBtn: '+ 加入今日复习',
      resetBtn: '重置',
      resetTitle: '重置该词的记忆进度',
      speakWordBtn: '朗读德语',
      speakWordTitle: '点击朗读单词发音',
      speakExampleBtnTitle: '朗读例句',
      speakExampleTitle: '点击朗读德语例句',
      meaningsTitle: '完整释义（中英对照）',
      examplesTitle: '地道例句（点击德语句子可朗读）',
      declensionTitle: '名词四格变格表 (Deklination)',
      thCase: '格 (Kasus)',
      thSingular: '单数 (Singular)',
      thPlural: '复数 (Plural)',
      caseSub: {
        nominativ: '第一格 · 主格',
        akkusativ: '第四格 · 宾格',
        dativ: '第三格 · 与格',
        genitiv: '第二格 · 属格'
      },
      conjugationTitle: '动词变位表 (Konjugation)',
      praeteritumLabel: '过去式 (Präteritum)',
      perfektLabel: '现在完成时 (Perfekt)',
      auxChip: (aux) => '助动词：' + aux,
      reviewCounter: (done, rem) => '本次已完成 ' + done + ' 词 · 队列剩余 ' + rem + ' 词',
      reviewEmptyLevelTitle: '当前等级暂无词条',
      reviewEmptyLevelDesc: '您可以切换到 A1 词库，或点击上方「全部等级」开始复习。',
      switchToA1Short: '切换到 A1',
      reviewDoneCurrent: '已复习完当前到期单词！',
      reviewNoDue: '今日暂无到期复习词',
      reviewUnlearnedDescHtml: (n) =>
        '当前范围内还有 <strong>' +
        n +
        '</strong> 个未学习的新词。点击下方按钮即可加入 SM-2 记忆曲线队列开始今日练习。',
      reviewAddUnlearned: (n) => '将这 ' + n + ' 个新词加入今日复习',
      backToBrowse: '返回词库浏览',
      reviewAllDoneTitle: '今日复习全部完成！',
      reviewAllDoneDescHtml: (nextDate) =>
        '太棒了！当前范围内的所有单词都已按 SM-2 记忆曲线排期。' +
        (nextDate ? '下一次复习日期为 <strong>' + nextDate + '</strong>。' : ''),
      flashcardHintNoun: '请回忆该名词的定冠词（der/die/das）、复数形式及中英文释义',
      flashcardHintVerb: '请回忆该动词的现在时变位、过去式/完成时及中英文释义',
      flashcardHintOther: '请回忆该词的词性、常见搭配及中英文释义',
      flashcardSpeakTitle: '点击朗读单词',
      flashcardSpeakBtn: '朗读单词',
      revealBtn: '显示答案',
      ratingPrompt: '请根据刚才的回忆情况选择掌握度（SM-2 算法将自动计算下次复习时间）',
      rateAgain: '重来',
      rateHard: '困难',
      rateGood: '良好',
      rateEasy: '简单',
      toastAgain: '已重置，将在本次复习末尾再次出现',
      toastNextReview: (date, days) => '下次复习：' + date + '（' + days + ' 天后）',
      toastAddedStudy: '已加入今日复习队列',
      toastRemovedStudy: '已重置该单词的学习记录',
      toastAddedBatch: (n) => '已将 ' + n + ' 个新词加入今日复习',
      toastExported: '已导出学习进度 JSON 文件',
      toastImportFail: (err) => '导入失败：' + err,
      toastImportOk: (n) => '已成功恢复 ' + n + ' 条学习进度',
      toastReadFail: '读取文件失败，请重试',
      toastLangSwitched: '已切换为中文界面'
    },
    en: {
      htmlLang: 'en',
      pageTitle: 'DeutschWort · German Vocabulary',
      brandSubtitle: 'German Vocabulary · SM-2 Spaced Repetition',
      modeBrowse: 'Browse',
      modeReview: 'Review',
      exportBtn: 'Export',
      exportTitle: 'Export learning progress as JSON',
      importBtn: 'Import',
      importTitle: 'Restore learning progress from JSON',
      searchPlaceholder: 'Search German words or English meanings...',
      clearSearchLabel: 'Clear search',
      mobileBack: '← Back',
      navHint: 'Swipe or press ← →',
      prevWord: '‹ Prev',
      prevWordTitle: 'Previous word (Left arrow / Swipe right)',
      nextWord: 'Next ›',
      nextWordTitle: 'Next word (Right arrow / Swipe left)',
      scopeAll: 'All Levels',
      scopeLevel: (lv) => 'Level ' + lv,
      loadingVocab: 'Loading vocabulary...',
      progressSummary: (lv, learned, total, due) =>
        lv + ': ' + learned + ' / ' + total + ' learned · ' + due + ' due today',
      alphaAll: 'All',
      listSortLabel: 'German alphabetical order (ä/ö/ü/ß)',
      listCount: (n) => n + (n === 1 ? ' word' : ' words'),
      emptyLevelListHtml: (lv, file) =>
        'No words in <strong>' +
        lv +
        '</strong> yet.<br/>Add entries to <code>data/' +
        file +
        '.json</code> to expand this level.',
      emptyLevelTitle: (lv) => lv + ' Vocabulary Coming Soon',
      emptyLevelDesc:
        'The complete vocabulary is currently available in A1. Switch to A1 to explore all features, or add entries to this level using the same JSON format.',
      jumpA1: 'Switch to A1',
      noSearchResult: (q) => 'No words found matching "' + q + '".',
      selectWordTitle: 'Select a word',
      selectWordDesc:
        'Choose any German word from the list to view definitions, declension/conjugation tables, and examples.',
      detailPosition: (idx, total) => idx + ' / ' + total,
      toastFirstWord: 'Already at the first word',
      toastLastWord: 'Already at the last word',
      articleLabel: 'Article: ',
      pluralLabel: 'Plural: ',
      verbTypeLabel: 'Type: ',
      verbAuxLabel: 'Auxiliary: ',
      addStudyBtn: '+ Add to Review',
      resetBtn: 'Reset',
      resetTitle: 'Reset review progress for this word',
      speakWordBtn: 'Pronounce',
      speakWordTitle: 'Click to pronounce word',
      speakExampleBtnTitle: 'Play example',
      speakExampleTitle: 'Click to play German sentence',
      meaningsTitle: 'Definitions',
      examplesTitle: 'Examples (click sentence to play audio)',
      declensionTitle: 'Noun Declension (Deklination)',
      thCase: 'Case (Kasus)',
      thSingular: 'Singular',
      thPlural: 'Plural',
      caseSub: {
        nominativ: 'Subject',
        akkusativ: 'Direct Object',
        dativ: 'Indirect Object',
        genitiv: 'Possessive'
      },
      conjugationTitle: 'Verb Conjugation (Konjugation)',
      praeteritumLabel: 'Simple Past (Präteritum)',
      perfektLabel: 'Present Perfect (Perfekt)',
      auxChip: (aux) => 'Aux: ' + aux,
      reviewCounter: (done, rem) => 'Completed ' + done + ' · Remaining ' + rem,
      reviewEmptyLevelTitle: 'No words in this level yet',
      reviewEmptyLevelDesc: 'Switch to A1 or select "All Levels" above to start reviewing.',
      switchToA1Short: 'Switch to A1',
      reviewDoneCurrent: 'All due cards reviewed!',
      reviewNoDue: 'No cards due today',
      reviewUnlearnedDescHtml: (n) =>
        'There ' +
        (n === 1 ? 'is' : 'are') +
        ' <strong>' +
        n +
        '</strong> new ' +
        (n === 1 ? 'word' : 'words') +
        ' in this scope. Click below to add ' +
        (n === 1 ? 'it' : 'them') +
        ' to your SM-2 review queue.',
      reviewAddUnlearned: (n) =>
        'Add ' + n + ' New ' + (n === 1 ? 'Word' : 'Words') + ' to Review',
      backToBrowse: 'Back to Browse',
      reviewAllDoneTitle: 'All reviews complete for today!',
      reviewAllDoneDescHtml: (nextDate) =>
        'Great job! Every word in this scope is scheduled with SM-2.' +
        (nextDate ? ' Next review date: <strong>' + nextDate + '</strong>.' : ''),
      flashcardHintNoun: 'Recall the article (der/die/das), plural form, and English meaning',
      flashcardHintVerb: 'Recall present tense conjugation, Präteritum, Perfekt, and English meaning',
      flashcardHintOther: 'Recall the part of speech, usage, and English meaning',
      flashcardSpeakTitle: 'Click to pronounce',
      flashcardSpeakBtn: 'Pronounce',
      revealBtn: 'Show Answer',
      ratingPrompt: 'How well did you recall this word? (SM-2 schedules your next review)',
      rateAgain: 'Again',
      rateHard: 'Hard',
      rateGood: 'Good',
      rateEasy: 'Easy',
      toastAgain: 'Reset — will reappear at the end of this session',
      toastNextReview: (date, days) =>
        'Next review: ' + date + ' (in ' + days + (days === 1 ? ' day)' : ' days)'),
      toastAddedStudy: 'Added to today’s review queue',
      toastRemovedStudy: 'Reset learning progress for this word',
      toastAddedBatch: (n) =>
        'Added ' + n + ' new ' + (n === 1 ? 'word' : 'words') + ' to today’s review',
      toastExported: 'Exported learning progress JSON',
      toastImportFail: (err) => 'Import failed: ' + err,
      toastImportOk: (n) =>
        'Restored ' + n + ' progress ' + (n === 1 ? 'record' : 'records'),
      toastReadFail: 'Failed to read file. Please try again.',
      toastLangSwitched: 'Switched to English'
    }
  };

  function loadSavedLang() {
    try {
      const saved = window.localStorage.getItem(LANG_STORAGE_KEY);
      return saved === 'en' ? 'en' : 'zh';
    } catch (_e) {
      return 'zh';
    }
  }

  function saveLang(lang) {
    try {
      window.localStorage.setItem(LANG_STORAGE_KEY, lang);
    } catch (_e) {
      // ignore storage errors
    }
  }

  const state = {
    lang: loadSavedLang(), // 'zh' | 'en'
    vocabByLevel: { a1: [], a2: [], b1: [], b2: [] },
    allWordsMap: {},
    currentLevel: 'a1',
    currentMode: 'browse', // 'browse' | 'review'
    searchQuery: '',
    activeLetter: 'ALL',
    selectedWordId: null,
    detailTransition: null, // 'next' | 'prev' | null
    reviewScope: 'level', // 'level' | 'all'
    reviewQueue: [],
    reviewRevealed: false,
    reviewDoneCount: 0,
    activeSpeakEl: null
  };

  function isEn() {
    return state.lang === 'en';
  }

  function t() {
    return I18N[state.lang] || I18N.zh;
  }

  // DOM 缓存
  const els = {
    brandSubtitle: document.getElementById('brandSubtitle'),
    btnModeBrowse: document.getElementById('btnModeBrowse'),
    btnModeReview: document.getElementById('btnModeReview'),
    modeBrowseLabel: document.getElementById('modeBrowseLabel'),
    modeReviewLabel: document.getElementById('modeReviewLabel'),
    dueBadge: document.getElementById('dueBadge'),
    btnLangZh: document.getElementById('btnLangZh'),
    btnLangEn: document.getElementById('btnLangEn'),
    btnExport: document.getElementById('btnExport'),
    btnImport: document.getElementById('btnImport'),
    importFileInput: document.getElementById('importFileInput'),
    levelTabs: document.querySelectorAll('.level-tab'),
    progressSummary: document.getElementById('progressSummary'),
    browseView: document.getElementById('browseView'),
    reviewView: document.getElementById('reviewView'),
    searchInput: document.getElementById('searchInput'),
    btnClearSearch: document.getElementById('btnClearSearch'),
    alphaBar: document.getElementById('alphaBar'),
    listMeta: document.getElementById('listMeta'),
    wordList: document.getElementById('wordList'),
    detailPane: document.getElementById('detailPane'),
    detailNavBar: document.getElementById('detailNavBar'),
    detailPosition: document.getElementById('detailPosition'),
    detailNavHint: document.getElementById('detailNavHint'),
    btnPrevWord: document.getElementById('btnPrevWord'),
    btnNextWord: document.getElementById('btnNextWord'),
    detailContent: document.getElementById('detailContent'),
    btnMobileBack: document.getElementById('btnMobileBack'),
    scopeLevel: document.getElementById('scopeLevel'),
    scopeAll: document.getElementById('scopeAll'),
    reviewCounter: document.getElementById('reviewCounter'),
    reviewStage: document.getElementById('reviewStage'),
    toast: document.getElementById('toast')
  };

  let toastTimer = null;

  function showToast(message) {
    els.toast.textContent = message;
    els.toast.classList.add('show');
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      els.toast.classList.remove('show');
    }, 2600);
  }

  function escapeHtml(str) {
    return String(str == null ? '' : str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  // 获取用于德语字母表排序与首字母分组的核心词干（忽略前缀 (sich) / sich）
  function getGermanSortKey(word) {
    const clean = String(word || '').trim();
    if (!clean || clean === 'sich') return clean;
    return clean.replace(/^\(sich\)\s+/i, '').replace(/^sich\s+/i, '');
  }

  // 获取德语单词对应的 A-Z 首字母（ä->A, ö->O, ü->U, ß->S）
  function getGermanInitial(word) {
    const clean = getGermanSortKey(word);
    if (!clean) return '#';
    const first = clean.charAt(0).toLowerCase();
    if (first === 'ä') return 'A';
    if (first === 'ö') return 'O';
    if (first === 'ü') return 'U';
    if (first === 'ß') return 'S';
    const base = first.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase();
    return /^[A-Z]$/.test(base) ? base : '#';
  }

  // 搜索标准化：支持用 ae/oe/ue/ss 或 a/o/u/s 搜索 ä/ö/ü/ß
  function normalizeForSearch(str) {
    return String(str || '')
      .toLowerCase()
      .replace(/ä/g, 'a')
      .replace(/ö/g, 'o')
      .replace(/ü/g, 'u')
      .replace(/ß/g, 'ss');
  }

  function expandUmlautInput(str) {
    return String(str || '')
      .toLowerCase()
      .replace(/ae/g, 'a')
      .replace(/oe/g, 'o')
      .replace(/ue/g, 'u')
      .replace(/ß/g, 'ss');
  }

  function sortGermanWords(words) {
    return words.slice().sort((a, b) => {
      const cmp = germanCollator.compare(getGermanSortKey(a.word), getGermanSortKey(b.word));
      if (cmp !== 0) return cmp;
      return String(a.word).localeCompare(String(b.word));
    });
  }

  function speakerSvg() {
    return (
      '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
      '<polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>' +
      '<path d="M15.54 8.46a5 5 0 0 1 0 7.07"></path>' +
      '<path d="M19.07 4.93a10 10 0 0 1 0 14.14"></path>' +
      '</svg>'
    );
  }

  function speakText(text, triggerEl) {
    if (state.activeSpeakEl) {
      state.activeSpeakEl.classList.remove('speaking');
      state.activeSpeakEl = null;
    }

    window.GermanSpeech.speak(text, {
      lang: state.lang,
      onStart: () => {
        if (triggerEl) {
          triggerEl.classList.add('speaking');
          state.activeSpeakEl = triggerEl;
        }
      },
      onEnd: () => {
        if (triggerEl) triggerEl.classList.remove('speaking');
        if (state.activeSpeakEl === triggerEl) state.activeSpeakEl = null;
      },
      onError: (msg) => {
        if (triggerEl) triggerEl.classList.remove('speaking');
        if (state.activeSpeakEl === triggerEl) state.activeSpeakEl = null;
        showToast(msg);
      }
    });
  }

  function getSpeakWordText(wordObj) {
    if (wordObj.pos === 'noun' && wordObj.article) {
      return wordObj.article + ' ' + wordObj.word;
    }
    return String(wordObj.word || '').replace(/^\(sich\)\s+/i, 'sich ');
  }

  function getPosBadgeClass(wordObj) {
    if (wordObj.pos === 'noun') {
      if (wordObj.gender === 'm') return 'pos-m';
      if (wordObj.gender === 'f') return 'pos-f';
      return 'pos-n';
    }
    return 'pos-verb';
  }

  function getLocalizedPosLabel(w) {
    if (!isEn()) return w.posLabel || w.pos;
    if (w.pos === 'noun') {
      const pl = String(w.plural || '');
      const lbl = String(w.posLabel || '');
      if (lbl.includes('复数名词') || pl.includes('仅复数') || pl.includes('常用复数')) {
        return 'Plural Noun';
      }
      if (w.gender === 'm') return 'Masculine Noun';
      if (w.gender === 'f') return 'Feminine Noun';
      return 'Neuter Noun';
    }
    if (w.pos === 'verb') {
      const reg = String(w.regularity || '') + ' ' + String(w.posLabel || '');
      if (/Modalverb|情态动词/i.test(reg)) return 'Modal Verb';
      const sep = /trennbar|可分/i.test(reg) && !/untrennbar|不可分/i.test(reg);
      const insep = /untrennbar|不可分/i.test(reg);
      const irreg = /unregelmäßig|不规则/i.test(reg);
      const mixed = /gemischt|混合/i.test(reg);
      const refl = /reflexiv|反身/i.test(reg);
      const parts = [];
      if (sep) parts.push('Separable');
      else if (insep) parts.push('Inseparable');
      if (refl) parts.push('Reflexive');
      if (mixed) parts.push('Mixed');
      else if (irreg) parts.push('Irregular');
      else parts.push('Regular');
      return 'Verb · ' + parts.join(', ');
    }
    const map = {
      adjective: 'Adjective',
      adverb: 'Adverb',
      article: 'Article / Determiner',
      conjunction: 'Conjunction',
      interjection: 'Interjection',
      phrase: 'Phrase',
      prefix: 'Prefix',
      preposition: 'Preposition',
      pronoun: 'Pronoun'
    };
    return map[w.pos] || 'Word';
  }

  function getLocalizedRegularity(w) {
    const raw = String(w.regularity || '');
    if (!isEn()) return raw || '动词';
    if (!raw) return 'Verb';
    if (/Modalverb|情态动词/i.test(raw)) {
      return raw.includes('Konjunktiv II') ? 'Modal verb (Konjunktiv II of mögen)' : 'Modal verb (Modalverb)';
    }
    const parenMatch = raw.match(/\(([^)]+)\)/);
    let germanDetail = parenMatch ? parenMatch[1] : '';
    germanDetail = germanDetail
      .replace(/，/g, ', ')
      .replace(/\s*结尾/g, '')
      .trim();
    const tags = [];
    if (/unpersönlich|无人称/i.test(raw)) tags.push('Impersonal');
    if (/reflexiv|反身/i.test(raw)) tags.push('Reflexive');
    if (/untrennbar|不可分/i.test(raw)) tags.push('Inseparable');
    else if (/trennbar|可分/i.test(raw)) tags.push('Separable');
    if (/gemischt|混合/i.test(raw)) tags.push('Mixed');
    else if (/unregelmäßig|不规则/i.test(raw)) tags.push('Irregular');
    else if (/regelmäßig|规则/i.test(raw)) tags.push('Regular');
    if (/Hilfsverb|助动词/i.test(raw)) tags.push('Auxiliary');
    const base = (tags.length > 0 ? tags.join(', ') : 'Verb') + (tags.includes('Verb') ? '' : ' verb');
    return germanDetail ? base + ' (' + germanDetail + ')' : base;
  }

  function localizeGrammarNote(text) {
    const raw = String(text || '');
    if (!isEn() || !CJK_REGEX.test(raw)) return raw;
    return raw
      .replace(/\(通常无复数\)/g, '(uncountable)')
      .replace(/\(不可数\)/g, '(uncountable)')
      .replace(/\(无复数\)/g, '(no plural)')
      .replace(/\(通常仅用单数\)/g, '(usually singular)')
      .replace(/\(少用\)/g, '(rare)')
      .replace(/\(此义仅复数\)/g, '(plural only)')
      .replace(/\(仅复数\)/g, '(plural only)')
      .replace(/\(常用复数\)/g, '(usually plural)')
      .replace(/\(无单数\)/g, '(no singular)')
      .replace(/\(通常无冠词\)/g, '(usually no article)')
      .replace(/\(定冠词后\)/g, '(after def. article)')
      .replace(/\(无冠词\)/g, '(no article)')
      .replace(/\(数词后保持单数 Grad\)/g, '(singular after numbers: Grad)')
      .replace(/\(数词后用 Grad\)/g, '(singular after numbers: Grad)')
      .replace(/\(楼层\)/g, '(floors)')
      .replace(/\(手杖\)/g, '(sticks)')
      .replace(/\(单词\)/g, '(words)')
      .replace(/\(话语\)/g, '(utterances)')
      .replace(/\(借用 wollen\)/g, '(uses wollen)')
      .replace(/\(仅用 es regnet\)/g, '(impersonal: es regnet)')
      .replace(/\(表“搬出”时用 ist ausgezogen\)/g, "(with sein for 'move out': ist ausgezogen)")
      .replace(/\(带动词原形时用 hat \.\.\. dürfen\)/g, '(with infinitive: hat ... dürfen)')
      .replace(/\(及物时亦可用 hat gefahren\)/g, '(transitive: hat gefahren)');
  }

  function getLocalizedExampleTag(ex, w, idx) {
    const rawTag = String((ex && ex.tag) || '').trim();
    if (!isEn()) {
      return rawTag || (w.pos !== 'noun' && w.pos !== 'verb' ? w.posLabel || '例句' : '例句');
    }
    if (!rawTag) return 'Example ' + (idx + 1);
    if (!CJK_REGEX.test(rawTag)) return rawTag;
    if (/Dativ/i.test(rawTag)) return 'Usage (+ Dativ)';
    if (/Akkusativ/i.test(rawTag)) return 'Usage (+ Akkusativ)';
    if (/Genitiv/i.test(rawTag)) return 'Usage (+ Genitiv)';
    if (/Nominativ/i.test(rawTag)) return 'Usage (Nominativ)';
    if (/比较级/.test(rawTag)) return 'Comparative';
    if (/最高级/.test(rawTag)) return 'Superlative';
    return 'Example ' + (idx + 1);
  }

  function applyStaticTranslations() {
    const dict = t();
    document.documentElement.lang = dict.htmlLang;
    document.title = dict.pageTitle;

    if (els.brandSubtitle) els.brandSubtitle.textContent = dict.brandSubtitle;
    if (els.modeBrowseLabel) els.modeBrowseLabel.textContent = dict.modeBrowse;
    if (els.modeReviewLabel) els.modeReviewLabel.textContent = dict.modeReview;
    if (els.btnExport) {
      els.btnExport.textContent = dict.exportBtn;
      els.btnExport.title = dict.exportTitle;
    }
    if (els.btnImport) {
      els.btnImport.textContent = dict.importBtn;
      els.btnImport.title = dict.importTitle;
    }
    if (els.searchInput) els.searchInput.placeholder = dict.searchPlaceholder;
    if (els.btnClearSearch) els.btnClearSearch.setAttribute('aria-label', dict.clearSearchLabel);
    if (els.btnMobileBack) els.btnMobileBack.textContent = dict.mobileBack;
    if (els.detailNavHint) els.detailNavHint.textContent = dict.navHint;
    if (els.btnPrevWord) {
      els.btnPrevWord.textContent = dict.prevWord;
      els.btnPrevWord.title = dict.prevWordTitle;
    }
    if (els.btnNextWord) {
      els.btnNextWord.textContent = dict.nextWord;
      els.btnNextWord.title = dict.nextWordTitle;
    }
    if (els.scopeAll) els.scopeAll.textContent = dict.scopeAll;

    if (els.btnLangZh && els.btnLangEn) {
      const zhActive = state.lang === 'zh';
      els.btnLangZh.classList.toggle('active', zhActive);
      els.btnLangZh.setAttribute('aria-pressed', zhActive ? 'true' : 'false');
      els.btnLangEn.classList.toggle('active', !zhActive);
      els.btnLangEn.setAttribute('aria-pressed', !zhActive ? 'true' : 'false');
    }
  }

  function setLanguage(lang, silent) {
    const nextLang = lang === 'en' ? 'en' : 'zh';
    if (state.lang === nextLang && !silent) return;
    state.lang = nextLang;
    saveLang(nextLang);
    applyStaticTranslations();
    updateHeaderStats();
    renderAlphaBar();
    if (state.currentMode === 'review') {
      renderReviewView();
    } else {
      renderWordList();
    }
    if (!silent) {
      showToast(t().toastLangSwitched);
    }
  }

  function formatArticleHtml(wordObj) {
    if (wordObj.pos !== 'noun' || !wordObj.article) return '';
    const cls = 'article-' + (wordObj.gender || 'm');
    return '<span class="article-tag ' + cls + '">' + escapeHtml(wordObj.article) + '</span>';
  }

  function escapeRegExp(str) {
    return String(str).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  function getExampleTagClass(tag) {
    const norm = String(tag || '')
      .trim()
      .toLowerCase()
      .replace(/ä/g, 'a')
      .replace(/ö/g, 'o')
      .replace(/ü/g, 'u');
    if (norm.startsWith('nominativ')) return 'tag-nominativ';
    if (norm.startsWith('akkusativ')) return 'tag-akkusativ';
    if (norm.startsWith('dativ')) return 'tag-dativ';
    if (norm.startsWith('genitiv')) return 'tag-genitiv';
    if (norm.startsWith('prasens')) return 'tag-prasens';
    if (norm.startsWith('prateritum')) return 'tag-prateritum';
    if (norm.startsWith('perfekt')) return 'tag-perfekt';
    return '';
  }

  function getCleanExampleText(ex) {
    return String((ex && ex.de) || '').replace(/\*\*(.+?)\*\*/g, '$1');
  }

  function formatExampleDeHtml(ex) {
    const raw = String((ex && ex.de) || '');
    // 支持在 de 文本中手写 **重点词**，同时也支持独立的 highlight 数组/字符串字段
    if (/\*\*(.+?)\*\*/.test(raw)) {
      return escapeHtml(raw).replace(/\*\*(.+?)\*\*/g, '<strong class="ex-highlight">$1</strong>');
    }

    const safe = escapeHtml(raw);
    let targets = [];
    if (Array.isArray(ex && ex.highlight)) {
      targets = ex.highlight;
    } else if (typeof (ex && ex.highlight) === 'string' && ex.highlight.trim()) {
      targets = [ex.highlight.trim()];
    }

    const cleaned = targets
      .map((t) => escapeHtml(String(t || '').trim()))
      .filter(Boolean)
      .sort((a, b) => b.length - a.length);

    if (cleaned.length === 0) return safe;

    try {
      const pattern = new RegExp(
        '(?<![\\p{L}\\p{N}])(' + cleaned.map(escapeRegExp).join('|') + ')(?![\\p{L}\\p{N}])',
        'gu'
      );
      return safe.replace(pattern, '<strong class="ex-highlight">$1</strong>');
    } catch (_err) {
      // 兼容极老浏览器不支持 lookbehind 的场景
      const fallback = new RegExp('(' + cleaned.map(escapeRegExp).join('|') + ')', 'g');
      return safe.replace(fallback, '<strong class="ex-highlight">$1</strong>');
    }
  }

  // 给变格表中的定冠词加粗配色
  function highlightDeclensionCell(text, colorKey) {
    const safe = escapeHtml(text);
    const colorClass = colorKey ? 'article-' + colorKey : '';
    return safe.replace(/\b(der|die|das|den|dem|des)\s+/g, function (_m, art) {
      return '<span class="article-tag ' + colorClass + '">' + art + '</span>';
    });
  }

  function getAllWords() {
    return LEVELS.reduce((acc, lv) => acc.concat(state.vocabByLevel[lv]), []);
  }

  function getDueWords(scope) {
    const progress = window.SM2Store.loadAll();
    const today = window.SM2Store.getTodayStr();
    const pool = scope === 'all' ? getAllWords() : state.vocabByLevel[state.currentLevel];
    return pool.filter((w) => {
      const rec = progress[w.id];
      return rec && window.SM2Store.isDue(rec, today);
    });
  }

  function updateHeaderStats() {
    const progress = window.SM2Store.loadAll();
    const today = window.SM2Store.getTodayStr();
    const allWords = getAllWords();
    const totalDue = allWords.filter((w) => progress[w.id] && window.SM2Store.isDue(progress[w.id], today)).length;

    if (totalDue > 0) {
      els.dueBadge.textContent = String(totalDue);
      els.dueBadge.classList.remove('hidden');
    } else {
      els.dueBadge.classList.add('hidden');
    }

    const levelWords = state.vocabByLevel[state.currentLevel] || [];
    const learnedInLevel = levelWords.filter((w) => Boolean(progress[w.id])).length;
    const dueInLevel = levelWords.filter((w) => progress[w.id] && window.SM2Store.isDue(progress[w.id], today)).length;
    const levelLabel = state.currentLevel.toUpperCase();
    const dict = t();

    els.progressSummary.textContent = dict.progressSummary(
      levelLabel,
      learnedInLevel,
      levelWords.length,
      dueInLevel
    );

    els.scopeLevel.textContent = dict.scopeLevel(levelLabel);
  }

  // ==================== 词库浏览渲染 ====================

  function getFilteredWords() {
    const words = state.vocabByLevel[state.currentLevel] || [];
    const qRaw = state.searchQuery.trim().toLowerCase();
    if (!qRaw) return words;

    const qNorm = normalizeForSearch(qRaw);
    const qExpanded = expandUmlautInput(qRaw);

    return words.filter((w) => {
      const targetWord = (w.article ? w.article + ' ' : '') + w.word;
      const wordLower = targetWord.toLowerCase();
      const wordNorm = normalizeForSearch(targetWord);

      if (
        wordLower.includes(qRaw) ||
        wordNorm.includes(qNorm) ||
        wordNorm.includes(qExpanded)
      ) {
        return true;
      }

      if (w.plural && normalizeForSearch(w.plural).includes(qNorm)) {
        return true;
      }

      return (w.meanings || []).some(
        (m) =>
          String(m.zh || '').toLowerCase().includes(qRaw) ||
          String(m.en || '').toLowerCase().includes(qRaw)
      );
    });
  }

  function renderAlphaBar() {
    const words = state.vocabByLevel[state.currentLevel] || [];
    const available = new Set(words.map((w) => getGermanInitial(w.word)));

    let html =
      '<button type="button" class="alpha-btn ' +
      (state.activeLetter === 'ALL' ? 'active' : '') +
      '" data-letter="ALL">' +
      escapeHtml(t().alphaAll) +
      '</button>';

    ALPHABET.forEach((letter) => {
      const hasLetter = available.has(letter);
      const active = state.activeLetter === letter ? ' active' : '';
      html +=
        '<button type="button" class="alpha-btn' +
        active +
        '" data-letter="' +
        letter +
        '"' +
        (hasLetter ? '' : ' disabled') +
        '>' +
        letter +
        '</button>';
    });

    els.alphaBar.innerHTML = html;
  }

  function renderWordList() {
    const allInLevel = state.vocabByLevel[state.currentLevel] || [];
    const filtered = getFilteredWords();
    const progress = window.SM2Store.loadAll();
    const dict = t();
    const enMode = isEn();

    els.listMeta.innerHTML =
      '<span>' +
      escapeHtml(dict.listSortLabel) +
      '</span><span>' +
      escapeHtml(dict.listCount(filtered.length)) +
      '</span>';

    if (allInLevel.length === 0) {
      const lvUpper = state.currentLevel.toUpperCase();
      els.wordList.innerHTML =
        '<div style="padding:28px 14px;text-align:center;color:var(--text-muted);font-size:14px;">' +
        dict.emptyLevelListHtml(lvUpper, state.currentLevel) +
        '</div>';
      renderEmptyDetail(dict.emptyLevelTitle(lvUpper), dict.emptyLevelDesc, true);
      return;
    }

    if (filtered.length === 0) {
      els.wordList.innerHTML =
        '<div style="padding:28px 14px;text-align:center;color:var(--text-muted);font-size:14px;">' +
        escapeHtml(dict.noSearchResult(state.searchQuery)) +
        '</div>';
      updateDetailNavBar();
      return;
    }

    // 如果当前未选中词，或者选中的词不在当前等级里，默认选中第一个
    const inFiltered = filtered.some((w) => w.id === state.selectedWordId);
    if (!inFiltered) {
      state.selectedWordId = filtered[0].id;
    }

    let html = '';
    let lastLetter = '';

    filtered.forEach((w) => {
      const letter = getGermanInitial(w.word);
      if (letter !== lastLetter) {
        html +=
          '<div class="letter-group-header" data-group-letter="' +
          letter +
          '">' +
          letter +
          '</div>';
        lastLetter = letter;
      }

      const rec = progress[w.id];
      const status = window.SM2Store.getStatusInfo(rec, state.lang);
      const selectedClass = w.id === state.selectedWordId ? ' selected' : '';
      const meaningPreview = enMode
        ? (w.meanings || []).map((m) => m.en).filter(Boolean).join('; ')
        : (w.meanings || []).map((m) => m.zh).filter(Boolean).join('；');

      html +=
        '<button type="button" class="word-item' +
        selectedClass +
        '" data-word-id="' +
        escapeHtml(w.id) +
        '" role="option" aria-selected="' +
        (w.id === state.selectedWordId ? 'true' : 'false') +
        '">' +
        '<div class="word-item-top">' +
        '<div class="word-item-title">' +
        formatArticleHtml(w) +
        escapeHtml(w.word) +
        '</div>' +
        '<span class="status-pill status-' +
        status.code +
        '">' +
        escapeHtml(status.shortLabel) +
        '</span>' +
        '</div>' +
        '<div class="word-item-meaning">' +
        escapeHtml(meaningPreview) +
        '</div>' +
        '</button>';
    });

    els.wordList.innerHTML = html;
    renderDetail();
  }

  function buildGrammarSectionHtml(w) {
    const dict = t();
    if (w.pos === 'noun' && w.declension) {
      const d = w.declension;
      const rows = [
        { key: 'nominativ', name: 'Nominativ', sub: dict.caseSub.nominativ },
        { key: 'akkusativ', name: 'Akkusativ', sub: dict.caseSub.akkusativ },
        { key: 'dativ', name: 'Dativ', sub: dict.caseSub.dativ },
        { key: 'genitiv', name: 'Genitiv', sub: dict.caseSub.genitiv }
      ];

      let tbody = '';
      rows.forEach((r) => {
        const pair = d[r.key] || { singular: '-', plural: '-' };
        const sgText = localizeGrammarNote(pair.singular);
        const plText = localizeGrammarNote(pair.plural);
        tbody +=
          '<tr>' +
          '<td><span class="case-name">' +
          r.name +
          '</span><span class="case-sub">' +
          escapeHtml(r.sub) +
          '</span></td>' +
          '<td>' +
          highlightDeclensionCell(sgText, w.gender) +
          '</td>' +
          '<td>' +
          highlightDeclensionCell(plText, 'pl') +
          '</td>' +
          '</tr>';
      });

      return (
        '<div class="section-block">' +
        '<h3>' +
        escapeHtml(dict.declensionTitle) +
        '</h3>' +
        '<div class="table-wrap">' +
        '<table class="grammar-table">' +
        '<thead><tr><th>' +
        escapeHtml(dict.thCase) +
        '</th><th>' +
        escapeHtml(dict.thSingular) +
        '</th><th>' +
        escapeHtml(dict.thPlural) +
        '</th></tr></thead>' +
        '<tbody>' +
        tbody +
        '</tbody></table></div></div>'
      );
    }

    if (w.pos === 'verb' && w.conjugation) {
      const c = w.conjugation;
      const p = c.present || {};
      const persons = [
        { label: 'ich', value: localizeGrammarNote(p.ich || '-') },
        { label: 'wir', value: localizeGrammarNote(p.wir || '-') },
        { label: 'du', value: localizeGrammarNote(p.du || '-') },
        { label: 'ihr', value: localizeGrammarNote(p.ihr || '-') },
        { label: 'er / sie / es', value: localizeGrammarNote(p.er_sie_es || '-') },
        { label: 'sie / Sie', value: localizeGrammarNote(p.sie_Sie || '-') }
      ];

      let grid = '';
      persons.forEach((item) => {
        grid +=
          '<div class="conj-cell">' +
          '<span class="conj-pronoun">' +
          item.label +
          '</span>' +
          '<span class="conj-form">' +
          escapeHtml(item.value) +
          '</span>' +
          '</div>';
      });

      return (
        '<div class="section-block">' +
        '<h3>' +
        escapeHtml(dict.conjugationTitle) +
        '</h3>' +
        '<div class="verb-tenses">' +
        '<div class="tense-card">' +
        '<div class="tense-label">' +
        escapeHtml(dict.praeteritumLabel) +
        '</div>' +
        '<div class="tense-value">' +
        escapeHtml(localizeGrammarNote(c.praeteritum || '-')) +
        '</div>' +
        '</div>' +
        '<div class="tense-card">' +
        '<div class="tense-label">' +
        escapeHtml(dict.perfektLabel) +
        '<span class="aux-chip">' +
        escapeHtml(dict.auxChip(w.auxiliary || 'haben')) +
        '</span></div>' +
        '<div class="tense-value">' +
        escapeHtml(localizeGrammarNote(c.perfekt || '-')) +
        '</div>' +
        '</div>' +
        '</div>' +
        '<div class="conj-grid">' +
        grid +
        '</div>' +
        '</div>'
      );
    }

    return '';
  }

  function buildWordCardHtml(w, options) {
    const opts = options || {};
    const dict = t();
    const enMode = isEn();
    const rec = window.SM2Store.getRecord(w.id);
    const status = window.SM2Store.getStatusInfo(rec, state.lang);
    const speakTarget = getSpeakWordText(w);

    let submetaHtml = '';
    if (w.pos === 'noun') {
      const pluralRaw = localizeGrammarNote(w.plural || '-');
      const pluralDisplay = /^[-–—]/.test(pluralRaw.trim()) ? pluralRaw : 'die ' + pluralRaw;
      submetaHtml =
        '<span>' +
        escapeHtml(dict.articleLabel) +
        '<strong>' +
        escapeHtml(w.article || '-') +
        '</strong></span>' +
        '<span>' +
        escapeHtml(dict.pluralLabel) +
        '<strong>' +
        escapeHtml(pluralDisplay) +
        '</strong></span>';
    } else if (w.pos === 'verb') {
      submetaHtml =
        '<span>' +
        escapeHtml(dict.verbTypeLabel) +
        '<strong>' +
        escapeHtml(getLocalizedRegularity(w)) +
        '</strong></span>' +
        '<span>' +
        escapeHtml(dict.verbAuxLabel) +
        '<strong>' +
        escapeHtml(w.auxiliary || 'haben') +
        '</strong></span>';
    }

    let studyActionHtml = '';
    if (!opts.hideStudyControls) {
      if (!rec) {
        studyActionHtml =
          '<button type="button" class="primary-btn" data-action="add-study" data-word-id="' +
          escapeHtml(w.id) +
          '">' +
          escapeHtml(dict.addStudyBtn) +
          '</button>';
      } else {
        studyActionHtml =
          '<span class="status-pill status-' +
          status.code +
          '">' +
          escapeHtml(status.label) +
          '</span>' +
          '<button type="button" class="secondary-btn" data-action="remove-study" data-word-id="' +
          escapeHtml(w.id) +
          '" title="' +
          escapeHtml(dict.resetTitle) +
          '">' +
          escapeHtml(dict.resetBtn) +
          '</button>';
      }
    }

    let meaningsHtml = '';
    (w.meanings || []).forEach((m, idx) => {
      meaningsHtml +=
        '<li class="meaning-item">' +
        '<span class="meaning-index">' +
        (idx + 1) +
        '</span>' +
        '<div>' +
        (enMode
          ? '<div class="meaning-en meaning-en-primary">' + escapeHtml(m.en) + '</div>'
          : '<div class="meaning-zh">' +
            escapeHtml(m.zh) +
            '</div><div class="meaning-en">' +
            escapeHtml(m.en) +
            '</div>') +
        '</div>' +
        '</li>';
    });

    let examplesHtml = '';
    (w.examples || []).forEach((ex, idx) => {
      const speakSentence = getCleanExampleText(ex);
      const tagLabel = getLocalizedExampleTag(ex, w, idx);
      const tagClass = getExampleTagClass(ex.tag || tagLabel);

      examplesHtml +=
        '<div class="example-item">' +
        '<button type="button" class="speak-icon-btn" data-speak="' +
        escapeHtml(speakSentence) +
        '" title="' +
        escapeHtml(dict.speakExampleBtnTitle) +
        '" aria-label="' +
        escapeHtml(dict.speakExampleBtnTitle) +
        '">' +
        speakerSvg() +
        '</button>' +
        '<div class="example-body">' +
        '<div class="example-de-row">' +
        '<span class="example-tag ' +
        tagClass +
        '">' +
        escapeHtml(tagLabel) +
        '</span>' +
        '<span class="example-de" data-speak="' +
        escapeHtml(speakSentence) +
        '" title="' +
        escapeHtml(dict.speakExampleTitle) +
        '">' +
        formatExampleDeHtml(ex) +
        '</span>' +
        '</div>' +
        (enMode
          ? '<div class="example-en example-en-primary">' + escapeHtml(ex.en) + '</div>'
          : '<div class="example-zh">' +
            escapeHtml(ex.zh) +
            '</div><div class="example-en">' +
            escapeHtml(ex.en) +
            '</div>') +
        '</div>' +
        '</div>';
    });

    const showNote = w.note && (!enMode || !CJK_REGEX.test(w.note));
    const noteHtml = showNote
      ? '<div class="word-note">💡 ' + escapeHtml(w.note) + '</div>'
      : '';

    const transitionClass = opts.transition ? ' slide-' + opts.transition : '';

    return (
      '<div class="detail-card' +
      transitionClass +
      '">' +
      '<div class="detail-top-bar">' +
      '<div class="tag-row">' +
      '<span class="pos-badge ' +
      getPosBadgeClass(w) +
      '">' +
      escapeHtml(getLocalizedPosLabel(w)) +
      '</span>' +
      '<span class="level-badge">' +
      escapeHtml(w.level || state.currentLevel.toUpperCase()) +
      '</span>' +
      '</div>' +
      '<div class="study-actions">' +
      studyActionHtml +
      '</div>' +
      '</div>' +
      '<div class="word-hero">' +
      '<div>' +
      '<button type="button" class="word-headline-btn" data-speak="' +
      escapeHtml(speakTarget) +
      '" title="' +
      escapeHtml(dict.speakWordTitle) +
      '">' +
      '<span class="word-headline">' +
      formatArticleHtml(w) +
      escapeHtml(w.word) +
      '</span>' +
      (w.ipa ? '<span class="word-ipa">' + escapeHtml(w.ipa) + '</span>' : '') +
      '</button>' +
      '<div class="word-submeta">' +
      submetaHtml +
      '</div>' +
      '</div>' +
      '<button type="button" class="speak-btn" data-speak="' +
      escapeHtml(speakTarget) +
      '">' +
      speakerSvg() +
      '<span>' +
      escapeHtml(dict.speakWordBtn) +
      '</span>' +
      '</button>' +
      '</div>' +
      noteHtml +
      '<div class="section-block">' +
      '<h3>' +
      escapeHtml(dict.meaningsTitle) +
      '</h3>' +
      '<ol class="meaning-list">' +
      meaningsHtml +
      '</ol>' +
      '</div>' +
      buildGrammarSectionHtml(w) +
      '<div class="section-block">' +
      '<h3>' +
      escapeHtml(dict.examplesTitle) +
      '</h3>' +
      '<div class="example-list">' +
      examplesHtml +
      '</div>' +
      '</div>' +
      '</div>'
    );
  }

  function updateDetailNavBar() {
    const filtered = getFilteredWords();
    const idx = filtered.findIndex((item) => item.id === state.selectedWordId);
    if (filtered.length === 0 || idx === -1) {
      els.detailNavBar.classList.add('hidden');
      return;
    }

    els.detailNavBar.classList.remove('hidden');
    els.detailPosition.textContent = t().detailPosition(idx + 1, filtered.length);
    els.btnPrevWord.disabled = idx <= 0;
    els.btnNextWord.disabled = idx >= filtered.length - 1;
  }

  function navigateWord(delta) {
    if (state.currentMode !== 'browse') return;
    const filtered = getFilteredWords();
    if (filtered.length === 0) return;

    const currentIdx = filtered.findIndex((item) => item.id === state.selectedWordId);
    if (currentIdx === -1) return;

    const nextIdx = currentIdx + delta;
    if (nextIdx < 0) {
      showToast(t().toastFirstWord);
      return;
    }
    if (nextIdx >= filtered.length) {
      showToast(t().toastLastWord);
      return;
    }

    window.GermanSpeech.stop();
    state.selectedWordId = filtered[nextIdx].id;
    state.detailTransition = delta > 0 ? 'next' : 'prev';
    renderWordList();

    // 同步桌面端左侧列表选中项可见，移动端则回到详情顶部
    const selectedBtn = els.wordList.querySelector('.word-item.selected');
    if (selectedBtn && window.innerWidth > 860) {
      selectedBtn.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    } else if (window.innerWidth <= 860) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  function renderEmptyDetail(title, desc, showBackToA1) {
    els.detailNavBar.classList.add('hidden');
    els.detailContent.innerHTML =
      '<div class="empty-card">' +
      '<div class="empty-icon">📚</div>' +
      '<h2>' +
      escapeHtml(title) +
      '</h2>' +
      '<p>' +
      escapeHtml(desc) +
      '</p>' +
      (showBackToA1
        ? '<div class="empty-actions"><button type="button" class="primary-btn" id="btnJumpA1">' +
          escapeHtml(t().jumpA1) +
          '</button></div>'
        : '') +
      '</div>';

    const jumpBtn = document.getElementById('btnJumpA1');
    if (jumpBtn) {
      jumpBtn.addEventListener('click', () => switchLevel('a1'));
    }
  }

  function renderDetail() {
    const w = state.allWordsMap[state.selectedWordId];
    if (!w) {
      const dict = t();
      renderEmptyDetail(dict.selectWordTitle, dict.selectWordDesc, false);
      return;
    }
    const transition = state.detailTransition;
    state.detailTransition = null;
    updateDetailNavBar();
    els.detailContent.innerHTML = buildWordCardHtml(w, {
      hideStudyControls: false,
      transition: transition
    });
  }

  // ==================== 今日复习（SM-2）渲染 ====================

  function rebuildReviewQueue() {
    state.reviewQueue = getDueWords(state.reviewScope);
    state.reviewRevealed = false;
    state.reviewDoneCount = 0;
  }

  function renderReviewView() {
    const dict = t();
    const totalRemaining = state.reviewQueue.length;
    els.reviewCounter.textContent = dict.reviewCounter(state.reviewDoneCount, totalRemaining);

    if (totalRemaining === 0) {
      const pool =
        state.reviewScope === 'all'
          ? getAllWords()
          : state.vocabByLevel[state.currentLevel] || [];
      const progress = window.SM2Store.loadAll();
      const unlearned = pool.filter((w) => !progress[w.id]);

      if (pool.length === 0) {
        els.reviewStage.innerHTML =
          '<div class="empty-card">' +
          '<div class="empty-icon">🗂️</div>' +
          '<h2>' +
          escapeHtml(dict.reviewEmptyLevelTitle) +
          '</h2>' +
          '<p>' +
          escapeHtml(dict.reviewEmptyLevelDesc) +
          '</p>' +
          '<div class="empty-actions">' +
          '<button type="button" class="primary-btn" data-review-action="switch-a1">' +
          escapeHtml(dict.switchToA1Short) +
          '</button>' +
          '</div></div>';
        return;
      }

      if (unlearned.length > 0) {
        els.reviewStage.innerHTML =
          '<div class="empty-card">' +
          '<div class="empty-icon">✨</div>' +
          '<h2>' +
          escapeHtml(state.reviewDoneCount > 0 ? dict.reviewDoneCurrent : dict.reviewNoDue) +
          '</h2>' +
          '<p>' +
          dict.reviewUnlearnedDescHtml(unlearned.length) +
          '</p>' +
          '<div class="empty-actions">' +
          '<button type="button" class="primary-btn" data-review-action="add-unlearned">' +
          escapeHtml(dict.reviewAddUnlearned(unlearned.length)) +
          '</button>' +
          '<button type="button" class="secondary-btn" data-review-action="go-browse">' +
          escapeHtml(dict.backToBrowse) +
          '</button>' +
          '</div></div>';
        return;
      }

      // 找出最早的下次复习日期
      const upcomingDates = pool
        .map((w) => progress[w.id] && progress[w.id].nextReviewDate)
        .filter(Boolean)
        .sort();
      const nextDate = upcomingDates[0] || '';

      els.reviewStage.innerHTML =
        '<div class="empty-card">' +
        '<div class="empty-icon">🎉</div>' +
        '<h2>' +
        escapeHtml(dict.reviewAllDoneTitle) +
        '</h2>' +
        '<p>' +
        dict.reviewAllDoneDescHtml(nextDate ? escapeHtml(nextDate) : '') +
        '</p>' +
        '<div class="empty-actions">' +
        '<button type="button" class="primary-btn" data-review-action="go-browse">' +
        escapeHtml(dict.backToBrowse) +
        '</button>' +
        '</div></div>';
      return;
    }

    const currentWord = state.reviewQueue[0];

    if (!state.reviewRevealed) {
      let hintText = dict.flashcardHintOther;
      if (currentWord.pos === 'noun') {
        hintText = dict.flashcardHintNoun;
      } else if (currentWord.pos === 'verb') {
        hintText = dict.flashcardHintVerb;
      }

      const posChip =
        currentWord.pos === 'noun'
          ? isEn()
            ? 'Noun (Nomen)'
            : '名词 (Nomen)'
          : currentWord.pos === 'verb'
            ? isEn()
              ? 'Verb'
              : '动词 (Verb)'
            : getLocalizedPosLabel(currentWord);

      const speakFront = String(currentWord.word || '').replace(/^\(sich\)\s+/i, 'sich ');

      els.reviewStage.innerHTML =
        '<div class="flashcard-front">' +
        '<div class="tag-row">' +
        '<span class="level-badge">' +
        escapeHtml(currentWord.level || state.currentLevel.toUpperCase()) +
        '</span>' +
        '<span class="level-badge">' +
        escapeHtml(posChip) +
        '</span>' +
        '</div>' +
        '<div class="flashcard-word" data-speak="' +
        escapeHtml(speakFront) +
        '" title="' +
        escapeHtml(dict.flashcardSpeakTitle) +
        '">' +
        escapeHtml(currentWord.word) +
        '</div>' +
        (currentWord.ipa ? '<div class="word-ipa">' + escapeHtml(currentWord.ipa) + '</div>' : '') +
        '<button type="button" class="speak-btn" data-speak="' +
        escapeHtml(speakFront) +
        '">' +
        speakerSvg() +
        '<span>' +
        escapeHtml(dict.flashcardSpeakBtn) +
        '</span>' +
        '</button>' +
        '<div class="flashcard-hint">' +
        escapeHtml(hintText) +
        '</div>' +
        '<button type="button" class="reveal-btn" id="btnRevealAnswer">' +
        escapeHtml(dict.revealBtn) +
        '</button>' +
        '</div>';
      return;
    }

    const previews = window.SM2Store.previewIntervals(currentWord.id, state.lang);
    els.reviewStage.innerHTML =
      buildWordCardHtml(currentWord, { hideStudyControls: true }) +
      '<div class="rating-bar">' +
      '<div class="rating-prompt">' +
      escapeHtml(dict.ratingPrompt) +
      '</div>' +
      '<div class="rating-grid">' +
      '<button type="button" class="rate-btn rate-again" data-rate="again"><strong>' +
      escapeHtml(dict.rateAgain) +
      '</strong><span>' +
      escapeHtml(previews.again) +
      '</span></button>' +
      '<button type="button" class="rate-btn rate-hard" data-rate="hard"><strong>' +
      escapeHtml(dict.rateHard) +
      '</strong><span>' +
      escapeHtml(previews.hard) +
      '</span></button>' +
      '<button type="button" class="rate-btn rate-good" data-rate="good"><strong>' +
      escapeHtml(dict.rateGood) +
      '</strong><span>' +
      escapeHtml(previews.good) +
      '</span></button>' +
      '<button type="button" class="rate-btn rate-easy" data-rate="easy"><strong>' +
      escapeHtml(dict.rateEasy) +
      '</strong><span>' +
      escapeHtml(previews.easy) +
      '</span></button>' +
      '</div>' +
      '</div>';
  }

  function handleRate(rating) {
    if (state.reviewQueue.length === 0) return;
    const currentWord = state.reviewQueue.shift();
    const updated = window.SM2Store.recordReview(currentWord.id, rating);

    if (rating === 'again') {
      // 重来：放回本次队列末尾继续巩固
      state.reviewQueue.push(currentWord);
      showToast(t().toastAgain);
    } else {
      state.reviewDoneCount += 1;
      showToast(t().toastNextReview(updated.nextReviewDate, updated.interval));
    }

    state.reviewRevealed = false;
    updateHeaderStats();
    renderReviewView();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  // ==================== 切换与交互事件 ====================

  function switchMode(mode) {
    window.GermanSpeech.stop();
    state.currentMode = mode;

    els.btnModeBrowse.classList.toggle('active', mode === 'browse');
    els.btnModeReview.classList.toggle('active', mode === 'review');
    els.browseView.classList.toggle('hidden', mode !== 'browse');
    els.reviewView.classList.toggle('hidden', mode !== 'review');

    if (mode === 'review') {
      rebuildReviewQueue();
      renderReviewView();
    } else {
      renderWordList();
    }
  }

  function switchLevel(level) {
    if (!LEVELS.includes(level)) return;
    window.GermanSpeech.stop();
    state.currentLevel = level;
    state.activeLetter = 'ALL';
    state.searchQuery = '';
    els.searchInput.value = '';
    els.btnClearSearch.classList.add('hidden');
    els.browseView.classList.remove('mobile-detail-open');

    els.levelTabs.forEach((tab) => {
      const isActive = tab.dataset.level === level;
      tab.classList.toggle('active', isActive);
      tab.setAttribute('aria-selected', isActive ? 'true' : 'false');
    });

    updateHeaderStats();
    renderAlphaBar();

    if (state.currentMode === 'review') {
      rebuildReviewQueue();
      renderReviewView();
    } else {
      const words = state.vocabByLevel[level] || [];
      state.selectedWordId = words.length > 0 ? words[0].id : null;
      renderWordList();
    }
  }

  function bindEvents() {
    els.btnModeBrowse.addEventListener('click', () => switchMode('browse'));
    els.btnModeReview.addEventListener('click', () => switchMode('review'));

    if (els.btnLangZh) {
      els.btnLangZh.addEventListener('click', () => setLanguage('zh'));
    }
    if (els.btnLangEn) {
      els.btnLangEn.addEventListener('click', () => setLanguage('en'));
    }

    els.levelTabs.forEach((tab) => {
      tab.addEventListener('click', () => switchLevel(tab.dataset.level));
    });

    // 搜索输入
    els.searchInput.addEventListener('input', (e) => {
      state.searchQuery = e.target.value;
      els.btnClearSearch.classList.toggle('hidden', !state.searchQuery);
      state.activeLetter = 'ALL';
      renderAlphaBar();
      renderWordList();
    });

    els.btnClearSearch.addEventListener('click', () => {
      state.searchQuery = '';
      els.searchInput.value = '';
      els.btnClearSearch.classList.add('hidden');
      renderWordList();
      els.searchInput.focus();
    });

    // 字母快速跳转
    els.alphaBar.addEventListener('click', (e) => {
      const btn = e.target.closest('.alpha-btn');
      if (!btn || btn.disabled) return;
      const letter = btn.dataset.letter;
      state.activeLetter = letter;

      if (state.searchQuery) {
        state.searchQuery = '';
        els.searchInput.value = '';
        els.btnClearSearch.classList.add('hidden');
        renderWordList();
      }
      renderAlphaBar();

      if (letter === 'ALL') {
        els.wordList.scrollTo({ top: 0, behavior: 'smooth' });
        return;
      }

      const header = els.wordList.querySelector('[data-group-letter="' + letter + '"]');
      if (header) {
        header.scrollIntoView({ behavior: 'smooth', block: 'start' });
        const nextWordEl = header.nextElementSibling;
        if (nextWordEl && nextWordEl.dataset.wordId && window.innerWidth > 860) {
          state.selectedWordId = nextWordEl.dataset.wordId;
          renderWordList();
          const refreshedHeader = els.wordList.querySelector('[data-group-letter="' + letter + '"]');
          if (refreshedHeader) {
            refreshedHeader.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }
        }
      }
    });

    // 单词列表点击
    els.wordList.addEventListener('click', (e) => {
      const item = e.target.closest('.word-item');
      if (!item) return;
      const id = item.dataset.wordId;
      if (!id) return;
      state.selectedWordId = id;
      renderWordList();
      if (window.innerWidth <= 860) {
        els.browseView.classList.add('mobile-detail-open');
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    });

    // 移动端返回列表 & 上一个/下一个按钮
    els.btnMobileBack.addEventListener('click', () => {
      els.browseView.classList.remove('mobile-detail-open');
      window.GermanSpeech.stop();
    });

    els.btnPrevWord.addEventListener('click', () => navigateWord(-1));
    els.btnNextWord.addEventListener('click', () => navigateWord(1));

    // 详情页左右滑动切换单词（防误触：水平距离 > 50px 且明显大于垂直滑动距离）
    let touchStartX = 0;
    let touchStartY = 0;
    let touchTracking = false;

    function isInsideHorizontalScroller(target) {
      let node = target;
      while (node && node !== els.detailPane && node !== document.body) {
        if (node.scrollWidth > node.clientWidth + 4) {
          const style = window.getComputedStyle(node);
          if (style.overflowX === 'auto' || style.overflowX === 'scroll') {
            return true;
          }
        }
        node = node.parentElement;
      }
      return false;
    }

    els.detailPane.addEventListener(
      'touchstart',
      (e) => {
        if (state.currentMode !== 'browse') return;
        if (!e.touches || e.touches.length !== 1) {
          touchTracking = false;
          return;
        }
        if (isInsideHorizontalScroller(e.target)) {
          touchTracking = false;
          return;
        }
        touchStartX = e.touches[0].clientX;
        touchStartY = e.touches[0].clientY;
        touchTracking = true;
      },
      { passive: true }
    );

    els.detailPane.addEventListener(
      'touchcancel',
      () => {
        touchTracking = false;
      },
      { passive: true }
    );

    els.detailPane.addEventListener(
      'touchend',
      (e) => {
        if (!touchTracking || state.currentMode !== 'browse') return;
        touchTracking = false;
        if (!e.changedTouches || e.changedTouches.length === 0) return;

        const dx = e.changedTouches[0].clientX - touchStartX;
        const dy = e.changedTouches[0].clientY - touchStartY;
        const absX = Math.abs(dx);
        const absY = Math.abs(dy);

        // 水平位移超过 50px 且明显大于垂直位移（> 1.5 倍），避免上下滑看例句时误触
        if (absX > 50 && absX > absY * 1.5) {
          if (dx < 0) {
            navigateWord(1); // 左滑 -> 下一个单词
          } else {
            navigateWord(-1); // 右滑 -> 上一个单词
          }
        }
      },
      { passive: true }
    );

    // 全局事件委托：朗读 & 详情卡片操作 & 复习操作
    document.addEventListener('click', (e) => {
      const speakEl = e.target.closest('[data-speak]');
      if (speakEl) {
        speakText(speakEl.dataset.speak, speakEl);
        return;
      }

      const actionEl = e.target.closest('[data-action]');
      if (actionEl) {
        const action = actionEl.dataset.action;
        const wordId = actionEl.dataset.wordId;
        if (action === 'add-study' && wordId) {
          window.SM2Store.addWordToStudy(wordId);
          updateHeaderStats();
          renderWordList();
          showToast(t().toastAddedStudy);
        } else if (action === 'remove-study' && wordId) {
          window.SM2Store.removeWordFromStudy(wordId);
          updateHeaderStats();
          renderWordList();
          showToast(t().toastRemovedStudy);
        }
        return;
      }

      if (e.target.closest('#btnRevealAnswer')) {
        state.reviewRevealed = true;
        renderReviewView();
        return;
      }

      const rateBtn = e.target.closest('[data-rate]');
      if (rateBtn) {
        handleRate(rateBtn.dataset.rate);
        return;
      }

      const reviewAction = e.target.closest('[data-review-action]');
      if (reviewAction) {
        const act = reviewAction.dataset.reviewAction;
        if (act === 'go-browse') {
          switchMode('browse');
        } else if (act === 'switch-a1') {
          switchLevel('a1');
        } else if (act === 'add-unlearned') {
          const pool =
            state.reviewScope === 'all'
              ? getAllWords()
              : state.vocabByLevel[state.currentLevel] || [];
          const added = window.SM2Store.addWordsToStudy(pool.map((w) => w.id));
          updateHeaderStats();
          rebuildReviewQueue();
          renderReviewView();
          showToast(t().toastAddedBatch(added));
        }
      }
    });

    // 复习范围切换
    els.scopeLevel.addEventListener('click', () => {
      state.reviewScope = 'level';
      els.scopeLevel.classList.add('active');
      els.scopeAll.classList.remove('active');
      rebuildReviewQueue();
      renderReviewView();
    });

    els.scopeAll.addEventListener('click', () => {
      state.reviewScope = 'all';
      els.scopeAll.classList.add('active');
      els.scopeLevel.classList.remove('active');
      rebuildReviewQueue();
      renderReviewView();
    });

    // 桌面快捷键支持（浏览模式：← → 切词；复习模式：空格显示答案，1-4 选择掌握度）
    document.addEventListener('keydown', (e) => {
      const tag = e.target && e.target.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

      if (state.currentMode === 'browse') {
        if (e.key === 'ArrowLeft') {
          e.preventDefault();
          navigateWord(-1);
        } else if (e.key === 'ArrowRight') {
          e.preventDefault();
          navigateWord(1);
        }
        return;
      }

      if (state.currentMode !== 'review') return;
      if (state.reviewQueue.length === 0) return;

      if (!state.reviewRevealed && (e.code === 'Space' || e.code === 'Enter')) {
        e.preventDefault();
        state.reviewRevealed = true;
        renderReviewView();
      } else if (state.reviewRevealed) {
        const keyMap = { '1': 'again', '2': 'hard', '3': 'good', '4': 'easy' };
        if (keyMap[e.key]) {
          e.preventDefault();
          handleRate(keyMap[e.key]);
        }
      }
    });

    // 导出学习进度 JSON
    els.btnExport.addEventListener('click', () => {
      const json = window.SM2Store.exportJSON();
      const blob = new Blob([json], { type: 'application/json;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'deutschwort-progress-' + window.SM2Store.getTodayStr() + '.json';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      showToast(t().toastExported);
    });

    // 导入恢复学习进度 JSON
    els.btnImport.addEventListener('click', () => {
      els.importFileInput.value = '';
      els.importFileInput.click();
    });

    els.importFileInput.addEventListener('change', (e) => {
      const file = e.target.files && e.target.files[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = () => {
        const result = window.SM2Store.importJSON(String(reader.result || ''), state.lang);
        if (!result.ok) {
          showToast(t().toastImportFail(result.error));
          return;
        }
        updateHeaderStats();
        if (state.currentMode === 'review') {
          rebuildReviewQueue();
          renderReviewView();
        } else {
          renderWordList();
        }
        showToast(t().toastImportOk(result.count));
      };
      reader.onerror = () => {
        showToast(t().toastReadFail);
      };
      reader.readAsText(file, 'utf-8');
    });
  }

  // ==================== 数据加载与初始化 ====================

  async function loadLevelData(level) {
    try {
      const res = await fetch('./data/' + level + '.json');
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const list = await res.json();
      if (!Array.isArray(list)) return [];
      return sortGermanWords(list);
    } catch (err) {
      console.warn('加载词库失败:', level, err);
      return [];
    }
  }

  function registerServiceWorker() {
    if ('serviceWorker' in navigator && /^https?:$/.test(window.location.protocol)) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js').catch((err) => {
          console.warn('Service Worker 注册失败:', err);
        });
      });
    }
  }

  async function init() {
    applyStaticTranslations();
    if (els.progressSummary) {
      els.progressSummary.textContent = t().loadingVocab;
    }
    bindEvents();
    registerServiceWorker();

    const results = await Promise.all(LEVELS.map((lv) => loadLevelData(lv)));
    LEVELS.forEach((lv, index) => {
      const sorted = results[index];
      state.vocabByLevel[lv] = sorted;
      sorted.forEach((w) => {
        state.allWordsMap[w.id] = w;
      });
      const countEl = document.getElementById('count-' + lv);
      if (countEl) countEl.textContent = String(sorted.length);
    });

    const initialWords = state.vocabByLevel[state.currentLevel] || [];
    if (initialWords.length > 0) {
      state.selectedWordId = initialWords[0].id;
    }

    updateHeaderStats();
    renderAlphaBar();
    renderWordList();
  }

  document.addEventListener('DOMContentLoaded', init);
})();
