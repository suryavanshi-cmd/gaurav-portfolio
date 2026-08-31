/* रक्त-सेतू — patient report page controller. */
(function () {
  'use strict';

  var token = decodeURIComponent((location.pathname.match(/\/r\/([^/?#]+)/) || [])[1] || '');
  var PIN_KEY = 'rakta-setu:pin:' + token;

  var el = function (id) { return document.getElementById(id); };
  var state = { pin: null, data: null, history: [], busy: false };

  /* ── helpers ── */

  function show(node) { if (node) node.hidden = false; }
  function hide(node) { if (node) node.hidden = true; }

  function text(str) { return document.createTextNode(String(str == null ? '' : str)); }

  /** Builds an element with text children only — never innerHTML with API data. */
  function h(tag, attrs, children) {
    var node = document.createElement(tag);
    Object.keys(attrs || {}).forEach(function (k) {
      if (k === 'class') node.className = attrs[k];
      else if (k === 'text') node.appendChild(text(attrs[k]));
      else if (k.slice(0, 2) === 'on') node.addEventListener(k.slice(2), attrs[k]);
      else if (attrs[k] !== null && attrs[k] !== undefined) node.setAttribute(k, attrs[k]);
    });
    (children || []).forEach(function (c) { if (c) node.appendChild(c); });
    return node;
  }

  function api(path, body) {
    return fetch('/api/report/' + encodeURIComponent(token) + path, {
      method: body ? 'POST' : 'GET',
      headers: body ? { 'Content-Type': 'application/json' } : {},
      body: body ? JSON.stringify(body) : undefined,
    }).then(function (res) {
      return res.json().catch(function () { return {}; }).then(function (json) {
        if (!res.ok) {
          var err = new Error(json.error || 'विनंती अयशस्वी झाली.');
          err.status = res.status;
          throw err;
        }
        return json;
      });
    });
  }

  var SEX_MR = { male: 'पुरुष', female: 'स्त्री' };

  /* ── unlock ── */

  function boot() {
    if (!token) { fail('ही लिंक बरोबर नाही. कृपया प्रयोगशाळेशी संपर्क साधा.'); return; }

    api('/meta').then(function (meta) {
      el('gateFooter').appendChild(text(
        'अडचण आल्यास ' + meta.labName + (meta.labPhone ? ' — ' + meta.labPhone : '') + ' यांच्याशी संपर्क साधा.'
      ));

      if (meta.patientFirstName) {
        el('gateTitle').textContent = 'नमस्कार ' + meta.patientFirstName + ', तुमचा अहवाल तयार आहे';
      }
      if (meta.phoneHint) {
        el('gateHint').textContent = 'सुरक्षिततेसाठी, ' + meta.phoneHint + ' या नंबरचे शेवटचे ४ अंक टाका.';
      }

      var saved = sessionStorage.getItem(PIN_KEY);
      if (!meta.requiresPin) { unlock(''); return; }
      if (saved) { unlock(saved, true); return; }

      hide(el('loading'));
      show(el('gate'));
      el('pin').focus();
    }).catch(function (err) { fail(err.message); });
  }

  function fail(message) {
    hide(el('gate'));
    var box = el('loading');
    box.textContent = '';
    box.appendChild(h('p', { class: 'error', text: message }));
    show(box);
  }

  el('pinForm').addEventListener('submit', function (event) {
    event.preventDefault();
    var value = el('pin').value.replace(/\D/g, '');
    if (value.length !== 4) {
      el('gateError').textContent = 'कृपया ४ अंक टाका.';
      return;
    }
    el('unlockBtn').disabled = true;
    el('gateError').textContent = '';
    unlock(value);
  });

  function unlock(pin, silent) {
    api('', { pin: pin }).then(function (data) {
      state.pin = pin;
      state.data = data;
      try { sessionStorage.setItem(PIN_KEY, pin); } catch (e) { /* private mode */ }
      render(data);
    }).catch(function (err) {
      try { sessionStorage.removeItem(PIN_KEY); } catch (e) { /* ignore */ }
      el('unlockBtn').disabled = false;
      if (silent) {
        hide(el('loading'));
        show(el('gate'));
        el('pin').focus();
      } else if (err.status === 401) {
        el('gateError').textContent = err.message;
        el('pin').value = '';
        el('pin').focus();
        hide(el('loading'));
        show(el('gate'));
      } else {
        fail(err.message);
      }
    });
  }

  /* ── rendering ── */

  function render(data) {
    var report = data.report;
    var interp = report.interpretation;

    document.title = (report.patient.name ? report.patient.name + ' — ' : '') + 'रक्त तपासणी अहवाल';

    el('labName').textContent = data.labName;
    el('labSub').textContent = [data.labCity, report.reportedAt ? 'अहवाल दिनांक: ' + report.reportedAt : null]
      .filter(Boolean).join(' · ');

    if (data.labPhone) {
      var call = el('callLab');
      call.href = 'tel:' + data.labPhone;
      call.hidden = false;
    }

    el('headline').textContent = interp.headline;

    var meta = el('patientMeta');
    [
      ['नाव', report.patient.name],
      ['वय', report.patient.age ? report.patient.age + ' वर्षे' : null],
      ['लिंग', SEX_MR[report.patient.sex] || null],
      ['अहवाल क्र.', report.labNo],
      ['डॉक्टर', report.doctor],
    ].forEach(function (pair) {
      if (!pair[1]) return;
      meta.appendChild(h('span', {}, [text(pair[0] + ': '), h('b', { text: pair[1] })]));
    });

    if (interp.critical && interp.critical.length) renderCriticalAlert(interp.critical);
    renderAdvice(interp.topAdvice);
    renderResults(interp.groups);
    renderChips(interp);

    (data.history || []).forEach(function (row) {
      addMessage('user', row.question);
      addMessage('bot', row.answer, row.source);
      state.history.push({ role: 'user', content: row.question });
      state.history.push({ role: 'assistant', content: row.answer });
    });

    setupVoice(data.aiEnabled);

    hide(el('loading'));
    hide(el('gate'));
    show(el('app'));
  }

  function renderCriticalAlert(critical) {
    var names = critical.map(function (c) { return c.mr; }).join(', ');
    el('criticalAlert').appendChild(
      h('section', { class: 'card alert', role: 'alert' }, [
        h('h2', { text: '⚠️ लक्ष द्या' }),
        h('p', {}, [
          h('strong', { text: names }),
          text(' — हे मूल्य नेहमीच्या मर्यादेपेक्षा बरंच वेगळं आलं आहे. कृपया हा अहवाल घेऊन आजच डॉक्टरांना भेटा. घाबरून जाऊ नका, पण उशीरही करू नका.'),
        ]),
      ])
    );
  }

  function renderAdvice(tips) {
    if (!tips || !tips.length) return;
    var list = el('adviceList');
    tips.forEach(function (t) {
      list.appendChild(h('li', {}, [
        text(t.tip + ' '),
        h('span', { class: 'muted', text: '(' + t.because + 'साठी)' }),
      ]));
    });
    show(el('adviceCard'));

    el('readAdvice').addEventListener('click', function () {
      var speech = 'तुमच्यासाठी आहाराचा सल्ला. ' + tips.map(function (t) { return t.tip; }).join(' ');
      speakToggle(speech, el('readAdvice'), '🔊 सल्ला ऐका');
    });
  }

  function renderResults(groups) {
    var container = el('results');
    groups.forEach(function (group) {
      container.appendChild(h('h3', { class: 'group-title', text: group.mr }));
      group.items.forEach(function (item) { container.appendChild(resultCard(item)); });
    });
  }

  function resultCard(item) {
    var cls = 'result' + (item.severity === 2 ? ' is-critical' : item.severity === 1 ? ' is-abnormal' : '');
    var body = h('div', { class: 'result-body' }, []);
    body.hidden = true;

    var head = h('button', {
      class: 'result-head',
      type: 'button',
      'aria-expanded': 'false',
      onclick: function () {
        var open = body.hidden;
        body.hidden = !open;
        head.setAttribute('aria-expanded', String(open));
        head.parentNode.classList.toggle('open', open);
      },
    }, [
      h('span', { class: 'result-name' }, [
        text(item.mr),
        h('span', { class: 'result-en', text: item.en }),
      ]),
      h('span', { class: 'result-value' }, [
        text(formatValue(item.value)),
        h('span', { class: 'result-unit', text: item.unit || '' }),
      ]),
      h('span', {}, [
        h('span', { class: 'pill ' + item.status, text: item.statusMr }),
        text(' '),
        h('span', { class: 'chev', text: '▾' }),
      ]),
    ]);

    // range bar
    if (item.range) {
      var track = h('div', { class: 'bar-track' }, [
        h('div', { class: 'bar-normal' }),
      ]);
      var dot = h('div', { class: 'bar-dot' });
      dot.style.left = (item.position * 100).toFixed(1) + '%';
      track.appendChild(dot);
      body.appendChild(h('div', { class: 'bar' }, [
        track,
        h('div', { class: 'bar-labels' }, [
          h('span', { text: 'सामान्य मर्यादा' }),
          h('span', { text: item.rangeText + ' ' + (item.unit || '') }),
        ]),
      ]));
    }

    body.appendChild(h('h4', { text: 'ही तपासणी काय दाखवते' }));
    body.appendChild(h('p', { text: item.about }));

    body.appendChild(h('h4', { text: 'तुमच्या निकालाचा अर्थ' }));
    body.appendChild(h('p', { text: item.meaning }));

    if (item.causes && item.causes.length) {
      body.appendChild(h('h4', { text: 'संभाव्य कारणं' }));
      body.appendChild(h('ul', {}, item.causes.map(function (c) { return h('li', { text: c }); })));
    }

    if (item.advice && item.advice.length) {
      body.appendChild(h('h4', { text: 'काय करावं' }));
      body.appendChild(h('ul', {}, item.advice.map(function (a) { return h('li', { text: a }); })));
    }

    var listenBtn = h('button', { class: 'btn btn-small', type: 'button', text: '🔊 ऐका' });
    listenBtn.addEventListener('click', function () {
      var speech = item.mr + '. तुमचं मूल्य ' + formatValue(item.value) + ' ' + (item.unit || '')
        + ' आहे, जे ' + item.statusMr + ' आहे. ' + item.about + ' ' + item.meaning
        + (item.advice.length ? ' काय करावं: ' + item.advice.join(' ') : '');
      speakToggle(speech, listenBtn, '🔊 ऐका');
    });
    body.appendChild(h('div', { class: 'msg-actions no-print' }, [listenBtn]));

    return h('div', { class: cls }, [head, body]);
  }

  function formatValue(value) {
    if (!isFinite(value)) return '—';
    if (Math.abs(value) >= 10000) return value.toLocaleString('en-IN');
    return String(Math.round(value * 100) / 100);
  }

  /* ── question chips ── */

  function renderChips(interp) {
    var chips = ['माझा अहवाल कसा आहे?', 'मी काय खावं?', 'मी डॉक्टरांना कधी भेटावं?'];
    var abnormal = interp.items.filter(function (i) { return i.severity > 0; });
    abnormal.slice(0, 2).forEach(function (item) {
      chips.push('माझं ' + item.mr + ' ' + item.statusMr + ' का आहे?');
    });

    var box = el('chips');
    chips.forEach(function (q) {
      box.appendChild(h('button', {
        class: 'chip', type: 'button', text: q,
        onclick: function () { ask(q); },
      }));
    });
  }

  /* ── voice + Q&A ── */

  function setupVoice(aiEnabled) {
    var micBtn = el('micBtn');

    if (!Voice.recognitionSupported) {
      micBtn.disabled = true;
      micBtn.title = 'या ब्राउझरमध्ये आवाजाने विचारण्याची सोय नाही';
      el('voiceSupport').textContent =
        'या ब्राउझरमध्ये आवाज ओळखण्याची सोय नाही. कृपया खाली तुमचा प्रश्न टाइप करा. (Chrome वापरल्यास बोलून विचारता येईल.)';
    } else {
      el('voiceSupport').textContent = aiEnabled
        ? 'माइकचं बटण दाबा आणि मराठीत बोला — किंवा खाली टाइप करा.'
        : 'माइकचं बटण दाबा आणि मराठीत बोला. तुमच्या अहवालातील तपासणीचं नाव घेऊन विचारा.';
    }

    micBtn.addEventListener('click', function () {
      if (Voice.listening) { Voice.stop(); return; }
      Voice.stopSpeaking();

      micBtn.setAttribute('aria-pressed', 'true');
      micBtn.textContent = '⏹️';
      el('askInput').placeholder = 'ऐकत आहे… बोला';

      Voice.listen({
        onPartial: function (partial) { el('askInput').value = partial; },
        onResult: function (final) { el('askInput').value = final; ask(final); },
        onError: function (code) {
          el('askInput').placeholder = code === 'not-allowed'
            ? 'माइकची परवानगी नाकारली आहे. ब्राउझरच्या सेटिंगमध्ये परवानगी द्या.'
            : 'ऐकू आलं नाही. पुन्हा प्रयत्न करा किंवा टाइप करा.';
        },
        onEnd: function () {
          micBtn.setAttribute('aria-pressed', 'false');
          micBtn.textContent = '🎤';
        },
      });
    });

    el('askBtn').addEventListener('click', function () { ask(el('askInput').value); });
    el('askInput').addEventListener('keydown', function (event) {
      if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault();
        ask(el('askInput').value);
      }
    });
    el('printBtn').addEventListener('click', function () { window.print(); });
  }

  function ask(question) {
    question = String(question || '').trim();
    if (!question || state.busy) return;

    state.busy = true;
    el('askInput').value = '';
    el('askBtn').disabled = true;
    addMessage('user', question);
    var pending = addTyping();

    // History deliberately not sent — the server reads it from its own store.
    api('/ask', { pin: state.pin, question: question })
      .then(function (res) {
        pending.remove();
        addMessage('bot', res.answer, res.source, true);
        state.history.push({ role: 'user', content: question });
        state.history.push({ role: 'assistant', content: res.answer });
      })
      .catch(function (err) {
        pending.remove();
        addMessage('bot', err.message || 'उत्तर देताना अडचण आली. कृपया पुन्हा प्रयत्न करा.');
      })
      .then(function () {
        state.busy = false;
        el('askBtn').disabled = false;
      });
  }

  function addMessage(role, content, source, autoSpeak) {
    var node = h('div', { class: 'msg ' + (role === 'user' ? 'user' : 'bot'), text: content });

    if (role === 'bot') {
      var btn = h('button', { class: 'btn btn-small', type: 'button', text: '🔊 ऐका' });
      btn.addEventListener('click', function () { speakToggle(content, btn, '🔊 ऐका'); });
      node.appendChild(h('div', { class: 'msg-actions no-print' }, [btn]));

      if (source === 'rule') {
        node.appendChild(h('div', { class: 'src', text: 'हे उत्तर तुमच्या अहवालातील माहितीवरून तयार केलं आहे.' }));
      }
      if (autoSpeak && Voice.speechSupported) {
        speakToggle(content, btn, '🔊 ऐका');
      }
    }

    el('thread').appendChild(node);
    node.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    return node;
  }

  function addTyping() {
    var node = h('div', { class: 'msg bot' }, [
      h('span', { class: 'typing' }, [h('i'), h('i'), h('i')]),
    ]);
    el('thread').appendChild(node);
    node.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    return node;
  }

  /** One shared speak/stop toggle so two buttons never talk over each other. */
  var speakingButton = null;
  var speakingLabel = null;

  function speakToggle(content, button, idleLabel) {
    if (speakingButton === button && Voice.speaking()) {
      resetSpeakButton();
      Voice.stopSpeaking();
      return;
    }
    resetSpeakButton();
    Voice.stopSpeaking();

    speakingButton = button;
    // Captured before the label is swapped — reading it back off the button
    // afterwards would return the "stop" text, not the original.
    speakingLabel = idleLabel;
    button.firstChild.nodeValue = '⏹️ थांबवा';
    Voice.speak(content, { onEnd: resetSpeakButton });
  }

  function resetSpeakButton() {
    if (speakingButton) {
      speakingButton.firstChild.nodeValue = speakingLabel || '🔊 ऐका';
      speakingButton = null;
      speakingLabel = null;
    }
  }

  boot();
}());
