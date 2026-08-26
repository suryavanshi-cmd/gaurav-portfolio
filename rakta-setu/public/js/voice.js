/* Marathi speech in and out.
   Browser support for `mr-IN` is uneven: Chrome on Android recognises it,
   desktop Safari does not, and many devices ship a Hindi voice but no Marathi
   one. Everything below degrades instead of breaking — if speech is missing
   the patient can always type and read. */

(function (global) {
  'use strict';

  var SR = global.SpeechRecognition || global.webkitSpeechRecognition;
  var synth = global.speechSynthesis;

  var Voice = {
    recognitionSupported: Boolean(SR),
    speechSupported: Boolean(synth),
    listening: false,
  };

  var recognition = null;

  /** Start listening. Calls onResult(text) once, onEnd() always. */
  Voice.listen = function (opts) {
    var onResult = opts.onResult || function () {};
    var onError = opts.onError || function () {};
    var onEnd = opts.onEnd || function () {};
    var onPartial = opts.onPartial || function () {};

    if (!SR) { onError('unsupported'); onEnd(); return; }
    if (Voice.listening) { Voice.stop(); return; }

    recognition = new SR();
    recognition.lang = 'mr-IN';
    recognition.interimResults = true;
    recognition.continuous = false;
    recognition.maxAlternatives = 1;

    var finalText = '';

    recognition.onresult = function (event) {
      var interim = '';
      for (var i = event.resultIndex; i < event.results.length; i++) {
        var chunk = event.results[i][0].transcript;
        if (event.results[i].isFinal) finalText += chunk;
        else interim += chunk;
      }
      if (interim) onPartial(interim);
    };

    recognition.onerror = function (event) {
      // `no-speech` and `aborted` are normal user behaviour, not failures.
      if (event.error !== 'no-speech' && event.error !== 'aborted') onError(event.error);
    };

    recognition.onend = function () {
      Voice.listening = false;
      if (finalText.trim()) onResult(finalText.trim());
      onEnd();
    };

    try {
      recognition.start();
      Voice.listening = true;
    } catch (err) {
      Voice.listening = false;
      onError('start-failed');
      onEnd();
    }
  };

  Voice.stop = function () {
    if (recognition && Voice.listening) {
      try { recognition.stop(); } catch (err) { /* already stopping */ }
    }
    Voice.listening = false;
  };

  /* ── speaking ── */

  var voicesReady = false;
  function loadVoices() {
    if (!synth) return [];
    var list = synth.getVoices();
    if (list.length) voicesReady = true;
    return list;
  }
  if (synth) {
    loadVoices();
    synth.onvoiceschanged = loadVoices;
  }

  /** Best available voice: Marathi, else Hindi, else any Indian English. */
  function pickVoice() {
    var voices = loadVoices();
    return voices.find(function (v) { return /^mr(-|_)?/i.test(v.lang); })
      || voices.find(function (v) { return /^hi(-|_)?/i.test(v.lang); })
      || voices.find(function (v) { return /en-IN/i.test(v.lang); })
      || null;
  }

  Voice.hasMarathiVoice = function () {
    var v = pickVoice();
    return Boolean(v && /^mr/i.test(v.lang));
  };

  /**
   * Speak Marathi text. Long answers are split on sentence boundaries because
   * several mobile browsers silently truncate a single long utterance.
   */
  Voice.speak = function (text, opts) {
    opts = opts || {};
    if (!synth || !text) { if (opts.onEnd) opts.onEnd(); return; }

    Voice.stopSpeaking();

    var voice = pickVoice();
    var chunks = String(text)
      .replace(/[••]/g, '')
      .split(/(?<=[।.!?\n])\s+/)
      .map(function (s) { return s.trim(); })
      .filter(Boolean);

    if (!chunks.length) { if (opts.onEnd) opts.onEnd(); return; }

    var index = 0;
    function next() {
      if (index >= chunks.length) { if (opts.onEnd) opts.onEnd(); return; }
      var utter = new global.SpeechSynthesisUtterance(chunks[index++]);
      utter.lang = voice ? voice.lang : 'mr-IN';
      if (voice) utter.voice = voice;
      utter.rate = opts.rate || 0.92;   // slightly slow — many readers are elderly
      utter.pitch = 1;
      utter.onend = next;
      utter.onerror = next;
      synth.speak(utter);
    }

    if (!voicesReady) {
      // Chrome populates the voice list asynchronously on first use.
      setTimeout(next, 120);
    } else {
      next();
    }
  };

  Voice.stopSpeaking = function () {
    if (synth) { try { synth.cancel(); } catch (err) { /* nothing to cancel */ } }
  };

  Voice.speaking = function () { return Boolean(synth && synth.speaking); };

  global.Voice = Voice;
}(window));
