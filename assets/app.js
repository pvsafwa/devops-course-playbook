(function(){
  const $  = (s,r=document) => r.querySelector(s);
  const $$ = (s,r=document) => [...r.querySelectorAll(s)];

  const GROUPS = [
    { title: 'Foundations', items: [
      { id:'fundamentals',      label:'DevOps Fundamentals',    icon:'🌱', c:'#10b981', built:true, n:10 },
      { id:'sdlc',              label:'SDLC & Org Roles',        icon:'🔄', c:'#f59e0b', built:true, n:13 },
      { id:'virtual-machines',  label:'Virtual Machines',        icon:'🖥️', c:'#0891b2', built:true, n:10 },
    ]},
    { title: 'Source & delivery', items: [
      { id:'git',        label:'Git & GitHub',            icon:'🌿', c:'#F05133', built:true, n:17 },
      { id:'terraform',  label:'Terraform & IaC',          icon:'🏗️', c:'#7c4ddb', built:true, n:17 },
      { id:'config-mgmt',label:'Config Mgmt (Ansible)',    icon:'⚙️', c:'#ee0000', built:true, n:10 },
      { id:'cicd',       label:'CI/CD',                    icon:'🔁', c:'#22c55e', built:true, n:17 },
    ]},
    { title: 'Cloud & OS', items: [
      { id:'linux-shell', label:'Linux & Shell',           icon:'🐧', c:'#f7b500', built:true, n:16 },
      { id:'networking',  label:'Networking',              icon:'🌐', c:'#06b6d4', built:true, n:16 },
      { id:'aws',         label:'AWS',                      icon:'☁️', c:'#f7b500', built:true, n:16 },
    ]},
    { title: 'Containers & K8s', items: [
      { id:'docker',      label:'Docker & Containers',      icon:'🐳', c:'#2496ed', built:true, n:15 },
      { id:'kubernetes',  label:'Kubernetes',                icon:'☸️', c:'#326ce5', built:true, n:28 },
    ]},
    { title: 'Operations', items: [
      { id:'observability', label:'Observability',          icon:'📈', c:'#e6522c', built:true, n:18 },
    ]},
    { title: 'Scripting', items: [
      { id:'python', label:'Python for DevOps',              icon:'🐍', c:'#4b8bbe', built:true, n:13 },
    ]},
    { title: 'People & process', items: [
      { id:'project-mgmt', label:'Project Mgmt / JIRA',       icon:'📈', c:'#ec4899', built:true, n:12 },
    ]},
    { title: 'Careers & interviews', items: [
      { id:'interview-day-to-day', label:'Project & Day-to-Day', icon:'🗣️', c:'#e11d48', built:true },
    ]},
    { title: 'Advanced drills · playbook only', items: [
      { id:'inter-team',   label:'Inter-team Collaboration', icon:'🤝', c:'#8b5cf6', built:true, n:12 },
      { id:'intra-team',   label:'Intra-team Collaboration', icon:'👥', c:'#8b5cf6', built:true, n:12 },
      { id:'behavioural',  label:'Behavioural',               icon:'💬', c:'#8b5cf6', built:true, n:20 },
      { id:'war-stories',  label:'War Stories',                icon:'⚔️', c:'#8b5cf6', built:true, n:17 },
      { id:'system-design',label:'System Design',              icon:'🧩', c:'#8b5cf6', built:true, n:20 },
      { id:'devsecops',    label:'DevSecOps',                  icon:'🛡️', c:'#8b5cf6', built:true, n:19 },
      { id:'finops',       label:'FinOps',                      icon:'💰', c:'#8b5cf6', built:true, n:17 },
    ]},
  ];

  const current = document.body.dataset.chapter || 'home';
  const hasCards = () => !!$('details.qa');

  /* ---------- render the sidebar into <aside class="rail"> ---------- */
  function renderChrome(){
    const rail = $('.rail'); if (!rail) return;
    let nav = '';
    GROUPS.forEach(g => {
      nav += `<div class="grouphead">${g.title}</div>`;
      g.items.forEach(it => {
        const here = it.id === current;
        const cls = here ? 'here' : (it.built ? '' : 'soon');
        const href = it.built || here ? `${it.id}.html` : '#';
        const right = here ? '' : it.built
          ? (it.n ? `<span class="cnt">${it.n}</span>` : `<span class="tick">✓</span>`)
          : `<span class="soonbadge">soon</span>`;
        nav += `<a href="${href}" class="${cls}"><span class="dot" style="--c:${it.c}"></span>`
             + `<span class="ico">${it.icon}</span><span class="lbl">${it.label}</span>${right}</a>`;
      });
    });

    const legend = hasCards() ? `
      <div class="legend" id="legendbox">
        <div class="lt">Progress on this page · click to filter</div>
        <div class="row filter" data-f="ok"    onclick="toggleFilter('ok')"><span><span class="pill p-ok">✓</span> Got it</span><b id="c-ok">0</b></div>
        <div class="row filter" data-f="shaky" onclick="toggleFilter('shaky')"><span><span class="pill p-sh">~</span> Shaky</span><b id="c-sh">0</b></div>
        <div class="row filter" data-f="blank" onclick="toggleFilter('blank')"><span><span class="pill p-bl">✕</span> Blank</span><b id="c-bl">0</b></div>
        <div class="row" style="border-top:1px solid #202c4a;padding-top:8px;margin-top:8px"><span style="color:#8ea0c6">Marked</span><b id="c-tot">0 / 0</b></div>
      </div>` : '';

    const searchPlaceholder = current === 'home' ? 'Search chapters…' : 'Search this page…  (press /)';
    const ctl = hasCards() ? `
      <div class="ctl">
        <button onclick="setAll(true)">Expand all</button>
        <button onclick="setAll(false)">Collapse all</button>
        <button class="menutoggle" onclick="document.getElementById('nav').classList.toggle('collapsed');var l=document.getElementById('legendbox');if(l)l.classList.toggle('collapsed')">Menu</button>
      </div>` : `
      <div class="ctl">
        <button class="menutoggle" onclick="document.getElementById('nav').classList.toggle('collapsed')" style="flex:1">Menu</button>
      </div>`;

    rail.innerHTML = `
      <a class="brand" href="index.html" style="text-decoration:none">
        <div class="logo">Z2H</div>
        <div><h1>DevOps Zero&nbsp;→&nbsp;Hero</h1><p>Course notes + senior scenario drills</p></div>
      </a>
      <div class="searchbox">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#9fb0ff" stroke-width="2"><circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/></svg>
        <input id="search" type="search" placeholder="${searchPlaceholder}" autocomplete="off">
      </div>
      ${ctl}
      <nav class="nav" id="nav">${nav}</nav>
      ${legend}`;
  }

  /* ---------- behaviour (wired after chrome exists) ---------- */
  let search, activeFilter = '';

  window.setAll = function(open){
    $$('details').forEach(d => { d.open = open; });
  };

  /* ---------- progress marking, persisted per chapter in localStorage ---------- */
  const storeKey = () => `z2h-progress-${current}`;

  function loadProgress(){
    try { return JSON.parse(localStorage.getItem(storeKey())) || {}; }
    catch(e){ return {}; }
  }
  function saveProgress(p){
    try { localStorage.setItem(storeKey(), JSON.stringify(p)); } catch(e){}
  }

  function updateCounts(){
    const cards = $$('details.qa');
    const p = loadProgress();
    let ok=0, sh=0, bl=0;
    cards.forEach(c => {
      const s = p[c.id];
      if (s === 'ok') ok++;
      else if (s === 'shaky') sh++;
      else if (s === 'blank') bl++;
    });
    const total = cards.length;
    const marked = ok + sh + bl;
    if ($('#c-ok')) $('#c-ok').textContent = ok;
    if ($('#c-sh')) $('#c-sh').textContent = sh;
    if ($('#c-bl')) $('#c-bl').textContent = bl;
    if ($('#c-tot')) $('#c-tot').textContent = `${marked} / ${total}`;
  }

  function applyStoredMarks(){
    const p = loadProgress();
    $$('details.qa').forEach(card => {
      const s = p[card.id];
      if (!s) return;
      const btn = card.querySelector(`.prog button[data-b="${s}"]`);
      if (btn) paintButton(card, btn, s);
    });
    updateCounts();
  }

  function paintButton(card, btn, state){
    const prog = card.closest ? card.querySelector('.prog') : btn.closest('.prog');
    if (prog) $$('button', prog).forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    card.dataset.marked = state;
  }

  window.mark = function(btn, state){
    const card = btn.closest('details.qa');
    if (!card) return;
    const p = loadProgress();
    p[card.id] = state;
    saveProgress(p);
    paintButton(card, btn, state);
    updateCounts();
  };

  window.toggleFilter = function(f){
    activeFilter = (activeFilter === f) ? '' : f;
    $$('.legend .row.filter').forEach(r => r.classList.toggle('active', r.dataset.f === activeFilter));
    runSearch();
  };

  /* ---------- search (chapter pages: filter drills/iq cards · home: filter chapter cards) ---------- */
  window.runSearch = function(){
    const q = (search && search.value || '').trim().toLowerCase();
    const noResults = $('#noresults');

    if (current === 'home') {
      let anyVisible = false;
      $$('.chcard').forEach(card => {
        const text = card.textContent.toLowerCase();
        const visible = !q || text.includes(q);
        card.style.display = visible ? '' : 'none';
        if (visible) anyVisible = true;
      });
      if (noResults) noResults.style.display = (!anyVisible && q) ? '' : 'none';
      return;
    }

    const p = loadProgress();
    let anyVisible = false;
    $$('details.qa, details.iq').forEach(card => {
      const text = card.textContent.toLowerCase();
      const matchesText = !q || text.includes(q);
      const state = p[card.id];
      const matchesFilter = !activeFilter || state === activeFilter;
      const visible = matchesText && (card.classList.contains('iq') || matchesFilter);
      card.style.display = visible ? '' : 'none';
      if (visible) anyVisible = true;
    });
    if (noResults) noResults.style.display = (!anyVisible && (q || activeFilter)) ? '' : 'none';
  };

  /* ---------- boot ---------- */
  document.addEventListener('DOMContentLoaded', () => {
    renderChrome();
    search = $('#search');
    if (search) search.addEventListener('input', runSearch);
    document.addEventListener('keydown', e => {
      if (e.key === '/' && document.activeElement !== search) {
        e.preventDefault();
        if (search) search.focus();
      }
    });
    if (hasCards()) applyStoredMarks();
  });
})();
