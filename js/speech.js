(function (global) {
  'use strict';

  const synth = 'speechSynthesis' in global ? global.speechSynthesis : null;
  let cachedVoice = null;

  function pickGermanVoice() {
    if (!synth) return null;
    const voices = synth.getVoices();
    if (!voices || voices.length === 0) return null;

    // 优先选择 de-DE 语音，其次任意德语语音
    const exactDeDE = voices.filter(
      (v) => v.lang && v.lang.toLowerCase().replace('_', '-') === 'de-de'
    );
    if (exactDeDE.length > 0) {
      const preferred =
        exactDeDE.find((v) => /google|microsoft|anna|katja|conrad|hedda/i.test(v.name)) ||
        exactDeDE.find((v) => v.localService) ||
        exactDeDE[0];
      cachedVoice = preferred;
      return preferred;
    }

    const anyDe = voices.find((v) => v.lang && v.lang.toLowerCase().startsWith('de'));
    cachedVoice = anyDe || null;
    return cachedVoice;
  }

  if (synth) {
    pickGermanVoice();
    if (typeof synth.addEventListener === 'function') {
      synth.addEventListener('voiceschanged', pickGermanVoice);
    } else {
      synth.onvoiceschanged = pickGermanVoice;
    }
  }

  function isSupported() {
    return Boolean(synth && typeof SpeechSynthesisUtterance !== 'undefined');
  }

  function stop() {
    if (synth) {
      synth.cancel();
    }
  }

  function speak(text, options) {
    const opts = options || {};
    const isEn = opts.lang === 'en';
    if (!isSupported()) {
      if (typeof opts.onError === 'function') {
        opts.onError(
          isEn
            ? 'Speech synthesis (Web Speech API) is not supported in this browser.'
            : '当前浏览器不支持语音朗读（Web Speech API）。'
        );
      }
      return false;
    }

    const cleanText = String(text || '').trim();
    if (!cleanText) return false;

    try {
      synth.cancel();

      const utterance = new SpeechSynthesisUtterance(cleanText);
      utterance.lang = 'de-DE';
      utterance.rate = typeof opts.rate === 'number' ? opts.rate : 0.95;
      utterance.pitch = 1.0;

      const voice = cachedVoice || pickGermanVoice();
      if (voice) {
        utterance.voice = voice;
      }

      utterance.onstart = () => {
        if (typeof opts.onStart === 'function') opts.onStart();
      };
      utterance.onend = () => {
        if (typeof opts.onEnd === 'function') opts.onEnd();
      };
      utterance.onerror = (event) => {
        // 主动切换朗读触发的 canceled / interrupted 不视为错误
        if (event && (event.error === 'canceled' || event.error === 'interrupted')) {
          if (typeof opts.onEnd === 'function') opts.onEnd();
          return;
        }
        if (typeof opts.onError === 'function') {
          opts.onError(
            isEn
              ? 'Speech playback failed. Please check German voice availability or audio settings.'
              : '朗读失败，请检查系统是否已安装德语语音包或取消静音。'
          );
        }
      };

      synth.speak(utterance);
      return true;
    } catch (err) {
      if (typeof opts.onError === 'function') {
        opts.onError(
          isEn ? 'Failed to initialize speech playback.' : '语音播放初始化失败。'
        );
      }
      return false;
    }
  }

  global.GermanSpeech = {
    isSupported,
    speak,
    stop
  };
})(window);
