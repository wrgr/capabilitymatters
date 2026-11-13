/* Runs the published Capability Pipeline cases component. */

(function(){
  var STEP_META = Object.values(CapabilityTeaching.cycle).map(function(stage){
    return {key:stage.id, label:stage.label, blurb:stage.description};
  });

  var MODE_DESC = {
    study: 'Worked example. All seven steps and the continuing refinement reflection are open, and the turn is marked for you — study how the decision at that step produced everything downstream of it.',
    find: 'All seven steps and the continuing refinement reflection are open, but the turn isn’t marked. Read the case, then guess which step it turns on before you check.',
    predict: 'Steps unfold in order. When you reach the turn, you can write an optional prediction before revealing the rest of the story.'
  };

  var CASES = globalThis.CapabilityCaseNarratives;
  if (!Array.isArray(CASES) || CASES.length === 0) throw new Error('Case narratives failed to load.');

  function teachingPoint(c, i, detail) {
    var meta = CapabilityTeaching.cycle[STEP_META[i].key];
    var box = document.createElement('section'); box.className = 'teaching-point';
    var heading = document.createElement('h4'); heading.textContent = 'Why / teaching points'; box.appendChild(heading);
    [['Why this matters', meta.why], ['Decision cue', meta.decision], ['Ask in this case', CapabilityTeaching.worked[c.id].questions[i]]].forEach(function(pair){
      var paragraph = document.createElement('p'), label = document.createElement('strong');
      label.textContent = pair[0] + ': '; paragraph.appendChild(label); paragraph.appendChild(document.createTextNode(pair[1])); box.appendChild(paragraph);
    });
    detail.appendChild(box);
  }

  function turnTeaching(c, detail) {
    var guidance = CapabilityTeaching.worked[c.id].turn;
    var box = document.createElement('section'); box.className = 'teaching-point turn-teaching';
    var heading = document.createElement('h4'); heading.textContent = 'Interpreting this decision'; box.appendChild(heading);
    [['Why it matters',guidance.why],['Decision cue',guidance.decision],['Evidence limit',guidance.watch]].forEach(function(pair){
      var paragraph = document.createElement('p'), label = document.createElement('strong'); label.textContent=pair[0]+': ';
      paragraph.appendChild(label); paragraph.appendChild(document.createTextNode(pair[1])); box.appendChild(paragraph);
    });
    detail.appendChild(box);
  }

  // populate case grid
  var grid = document.getElementById('case-grid');
  var cards = {};
  CASES.forEach(function(c){
    var btn = document.createElement('button');
    btn.className = 'case-card';
    btn.setAttribute('type','button');
    btn.innerHTML =
      '<div class="tagrow"><span class="tag">'+c.domain+'</span><span class="tag '+c.outcome.cls+'">'+c.outcome.label+'</span></div>' +
      '<h3>'+c.title+'</h3>' +
      '<p class="frame">'+c.frame+'</p>';
    grid.appendChild(btn);
    cards[c.id] = btn;
  });

  var explorer = document.getElementById('explorer');
  var expTitle = document.getElementById('exp-title');
  var expFrame = document.getElementById('exp-frame');
  var expDomain = document.getElementById('exp-domain');
  var stepper = document.getElementById('stepper');
  var modeToggle = document.getElementById('mode-toggle');
  var modeDesc = document.getElementById('mode-desc');

  var currentId = null;
  var currentMode = 'study';
  var openRow = null;
  var branchChoice = {}; // caseId -> 'real' | 'alt'
  var findState = {}; // caseId -> {guessed: index|null}
  var predictState = {}; // caseId -> {revealed: bool}

  var predictionMemory = {};
  function predictKey(id){ return 'capability-pipeline:predict:' + id; }
  function loadPrediction(id){
    if (Object.prototype.hasOwnProperty.call(predictionMemory,id)) return predictionMemory[id]; try { return localStorage.getItem(predictKey(id)) || ''; } catch(e){ return ''; }
  }
  function savePrediction(id, text){
    predictionMemory[id] = text; try { localStorage.setItem(predictKey(id), text); } catch(e){}
  }

  function setMode(mode){
    currentMode = mode;
    Array.prototype.forEach.call(modeToggle.querySelectorAll('button'), function(b){
      b.classList.toggle('active', b.getAttribute('data-mode') === mode); b.setAttribute('aria-pressed',String(b.getAttribute('data-mode')===mode));
    });
    modeDesc.textContent = MODE_DESC[mode];
    if (currentId) renderCase(currentId);
  }

  modeToggle.addEventListener('click', function(e){
    var btn = e.target.closest('button[data-mode]');
    if (!btn) return;
    setMode(btn.getAttribute('data-mode'));
  });

  function buildBranchDetail(c, detail){
    var b = c.branch;
    if (!branchChoice[c.id]) branchChoice[c.id] = 'real';

    var toggle = document.createElement('div');
    toggle.className = 'branch-toggle';
    var btnReal = document.createElement('button');
    btnReal.textContent = 'As it happened';
    var btnAlt = document.createElement('button');
    btnAlt.textContent = 'If instead…';
    toggle.appendChild(btnReal);
    toggle.appendChild(btnAlt);
    detail.appendChild(toggle);

    var panel = document.createElement('div');
    detail.appendChild(panel);

    var whyEl = document.createElement('p');
    whyEl.className = 'branch-why';
    whyEl.innerHTML = '<strong>Why this step:</strong> ' + b.why;
    detail.appendChild(whyEl);
    turnTeaching(c, detail);

    function renderBranch(){
      var choice = branchChoice[c.id];
      btnReal.className = choice === 'real' ? 'active real' : '';
      btnAlt.className = choice === 'alt' ? 'active alt' : '';
      var d = choice === 'real' ? b.real : b.alt;
      panel.innerHTML =
        '<div class="branch-panel ' + choice + '">' +
          '<p class="kicker">' + (choice === 'real' ? 'Real — what happened' : 'Hypothetical — not what happened') + '</p>' +
          '<p><strong>Decision:</strong> ' + d.decision + '</p>' +
          '<p><strong>Result:</strong> ' + d.result + '</p>' +
        '</div>';
    }
    btnReal.addEventListener('click', function(e){ e.stopPropagation(); branchChoice[c.id] = 'real'; renderBranch(); });
    btnAlt.addEventListener('click', function(e){ e.stopPropagation(); branchChoice[c.id] = 'alt'; renderBranch(); });
    renderBranch();
  }

  function renderStudyOrFind(c){
    stepper.innerHTML = '';
    openRow = null;
    var isFind = currentMode === 'find';

    if (isFind) {
      if (!findState[c.id]) findState[c.id] = {guessed: null};
      var picker = document.createElement('div');
      picker.className = 'find-picker';
      var st = findState[c.id];
      var html = '<p><strong>Which step does this case turn on?</strong> Read the seven steps and refinement reflection, then pick one.</p><div class="choices">';
      STEP_META.forEach(function(m, i){
        var cls = '';
        if (st.guessed !== null) {
          if (i === c.branchIndex) cls = 'chosen-correct';
          else if (i === st.guessed) cls = 'chosen-incorrect';
        }
        html += '<button type="button" data-i="'+i+'" class="'+cls+'"'+(st.guessed !== null ? ' disabled' : '')+'>'+(i < 7 ? (i+1)+'. ' : '')+m.label+'</button>';
      });
      html += '</div>';
      if (st.guessed !== null) {
        html += '<p class="result">' + (st.guessed === c.branchIndex
          ? 'Right — expand step ' + (c.branchIndex+1) + ' (' + STEP_META[c.branchIndex].label + ') to see why.'
          : 'Not quite — it turns at step ' + (c.branchIndex+1) + ' (' + STEP_META[c.branchIndex].label + '). Expand it to see why.') + '</p>';
      }
      picker.innerHTML = html;
      stepper.appendChild(picker);
      picker.addEventListener('click', function(e){
        var btn = e.target.closest('button[data-i]');
        if (!btn || st.guessed !== null) return;
        st.guessed = parseInt(btn.getAttribute('data-i'), 10);
        renderStudyOrFind(c); expTitle.tabIndex=-1; expTitle.focus();
      });
    }

    STEP_META.forEach(function(meta, i){
      var isBranch = i === c.branchIndex;
      var revealBranchUI = isBranch && (!isFind || findState[c.id].guessed !== null);

      var row = document.createElement('div');
      row.className = 'step-row' + (revealBranchUI ? ' branch-row' : '');
      var badge = '';
      if (revealBranchUI) {
        if (isFind) {
          badge = '<span class="fork-badge correct">turns here</span>';
        } else {
          badge = '<span class="fork-badge">turns here</span>';
        }
      }
      row.innerHTML =
        '<span class="idx">'+(i < 7 ? '0'+(i+1) : '↻')+'</span>' +
        '<span class="body"><h4>'+meta.label+badge+'</h4><p class="summary">'+meta.blurb+'</p></span>' +
        '<span class="chev">+</span>';

      var detail = document.createElement('div');
      detail.className = 'step-detail';

      var full = document.createElement('div');
      full.className = 'full';
      full.textContent = c.steps[i];
      detail.appendChild(full);
      teachingPoint(c, i, detail);

      if (revealBranchUI) buildBranchDetail(c, detail);

      row.addEventListener('click', function(){
        var wasOpen = detail.classList.contains('open');
        if (openRow) openRow.classList.remove('open');
        detail.classList.toggle('open', !wasOpen);
        openRow = !wasOpen ? detail : null;
      });

      stepper.appendChild(row);
      stepper.appendChild(detail);
    });
  }

  function renderPredict(c){
    stepper.innerHTML = '';
    openRow = null;
    if (!predictState[c.id]) predictState[c.id] = {revealed: false};
    var st = predictState[c.id];

    STEP_META.forEach(function(meta, i){
      if (i < c.branchIndex) {
        var row = document.createElement('div');
        row.className = 'step-row';
        row.innerHTML =
          '<span class="idx">'+(i < 7 ? '0'+(i+1) : '↻')+'</span>' +
          '<span class="body"><h4>'+meta.label+'</h4><p class="summary">'+meta.blurb+'</p></span>' +
          '<span class="chev">+</span>';
        var detail = document.createElement('div');
        detail.className = 'step-detail';
        var full = document.createElement('div');
        full.className = 'full';
        full.textContent = c.steps[i];
        detail.appendChild(full);
      teachingPoint(c, i, detail);
        row.addEventListener('click', function(){
          var wasOpen = detail.classList.contains('open');
          if (openRow) openRow.classList.remove('open');
          detail.classList.toggle('open', !wasOpen);
          openRow = !wasOpen ? detail : null;
        });
        stepper.appendChild(row);
        stepper.appendChild(detail);
      } else if (i === c.branchIndex) {
        var prow = document.createElement('div');
        prow.className = 'step-row branch-row';
        prow.innerHTML =
          '<span class="idx">'+(i < 7 ? '0'+(i+1) : '↻')+'</span>' +
          '<span class="body"><h4>'+meta.label+'<span class="fork-badge">turns here</span></h4><p class="summary">'+meta.blurb+'</p></span>' +
          '<span class="chev">+</span>';
        var pdetail = document.createElement('div');
        pdetail.className = 'step-detail open';

        if (!st.revealed) {
          var predictPanel = document.createElement('div');
          predictPanel.className = 'predict-panel';
          var promptEl = document.createElement('p');
          promptEl.className = 'prompt';
          promptEl.textContent = c.predictPrompt;
          predictPanel.appendChild(promptEl);
          var preGuide = document.createElement('p'); preGuide.className='teaching-before'; preGuide.textContent='Before deciding: '+CapabilityTeaching.cycle[meta.key].question; predictPanel.appendChild(preGuide);
          var ta = document.createElement('textarea');
          ta.placeholder = 'Optional: write your call before revealing what happened…';
          ta.value = loadPrediction(c.id);
          predictPanel.appendChild(ta);
          var note = document.createElement('p');
          note.className = 'predict-note';
          note.textContent = 'Kept only in this browser, for your own reference — not graded, not sent anywhere.';
          predictPanel.appendChild(note);
          var revealBtn = document.createElement('button');
          revealBtn.type = 'button'; revealBtn.disabled = false;
          revealBtn.className = 'reveal-btn';
          revealBtn.textContent = 'Reveal what happened';
          predictPanel.appendChild(revealBtn);
          pdetail.appendChild(predictPanel);

          ta.setAttribute('aria-label','Your prediction before the reveal (optional)'); ta.addEventListener('input', function(){ savePrediction(c.id, ta.value); revealBtn.disabled = false; });
          revealBtn.addEventListener('click', function(){
            
            savePrediction(c.id, ta.value);
            st.revealed = true;
            renderPredict(c);
          });
        } else {
          var full2 = document.createElement('div');
          full2.className = 'full';
          full2.textContent = c.steps[i];
          pdetail.appendChild(full2);
          teachingPoint(c, i, pdetail);
          buildBranchDetail(c, pdetail);

          var saved = loadPrediction(c.id);
          if (saved) {
            var yours = document.createElement('p');
            yours.className = 'branch-why';
            var label = document.createElement('strong'); label.textContent = 'What you committed to first: '; yours.appendChild(label); yours.appendChild(document.createTextNode(saved));
            pdetail.appendChild(yours);
          }
        }
        stepper.appendChild(prow);
        stepper.appendChild(pdetail);
      } else {
        var lrow = document.createElement('div');
        lrow.className = 'step-row' + (st.revealed ? '' : ' locked');
        lrow.innerHTML =
          '<span class="idx">'+(i < 7 ? '0'+(i+1) : '↻')+'</span>' +
          '<span class="body"><h4>'+meta.label+'</h4><p class="summary">'+(st.revealed ? meta.blurb : 'Locked until you reveal what happened above.')+'</p></span>' +
          '<span class="chev">'+(st.revealed ? '+' : '<span class="lock-icon">locked</span>')+'</span>';
        if (st.revealed) {
          var ldetail = document.createElement('div');
          ldetail.className = 'step-detail';
          var lfull = document.createElement('div');
          lfull.className = 'full';
          lfull.textContent = c.steps[i];
          ldetail.appendChild(lfull);
          teachingPoint(c, i, ldetail);
          lrow.addEventListener('click', function(){
            var wasOpen = ldetail.classList.contains('open');
            if (openRow) openRow.classList.remove('open');
            ldetail.classList.toggle('open', !wasOpen);
            openRow = !wasOpen ? ldetail : null;
          });
          stepper.appendChild(lrow);
          stepper.appendChild(ldetail);
        } else {
          stepper.appendChild(lrow);
        }
      }
    });
  }

  function renderCase(id){
    var c = CASES.filter(function(x){ return x.id === id; })[0];
    if (!c) return;
    if (currentMode === 'predict') renderPredict(c);
    else renderStudyOrFind(c);
  }

  function selectCase(id, opts){
    var doScroll = opts && opts.scroll;
    var c = CASES.filter(function(x){ return x.id === id; })[0];
    if (!c) return;
    currentId = id;
    Object.keys(cards).forEach(function(k){ cards[k].classList.toggle('active', k === id); cards[k].setAttribute('aria-pressed',String(k===id)); });

    expTitle.textContent = c.title;
    expFrame.textContent = c.frame;
    expDomain.textContent = c.domain;

    renderCase(id);

    explorer.classList.add('visible');
    if (doScroll) { expTitle.tabIndex=-1; expTitle.focus(); explorer.scrollIntoView({behavior:matchMedia('(prefers-reduced-motion:reduce)').matches||document.documentElement.hasAttribute('data-a11y-motion')?'auto':'smooth', block:'start'}); }
  }

  Object.keys(cards).forEach(function(k){
    cards[k].addEventListener('click', function(){ selectCase(k, {scroll:true}); });
  });

  // initialize mode bar text and open first case by default, no scroll
  modeDesc.textContent = MODE_DESC[currentMode];
  Array.prototype.forEach.call(modeToggle.querySelectorAll('button'), function(b){
    b.classList.toggle('active', b.getAttribute('data-mode') === currentMode);
  });
  selectCase(CASES[0].id, {scroll:false});
  function accessibleRows(){
    stepper.querySelectorAll('.step-row').forEach(function(row){
      var detail=row.nextElementSibling;
      if (!detail || !detail.classList.contains('step-detail') || row.classList.contains('locked')) return;
      row.setAttribute('role','button'); row.setAttribute('tabindex','0');
      detail.id='case-step-detail-'+Array.prototype.indexOf.call(stepper.querySelectorAll('.step-row'),row);row.setAttribute('aria-controls',detail.id);row.setAttribute('aria-expanded',String(detail.classList.contains('open')));
    });
  }
  accessibleRows();
  new MutationObserver(accessibleRows).observe(stepper,{childList:true,subtree:true,attributes:true,attributeFilter:['class']});
  stepper.addEventListener('keydown',function(e){if(e.target.classList.contains('step-row')&&(e.key==='Enter'||e.key===' ')){e.preventDefault();e.target.click();}});

})();
