(function () {
  'use strict';

  const LEVELS = ['a1', 'a2', 'b1', 'b2'];
  const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
  const germanCollator = new Intl.Collator('de-DE', {
    usage: 'sort',
    sensitivity: 'variant'
  });

  const state = {
    vocabByLevel: { a1: [], a2: [], b1: [], b2: [] },
    allWordsMap: {},
    currentLevel: 'a1',
    currentMode: 'browse', // 'browse' | 'review'
    searchQuery: '',
    activeLetter: 'ALL',
    selectedWordId: null,
    reviewScope: 'level', // 'level' | 'all'
    reviewQueue: [],
    reviewRevealed: false,
    reviewDoneCount: 0,
    activeSpeakEl: null
  };

  // DOM 缓存
  const els = {
    btnModeBrowse: document.getElementById('btnModeBrowse'),
    btnModeReview: document.getElementById('btnModeReview'),
    dueBadge: document.getElementById('dueBadge'),
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

  // 获取德语单词对应的 A-Z 首字母（ä->A, ö->O, ü->U, ß->S）
  function getGermanInitial(word) {
    const clean = String(word || '').trim();
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
    return words.slice().sort((a, b) => germanCollator.compare(a.word, b.word));
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
    return wordObj.word;
  }

  function getPosBadgeClass(wordObj) {
    if (wordObj.pos === 'noun') {
      if (wordObj.gender === 'm') return 'pos-m';
      if (wordObj.gender === 'f') return 'pos-f';
      return 'pos-n';
    }
    return 'pos-verb';
  }

  function formatArticleHtml(wordObj) {
    if (wordObj.pos !== 'noun' || !wordObj.article) return '';
    const cls = 'article-' + (wordObj.gender || 'm');
    return '<span class="article-tag ' + cls + '">' + escapeHtml(wordObj.article) + '</span>';
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

    els.progressSummary.textContent =
      levelLabel +
      '：已学 ' +
      learnedInLevel +
      ' / ' +
      levelWords.length +
      ' 词 · 今日待复习 ' +
      dueInLevel +
      ' 词';

    els.scopeLevel.textContent = '当前等级 (' + levelLabel + ')';
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
      '" data-letter="ALL">全部</button>';

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

    els.listMeta.innerHTML =
      '<span>按德语字母表排序（ä/ö/ü/ß）</span><span>共 ' + filtered.length + ' 词</span>';

    if (allInLevel.length === 0) {
      els.wordList.innerHTML =
        '<div style="padding:28px 14px;text-align:center;color:var(--text-muted);font-size:14px;">' +
        '当前 <strong>' +
        state.currentLevel.toUpperCase() +
        '</strong> 词库暂未添加单词。<br/>后续可直接向 <code>data/' +
        state.currentLevel +
        '.json</code> 填入词条。</div>';
      renderEmptyDetail(
        state.currentLevel.toUpperCase() + ' 词库待扩充',
        '目前测试词存放在 A1 词库中，您可以切换到 A1 体验全部功能，或后续按相同 JSON 格式扩充此等级词库。',
        true
      );
      return;
    }

    if (filtered.length === 0) {
      els.wordList.innerHTML =
        '<div style="padding:28px 14px;text-align:center;color:var(--text-muted);font-size:14px;">未找到与“' +
        escapeHtml(state.searchQuery) +
        '”匹配的单词。</div>';
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
      const status = window.SM2Store.getStatusInfo(rec);
      const selectedClass = w.id === state.selectedWordId ? ' selected' : '';
      const meaningPreview = (w.meanings || []).map((m) => m.zh).join('；');

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
    if (w.pos === 'noun' && w.declension) {
      const d = w.declension;
      const rows = [
        { key: 'nominativ', name: 'Nominativ', sub: '第一格 · 主格' },
        { key: 'akkusativ', name: 'Akkusativ', sub: '第四格 · 宾格' },
        { key: 'dativ', name: 'Dativ', sub: '第三格 · 与格' },
        { key: 'genitiv', name: 'Genitiv', sub: '第二格 · 属格' }
      ];

      let tbody = '';
      rows.forEach((r) => {
        const pair = d[r.key] || { singular: '-', plural: '-' };
        tbody +=
          '<tr>' +
          '<td><span class="case-name">' +
          r.name +
          '</span><span class="case-sub">' +
          r.sub +
          '</span></td>' +
          '<td>' +
          highlightDeclensionCell(pair.singular, w.gender) +
          '</td>' +
          '<td>' +
          highlightDeclensionCell(pair.plural, 'pl') +
          '</td>' +
          '</tr>';
      });

      return (
        '<div class="section-block">' +
        '<h3>名词四格变格表 (Deklination)</h3>' +
        '<div class="table-wrap">' +
        '<table class="grammar-table">' +
        '<thead><tr><th>格 (Kasus)</th><th>单数 (Singular)</th><th>复数 (Plural)</th></tr></thead>' +
        '<tbody>' +
        tbody +
        '</tbody></table></div></div>'
      );
    }

    if (w.pos === 'verb' && w.conjugation) {
      const c = w.conjugation;
      const p = c.present || {};
      const persons = [
        { label: 'ich', value: p.ich },
        { label: 'wir', value: p.wir },
        { label: 'du', value: p.du },
        { label: 'ihr', value: p.ihr },
        { label: 'er / sie / es', value: p.er_sie_es },
        { label: 'sie / Sie', value: p.sie_Sie }
      ];

      let grid = '';
      persons.forEach((item) => {
        grid +=
          '<div class="conj-cell">' +
          '<span class="conj-pronoun">' +
          item.label +
          '</span>' +
          '<span class="conj-form">' +
          escapeHtml(item.value || '-') +
          '</span>' +
          '</div>';
      });

      return (
        '<div class="section-block">' +
        '<h3>动词变位表 (Konjugation)</h3>' +
        '<div class="verb-tenses">' +
        '<div class="tense-card">' +
        '<div class="tense-label">过去式 (Präteritum)</div>' +
        '<div class="tense-value">' +
        escapeHtml(c.praeteritum || '-') +
        '</div>' +
        '</div>' +
        '<div class="tense-card">' +
        '<div class="tense-label">现在完成时 (Perfekt)<span class="aux-chip">助动词：' +
        escapeHtml(w.auxiliary || 'haben') +
        '</span></div>' +
        '<div class="tense-value">' +
        escapeHtml(c.perfekt || '-') +
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
    const rec = window.SM2Store.getRecord(w.id);
    const status = window.SM2Store.getStatusInfo(rec);
    const speakTarget = getSpeakWordText(w);

    let submetaHtml = '';
    if (w.pos === 'noun') {
      submetaHtml =
        '<span>定冠词：<strong>' +
        escapeHtml(w.article || '-') +
        '</strong></span>' +
        '<span>复数：<strong>die ' +
        escapeHtml(w.plural || '-') +
        '</strong></span>';
    } else if (w.pos === 'verb') {
      submetaHtml =
        '<span>类型：<strong>' +
        escapeHtml(w.regularity || '动词') +
        '</strong></span>' +
        '<span>完成时助动词：<strong>' +
        escapeHtml(w.auxiliary || 'haben') +
        '</strong></span>';
    }

    let studyActionHtml = '';
    if (!opts.hideStudyControls) {
      if (!rec) {
        studyActionHtml =
          '<button type="button" class="primary-btn" data-action="add-study" data-word-id="' +
          escapeHtml(w.id) +
          '">+ 加入今日复习</button>';
      } else {
        studyActionHtml =
          '<span class="status-pill status-' +
          status.code +
          '">' +
          escapeHtml(status.label) +
          '</span>' +
          '<button type="button" class="secondary-btn" data-action="remove-study" data-word-id="' +
          escapeHtml(w.id) +
          '" title="重置该词的记忆进度">重置</button>';
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
        '<div class="meaning-zh">' +
        escapeHtml(m.zh) +
        '</div>' +
        '<div class="meaning-en">' +
        escapeHtml(m.en) +
        '</div>' +
        '</div>' +
        '</li>';
    });

    let examplesHtml = '';
    (w.examples || []).forEach((ex) => {
      examplesHtml +=
        '<div class="example-item">' +
        '<button type="button" class="speak-icon-btn" data-speak="' +
        escapeHtml(ex.de) +
        '" title="朗读例句" aria-label="朗读例句">' +
        speakerSvg() +
        '</button>' +
        '<div class="example-body">' +
        '<div class="example-de" data-speak="' +
        escapeHtml(ex.de) +
        '" title="点击朗读德语例句">' +
        escapeHtml(ex.de) +
        '</div>' +
        '<div class="example-zh">' +
        escapeHtml(ex.zh) +
        '</div>' +
        '<div class="example-en">' +
        escapeHtml(ex.en) +
        '</div>' +
        '</div>' +
        '</div>';
    });

    const noteHtml = w.note
      ? '<div class="word-note">💡 ' + escapeHtml(w.note) + '</div>'
      : '';

    return (
      '<div class="detail-card">' +
      '<div class="detail-top-bar">' +
      '<div class="tag-row">' +
      '<span class="pos-badge ' +
      getPosBadgeClass(w) +
      '">' +
      escapeHtml(w.posLabel || w.pos) +
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
      '" title="点击朗读单词发音">' +
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
      '<span>朗读德语</span>' +
      '</button>' +
      '</div>' +
      noteHtml +
      '<div class="section-block">' +
      '<h3>完整释义（中英对照）</h3>' +
      '<ol class="meaning-list">' +
      meaningsHtml +
      '</ol>' +
      '</div>' +
      buildGrammarSectionHtml(w) +
      '<div class="section-block">' +
      '<h3>地道例句（点击德语句子可朗读）</h3>' +
      '<div class="example-list">' +
      examplesHtml +
      '</div>' +
      '</div>' +
      '</div>'
    );
  }

  function renderEmptyDetail(title, desc, showBackToA1) {
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
        ? '<div class="empty-actions"><button type="button" class="primary-btn" id="btnJumpA1">切换到 A1 词库</button></div>'
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
      renderEmptyDetail('请选择一个单词', '点击左侧列表中的任意德语单词，查看完整释义、变格/变位表和例句。', false);
      return;
    }
    els.detailContent.innerHTML = buildWordCardHtml(w, { hideStudyControls: false });
  }

  // ==================== 今日复习（SM-2）渲染 ====================

  function rebuildReviewQueue() {
    state.reviewQueue = getDueWords(state.reviewScope);
    state.reviewRevealed = false;
    state.reviewDoneCount = 0;
  }

  function renderReviewView() {
    const totalRemaining = state.reviewQueue.length;
    els.reviewCounter.textContent =
      '本次已完成 ' + state.reviewDoneCount + ' 词 · 队列剩余 ' + totalRemaining + ' 词';

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
          '<h2>当前等级暂无词条</h2>' +
          '<p>您可以切换到 A1 词库，或点击上方「全部等级」开始复习。</p>' +
          '<div class="empty-actions">' +
          '<button type="button" class="primary-btn" data-review-action="switch-a1">切换到 A1</button>' +
          '</div></div>';
        return;
      }

      if (unlearned.length > 0) {
        els.reviewStage.innerHTML =
          '<div class="empty-card">' +
          '<div class="empty-icon">✨</div>' +
          '<h2>' +
          (state.reviewDoneCount > 0 ? '已复习完当前到期单词！' : '今日暂无到期复习词') +
          '</h2>' +
          '<p>当前范围内还有 <strong>' +
          unlearned.length +
          '</strong> 个未学习的新词。点击下方按钮即可加入 SM-2 记忆曲线队列开始今日练习。</p>' +
          '<div class="empty-actions">' +
          '<button type="button" class="primary-btn" data-review-action="add-unlearned">将这 ' +
          unlearned.length +
          ' 个新词加入今日复习</button>' +
          '<button type="button" class="secondary-btn" data-review-action="go-browse">返回词库浏览</button>' +
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
        '<h2>今日复习全部完成！</h2>' +
        '<p>太棒了！当前范围内的所有单词都已按 SM-2 记忆曲线排期。' +
        (nextDate ? '下一次复习日期为 <strong>' + escapeHtml(nextDate) + '</strong>。' : '') +
        '</p>' +
        '<div class="empty-actions">' +
        '<button type="button" class="primary-btn" data-review-action="go-browse">返回词库浏览</button>' +
        '</div></div>';
      return;
    }

    const currentWord = state.reviewQueue[0];

    if (!state.reviewRevealed) {
      const hintText =
        currentWord.pos === 'noun'
          ? '请回忆该名词的定冠词（der/die/das）、复数形式及中英文释义'
          : '请回忆该动词的现在时变位、过去式/完成时及中英文释义';

      els.reviewStage.innerHTML =
        '<div class="flashcard-front">' +
        '<div class="tag-row">' +
        '<span class="level-badge">' +
        escapeHtml(currentWord.level || state.currentLevel.toUpperCase()) +
        '</span>' +
        '<span class="level-badge">' +
        (currentWord.pos === 'noun' ? '名词 (Nomen)' : '动词 (Verb)') +
        '</span>' +
        '</div>' +
        '<div class="flashcard-word" data-speak="' +
        escapeHtml(currentWord.word) +
        '" title="点击朗读单词">' +
        escapeHtml(currentWord.word) +
        '</div>' +
        (currentWord.ipa ? '<div class="word-ipa">' + escapeHtml(currentWord.ipa) + '</div>' : '') +
        '<button type="button" class="speak-btn" data-speak="' +
        escapeHtml(currentWord.word) +
        '">' +
        speakerSvg() +
        '<span>朗读单词</span>' +
        '</button>' +
        '<div class="flashcard-hint">' +
        hintText +
        '</div>' +
        '<button type="button" class="reveal-btn" id="btnRevealAnswer">显示答案</button>' +
        '</div>';
      return;
    }

    const previews = window.SM2Store.previewIntervals(currentWord.id);
    els.reviewStage.innerHTML =
      buildWordCardHtml(currentWord, { hideStudyControls: true }) +
      '<div class="rating-bar">' +
      '<div class="rating-prompt">请根据刚才的回忆情况选择掌握度（SM-2 算法将自动计算下次复习时间）</div>' +
      '<div class="rating-grid">' +
      '<button type="button" class="rate-btn rate-again" data-rate="again"><strong>重来</strong><span>' +
      escapeHtml(previews.again) +
      '</span></button>' +
      '<button type="button" class="rate-btn rate-hard" data-rate="hard"><strong>困难</strong><span>' +
      escapeHtml(previews.hard) +
      '</span></button>' +
      '<button type="button" class="rate-btn rate-good" data-rate="good"><strong>良好</strong><span>' +
      escapeHtml(previews.good) +
      '</span></button>' +
      '<button type="button" class="rate-btn rate-easy" data-rate="easy"><strong>简单</strong><span>' +
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
      showToast('已重置，将在本次复习末尾再次出现');
    } else {
      state.reviewDoneCount += 1;
      showToast('下次复习：' + updated.nextReviewDate + '（' + updated.interval + ' 天后）');
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

    // 移动端返回列表
    els.btnMobileBack.addEventListener('click', () => {
      els.browseView.classList.remove('mobile-detail-open');
      window.GermanSpeech.stop();
    });

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
          showToast('已加入今日复习队列');
        } else if (action === 'remove-study' && wordId) {
          window.SM2Store.removeWordFromStudy(wordId);
          updateHeaderStats();
          renderWordList();
          showToast('已重置该单词的学习记录');
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
          showToast('已将 ' + added + ' 个新词加入今日复习');
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

    // 桌面快捷键支持（复习模式：空格显示答案，1-4 选择掌握度）
    document.addEventListener('keydown', (e) => {
      if (state.currentMode !== 'review') return;
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
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
      showToast('已导出学习进度 JSON 文件');
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
        const result = window.SM2Store.importJSON(String(reader.result || ''));
        if (!result.ok) {
          showToast('导入失败：' + result.error);
          return;
        }
        updateHeaderStats();
        if (state.currentMode === 'review') {
          rebuildReviewQueue();
          renderReviewView();
        } else {
          renderWordList();
        }
        showToast('已成功恢复 ' + result.count + ' 条学习进度');
      };
      reader.onerror = () => {
        showToast('读取文件失败，请重试');
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
