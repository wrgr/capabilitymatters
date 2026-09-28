/* Runs the published Capability Pipeline cases component. */

(function(){
  var STEP_META = [
    {key:'understand', label:'Understand', blurb:'What is the capability gap, really — stated as a gap, not yet a solution.'},
    {key:'model', label:'Model', blurb:'What does the system that produces or fails this capability actually look like.'},
    {key:'design', label:'Design', blurb:'What intervention could close the gap — and what does it choose not to do.'},
    {key:'build', label:'Build', blurb:'Turn the design into something real. Constraints show up here that no one saw coming.'},
    {key:'instrument', label:'Instrument', blurb:'Decide, before you need the answer, what evidence would prove you wrong.'},
    {key:'deploy', label:'Deploy', blurb:'Put the built, instrumented thing into something close to the real setting.'},
    {key:'evaluate', label:'Evaluate', blurb:'Read the evidence honestly, including the result you didn’t want.'},
    {key:'refine', label:'Refine', blurb:'Let the evidence act on what you understood the problem to be.'}
  ];

  var MODE_DESC = {
    study: 'Worked example. All eight steps are open, and the turn is marked for you — study how the decision at that step produced everything downstream of it.',
    find: 'All eight steps are open, but the turn isn’t marked. Read the case, then guess which step it turns on before you check.',
    predict: 'Steps unfold in order. When you reach the turn, you can write an optional prediction before revealing the rest of the story.'
  };

  var CASES = [
    {
      id: 'healthcaregov',
      domain: 'Government services',
      title: 'Healthcare.gov',
      frame: 'A capability missing by accident — assembled by omission, invisible to governance, until the failure was public.',
      outcome: {label: 'Recovered', cls: 'outcome-branch'},
      branchIndex: 4,
      predictPrompt: 'The build has named staffing and process gaps, but the launch date is fixed and non-negotiable. Before you see what actually got verified: what would you instrument for, and by when, to know whether this system is really ready to go live?',
      steps: [
        'A hard deadline in October 2013 required a national health-insurance marketplace to go live. The requirement was scoped as a deadline and a feature list — not decomposed into a spec for who would own whether the whole system, not just its parts, was actually ready.',
        'The system existed as many separately-built pieces, coordinated only within each piece’s own scope. No single model of end-to-end readiness existed across them.',
        'Because no one owned the whole system’s readiness, no design decision closed that gap either — it was a governance absence more than a design choice.',
        'One of the case’s own named structural gaps was staffing: the people assembling and operating the system were matched to their own piece of the work, not to whether the assembled whole would hold up under real demand. Beyond that, the record doesn’t detail how the build itself unfolded.',
        'The second named structural gap was testing: the system reached its launch date without whatever verification would have caught the readiness gap before the public did.',
        'The site launched in October 2013, against the fixed date.',
        'Roughly 27,000 enrollments in the first month, against a first-year target near seven million. The press read it as a technology story — “the website crashed.”',
        'A team was brought in and, within weeks, made the site work. That single fact ruled out the code as the binding constraint: the real gap was governance and ownership. The recovery effort became the seed of the U.S. Digital Service, a permanent institutional reform.'
      ],
      branch: {
        real: {label:'What actually happened', decision:'No real testing caught the system’s readiness gap before the fixed launch date — one of the case’s own named structural gaps.', result:'A public, launch-day failure — about 27,000 enrollments against a 7-million target — that took weeks of emergency work to fix after the fact, and forced a permanent governance reform to prevent a repeat.'},
        alt: {label:'If instead…', decision:'That same testing gap had been closed before launch instead of after it — real verification catching the readiness gap ahead of the fixed date.', result:'A rockier, less visible build-phase failure, caught and fixed before the public ever saw it. No national crisis, no forced governance overhaul — a story closer to Case 32’s quiet, unremarkable success than to what actually happened.'},
        why: 'This is exactly the gap the case names as structural (staffing, ownership, testing) — and the recovery itself shows testing was the missing piece, since real verification is what the after-the-fact fix supplied, just far too late.'
      }
    },
    {
      id: 'boeing737max',
      domain: 'Aviation',
      title: 'Boeing 737 MAX / MCAS',
      frame: 'A capability removed on purpose, to protect a commercial commitment.',
      outcome: {label: 'Fatal, grounded', cls: 'outcome-danger'},
      branchIndex: 2,
      predictPrompt: 'Boeing needs the re-engined 737 to keep flying "like" its predecessor, so pilots need no new simulator training — a promise backed by a sales rebate. The re-engining changed the aircraft’s pitch behavior. Before you see the design decision: how would you reconcile the changed pitch behavior with that commercial promise?',
      steps: [
        'Boeing needed to re-engine the 737 with larger, more efficient engines to compete with the Airbus A320neo — while preserving a sales commitment that pilots would need no new simulator training, a promise backed by a rebate clause.',
        'The re-engined airframe changed the aircraft’s pitch behavior relative to earlier 737s.',
        'MCAS was designed to mask that changed pitch behavior in software, so the aircraft would still handle like the earlier model and the “common type rating” promise could hold. This was a deliberate design choice, not an oversight.',
        'MCAS was built to act on input from a single angle-of-attack sensor, with no cross-check against a second sensor — a second capability engineered out.',
        'Pilot training and documentation treated MCAS’s existence and failure behavior as effectively invisible to flight crews. The elided training requirement was a traceable artifact — known and removed, not merely missed.',
        'The aircraft was certified and entered commercial service without simulator retraining for MCAS.',
        'Two fatal crashes — Lion Air, October 2018, and Ethiopian Airlines, March 2019 — were traced to the same failure mode: an erroneous single sensor reading driving repeated, uncommanded nose-down commands that crews had not been trained to diagnose. (Public record; not casebook-specific detail.)',
        'The fleet was grounded worldwide. MCAS was redesigned around dual-sensor input with limited authority, simulator training was reinstated, and the certification process itself was subsequently revised.'
      ],
      branch: {
        real: {label:'What actually happened', decision:'Mask the pitch-behavior change in software rather than disclosing it and retraining pilots; build the masking system on one sensor with no cross-check and minimal crew documentation.', result:'Two fatal crashes traced to the same single-point failure; a worldwide grounding; the commercial promise the design was protecting was voided anyway, at a far higher cost than the training it was built to avoid.'},
        alt: {label:'If instead…', decision:'Either disclose the pitch-behavior change and retrain crews on it, or require a second sensor to cross-check before the system could act automatically — either alone gives a person or the system itself a chance to catch one bad sensor reading before it becomes repeated, uncommanded input.', result:'A costlier, slower certification path — the exact commercial cost the design was built to avoid — instead of two fatal crashes. The capability removed on purpose is the one whose absence produced the outcome.'},
        why: 'The case’s own thesis: a capability engineered out at a specific, identifiable decision, not an accident.'
      }
    },
    {
      id: 'case32',
      domain: 'Healthcare / clinical',
      title: 'Annual-Screening UI Redesign',
      frame: 'A real, modest, well-instrumented iteration with genuine before-and-after evidence.',
      outcome: {label: 'Sustained gain', cls: 'outcome-good'},
      branchIndex: 4,
      predictPrompt: 'A multidisciplinary team has designed and built a site-level interface redesign so staff can reliably find patients overdue for screenings. Before you see what they chose to measure: what would you instrument for, before go-live, to know if this redesign actually worked?',
      steps: [
        'Nurses and medical assistants at University of Missouri Health Care needed to reliably identify patients overdue for annual screenings — advance directives, depression, fall risk, substance misuse — inside the electronic health record workflow.',
        'The existing interface for this task was slow and error-prone.',
        'A multidisciplinary team designed a site-level interface redesign — a change to how the work happened at this site, not a vendor product purchase.',
        'The redesign was built and implemented at the one site.',
        'Before deployment, the team chose its evidence: task-time and error measures, the System Usability Scale (SUS) tested with twelve staff, and an interrupted time series on all four screening rates spanning eight months before and nine months after go-live.',
        'The redesigned interface went live at the site.',
        'Task time for identifying overdue screens fell from 8.3 to 6.0 seconds; errors fell from 0.83 to 0.10 per task; SUS rose from 80.8 to 96.9 in the twelve-staff summative test. All four screening rates, flat or drifting down beforehand, turned upward after go-live.',
        'The case leaves this step open rather than documented — its own lecture prompt asks what a next iteration would look like from here. What is honestly on record: the evidence names its own limits, a twelve-person usability sample and a single site.'
      ],
      branch: {
        real: {label:'What actually happened', decision:'Instrumented with task-time, error rate, a validated usability instrument, and a seventeen-month interrupted time series on the actual clinical outcome — a combination that could have shown the redesign failed, even on measures the team hoped would succeed.', result:'A small, genuine, defensible before-and-after case — real evidence a scaling decision could actually be built on.'},
        alt: {label:'If instead…', decision:'The team had instrumented only for self-reported staff satisfaction with the new interface — a measure that tends to move with novelty and goodwill whether or not screening rates actually improved.', result:'A real gain and a real null result would have looked identical on that instrument. The case could not have distinguished “the redesign worked” from “staff were glad to be asked” — and would carry none of the weight it currently has.'},
        why: 'The test for real instrumentation: if every plausible result your instrument could produce would confirm you were right, you’ve built decoration, not evidence. This case passes that test; the alternate instrumentation choice would not have.'
      }
    },
    {
      id: 'case84',
      domain: 'Education',
      title: 'Cognitive Tutor Algebra I at Scale',
      frame: 'The same trial, two different verdicts, depending on one pipeline decision.',
      outcome: {label: 'Null, then positive', cls: 'outcome-branch'},
      branchIndex: 6,
      predictPrompt: 'Year-one posttest data is in: no significant difference between Cognitive Tutor schools and controls. Before you see what the researchers concluded: would you call this a null result and stop, or keep running the trial? What’s your call, and why?',
      steps: [
        'Could a curriculum intervention, Cognitive Tutor Algebra I, improve outcomes over each school’s existing curriculum, at scale, across many schools?',
        'The comparison was built against real deployment conditions — the existing curriculum as actually taught at each participating school, not a lab proxy for it.',
        'A cluster-randomized trial: 147 middle and high schools across seven states, randomized by school to condition — a RAND Corporation study.',
        'The curriculum and its rollout materials and teacher training were deployed to treatment schools.',
        'Posttest scores were the planned comparison between conditions, reported across a two-year window rather than a single year.',
        'Treatment schools began using the curriculum in year one.',
        'Year-one posttest scores showed no significant difference between conditions — a null result. The same trial’s year-two posttest showed Cognitive Tutor high schools significantly outperforming controls.',
        'The honest reading, per the trial’s own account: not “the first study was wrong,” but that a genuine effect can take time to appear as teachers and students adapt to a new way of working — and the two-year window was long enough to see what a one-year window would have missed.'
      ],
      branch: {
        real: {label:'What actually happened (two-year read)', decision:'The trial was designed and reported over two years.', result:'A validated program: evidence that the null first year was about first-year deployment conditions — fidelity of use, teacher preparation — not about the underlying design. The honest call was to continue, with a corrected understanding of why year one looked the way it did.'},
        alt: {label:'If instead…', decision:'A stop-or-continue decision had been made after year one alone — an easy, realistic choice for any organization on a tighter evaluation budget or less patience.', result:'The honest-looking verdict from that same real year-one data would have been “this doesn’t work.” The program plausibly would have been cancelled before year two’s data ever existed to overturn that reading — a false negative, permanently foreclosed, on a genuinely effective intervention.'},
        why: 'This is not a hypothetical built for this page — it’s the case’s own documented lesson about evaluation windows, restated here as a pipeline decision instead of a narrative aside.'
      }
    },
    {
      id: 'case183',
      domain: 'Autonomous vehicles',
      title: 'Uber ATG / Tempe Fatality',
      frame: 'A system that performed well enough, on its own tracked metric, that the human role built around it became structurally unperformable.',
      outcome: {label: 'Fatal', cls: 'outcome-danger'},
      branchIndex: 4,
      predictPrompt: 'The safety-operator role is designed as passive monitoring, and the system is being tuned for public-road testing. Before you see what actually got tracked: what would you instrument for, beyond the system’s own performance, to know whether the human oversight role is actually working?',
      steps: [
        'A self-driving system operating on public roads needed a human safety operator as backup, able to intervene when the automation failed or was uncertain.',
        'The operator’s role was modeled and designed as passive monitoring: watch the system operate, and intervene on the rare occasion it needs help.',
        'No further interface or alert design specifics beyond the passive-monitoring model are part of the documented record here.',
        'The system was built and tuned for public-road testing under this passive-monitoring operating model.',
        'The tracked headline metric was miles driven without a human intervention or disengagement — a measure of system performance, not of operator vigilance or attentiveness.',
        'Public road testing took place in Tempe, Arizona.',
        'On March 18, 2018, the system struck and killed a pedestrian. The NTSB found Uber had not recognized the risk of automation complacency, trained for it, or enforced its own no-phone policy for operators; the operator had been watching a video on her phone.',
        'The NTSB named the mechanism as structural: passive monitoring of a system that rarely needs intervention is “chronically unperformable” as a role, with no infrastructure built to make it work — not a story about one distracted operator. The proposed path forward: instrument for something other than the headline system metric — engagement in the monitoring task, response latency to rare events, whether operators report the role as sustainable.'
      ],
      branch: {
        real: {label:'What actually happened', decision:'The only headline metric tracked was miles-without-intervention — a number that rises both when the system genuinely improves and when an under-stimulated human operator simply stops catching things, and cannot tell the two apart.', result:'The metric looked good right up until a fatal failure it was structurally unable to see coming. Only after the fatality was the monitoring role itself read as unperformable by design.'},
        alt: {label:'If instead…', decision:'The instrumentation plan had included a direct proxy for operator engagement alongside the system metric — response latency to deliberately injected rare events, or continuous attention monitoring.', result:'A decline in operator vigilance is exactly what that kind of instrument exists to catch, as a near-miss pattern during testing rather than only after a fatality — plausibly forcing a design-level refine (shared coverage, re-enabled automatic braking, a different oversight model) before anyone was killed.'},
        why: 'This is the module’s own closing lesson, stated directly as the practical answer — applied here as the branch point rather than left as a closing suggestion.'
      }
    }
  ];

  // populate step legend
  var legend = document.getElementById('step-legend');
  STEP_META.forEach(function(s, i){
    var el = document.createElement('div');
    el.className = 'item';
    el.innerHTML = '<span class="n">0'+(i+1)+'</span><span class="t"><b>'+s.label+'</b><span>'+s.blurb+'</span></span>';
    legend.appendChild(el);
  });

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
      b.classList.toggle('active', b.getAttribute('data-mode') === mode);
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
      var html = '<p><strong>Which step does this case turn on?</strong> Read all eight, then pick one.</p><div class="choices">';
      STEP_META.forEach(function(m, i){
        var cls = '';
        if (st.guessed !== null) {
          if (i === c.branchIndex) cls = 'chosen-correct';
          else if (i === st.guessed) cls = 'chosen-incorrect';
        }
        html += '<button type="button" data-i="'+i+'" class="'+cls+'"'+(st.guessed !== null ? ' disabled' : '')+'>'+(i+1)+'. '+m.label+'</button>';
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
        renderStudyOrFind(c);
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
        '<span class="idx">0'+(i+1)+'</span>' +
        '<span class="body"><h4>'+meta.label+badge+'</h4><p class="summary">'+meta.blurb+'</p></span>' +
        '<span class="chev">+</span>';

      var detail = document.createElement('div');
      detail.className = 'step-detail';

      var full = document.createElement('div');
      full.className = 'full';
      full.textContent = c.steps[i];
      detail.appendChild(full);

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
          '<span class="idx">0'+(i+1)+'</span>' +
          '<span class="body"><h4>'+meta.label+'</h4><p class="summary">'+meta.blurb+'</p></span>' +
          '<span class="chev">+</span>';
        var detail = document.createElement('div');
        detail.className = 'step-detail';
        var full = document.createElement('div');
        full.className = 'full';
        full.textContent = c.steps[i];
        detail.appendChild(full);
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
          '<span class="idx">0'+(i+1)+'</span>' +
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
          '<span class="idx">0'+(i+1)+'</span>' +
          '<span class="body"><h4>'+meta.label+'</h4><p class="summary">'+(st.revealed ? meta.blurb : 'Locked until you reveal what happened above.')+'</p></span>' +
          '<span class="chev">'+(st.revealed ? '+' : '<span class="lock-icon">locked</span>')+'</span>';
        if (st.revealed) {
          var ldetail = document.createElement('div');
          ldetail.className = 'step-detail';
          var lfull = document.createElement('div');
          lfull.className = 'full';
          lfull.textContent = c.steps[i];
          ldetail.appendChild(lfull);
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
    Object.keys(cards).forEach(function(k){ cards[k].classList.toggle('active', k === id); });

    expTitle.textContent = c.title;
    expFrame.textContent = c.frame;
    expDomain.textContent = c.domain;

    renderCase(id);

    explorer.classList.add('visible');
    if (doScroll) explorer.scrollIntoView({behavior:'smooth', block:'start'});
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
      row.setAttribute('aria-expanded',String(detail.classList.contains('open')));
    });
  }
  accessibleRows();
  new MutationObserver(accessibleRows).observe(stepper,{childList:true,subtree:true,attributes:true,attributeFilter:['class']});
  stepper.addEventListener('keydown',function(e){if(e.target.classList.contains('step-row')&&(e.key==='Enter'||e.key===' ')){e.preventDefault();e.target.click();}});

})();
