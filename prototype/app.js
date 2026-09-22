const app = document.querySelector('#app');

const icon = (name, label = '') => `<svg class="icon" ${label ? `role="img" aria-label="${label}"` : 'aria-hidden="true"'}><use href="#i-${name}"></use></svg>`;

const state = {
  screen: 'home',
  step: 0,
  audioPlaying: false,
  answer: null,
  recording: false,
  evaluated: false,
  toastTimer: null
};

const screens = ['listen', 'memory', 'verify', 'speak', 'complete'];

function tabbar(active = 'learn') {
  return `<nav class="tabbar" aria-label="主要导航">
    <button class="tab-button ${active === 'learn' ? 'active' : ''}" data-action="home" aria-current="${active === 'learn' ? 'page' : 'false'}">${icon('home')}<span>学习</span></button>
    <button class="tab-button ${active === 'parent' ? 'active' : ''}" data-action="parent" aria-current="${active === 'parent' ? 'page' : 'false'}">${icon('parent')}<span>家长</span></button>
  </nav>`;
}

function homeScreen() {
  return `<div class="screen fade-in">
    <div class="small-label">湘少版 · 三年级上册 · Unit 2</div>
    <h1 class="page-title">早上好，小航海家</h1>
    <section class="card hero-card" aria-labelledby="today-title">
      <div class="hero-image-wrap">
        <img class="hero-image" src="../output/imagegen/home-hero-learning-archipelago-route-colored-v2.png" alt="帆船沿绿色、蓝色和白色航线依次经过学习节点和岛屿，驶向灯塔终点">
        <div class="unit-waypoints" aria-label="单元航程进度">
          <button class="unit-point completed u1" data-action="unit-status" data-message="Unit 1 · 已完成" aria-label="Unit 1，已完成"><span class="original-waypoint" aria-hidden="true"></span><span class="unit-tooltip">Unit 1<br><b>已完成</b></span></button>
          <button class="unit-point current u2" data-action="unit-status" data-message="Unit 2 · 当前学习" aria-label="Unit 2，当前学习" aria-current="step"><span>2</span><span class="unit-tooltip">Unit 2<br><b>当前学习</b></span></button>
          <button class="unit-point pending u3" data-action="unit-status" data-message="Unit 3 · 尚未开始" aria-label="Unit 3，尚未开始"><span>3</span></button>
          <button class="unit-point pending u4" data-action="unit-status" data-message="Unit 4 · 尚未开始" aria-label="Unit 4，尚未开始"><span>4</span></button>
          <button class="unit-point pending u5" data-action="unit-status" data-message="Unit 5 · 尚未开始" aria-label="Unit 5，尚未开始"><span>5</span></button>
          <button class="unit-point pending destination u6" data-action="unit-status" data-message="Unit 6 · 本册终点" aria-label="Unit 6，本册终点，尚未开始"><span>6</span></button>
        </div>
        <span class="hero-gradient"></span>
      </div>
      <div class="hero-copy">
        <div class="hero-heading"><div><h2 id="today-title">今天的单词航程</h2><div class="small-label">向下一座小岛出发</div></div><div class="time-pill">${icon('clock')}约 5 分钟</div></div>
        <div class="stats"><div class="stat"><strong>5 个</strong><span>新词</span></div><div class="stat"><strong>2 个</strong><span>复习词</span></div><div class="stat"><strong>第 4 天</strong><span>本周学习</span></div></div>
        <button class="btn btn-primary" data-action="start">开始今日航程 ${icon('arrow')}</button>
      </div>
    </section>
    <section class="card week-card" aria-label="本周学习情况"><div class="card-head"><strong>本周学习</strong><span>已完成 4 天</span></div><div class="week-days">
      ${['一','二','三'].map(d=>`<div class="week-day">${d}<span class="day-dot done">${icon('check')}</span></div>`).join('')}
      <div class="week-day">四<span class="day-dot today">今</span></div>
      ${['五','六','日'].map(d=>`<div class="week-day">${d}<span class="day-dot">${d}</span></div>`).join('')}
    </div></section>
    <section class="card unit-card"><div class="unit-row"><div class="unit-icon">${icon('book')}</div><div class="unit-copy"><strong>Unit 2 · 问候岛</strong><span>本单元已完成 12 / 20 个词</span></div><span class="small-label">60%</span></div><div class="bar" aria-label="单元进度 60%"><span style="width:60%"></span></div></section>
  </div>${tabbar('learn')}<div class="toast" role="status"></div>`;
}

function lessonHeader(stepIndex) {
  const progress = [18, 38, 62, 82, 100][stepIndex];
  return `<div class="lesson-header"><button class="icon-button" data-action="exit" aria-label="退出今日航程">${icon('x')}</button><div class="lesson-meta"><strong>第 ${stepIndex + 1} / 5 站</strong><span>今日航程 · morning</span></div><span></span></div><div class="progress-track" aria-label="航程进度 ${progress}%"><span style="width:${progress}%"></span></div>`;
}

function listenScreen() {
  return `<div class="screen no-tabs fade-in">${lessonHeader(0)}<section class="card lesson-card"><div class="step-kicker">先听两遍标准发音</div><h1 class="word">morning</h1><div class="phonetic">/ˈmɔːnɪŋ/</div><button class="audio-button ${state.audioPlaying ? 'playing' : ''}" data-action="audio" aria-label="${state.audioPlaying ? '暂停' : '播放'} morning 标准发音" aria-pressed="${state.audioPlaying}">${icon(state.audioPlaying ? 'pause' : 'play')}</button><div class="wave" aria-hidden="true">${'<i></i>'.repeat(7)}</div><p class="small-label">暂时不看中文，先熟悉声音</p><div class="lesson-spacer"></div><button class="btn btn-primary" data-action="next">我听好了 ${icon('arrow')}</button></section><aside class="info-note">${icon('shield')}<span>标准音负责正确读音，记忆暗号只帮助记住意思。</span></aside></div>`;
}

function memoryScreen() {
  return `<div class="screen no-tabs fade-in">${lessonHeader(1)}<section class="card lesson-card"><div class="step-kicker">看图记住意思</div><div class="memory-visual" role="img" aria-label="清晨太阳升起，一艘小帆船驶向绿色岛屿"><span class="memory-sun"></span><span class="memory-hill a"></span><span class="memory-hill b"></span><span class="memory-boat"></span></div><h1 class="word" style="font-size:36px;margin-top:0">morning</h1><div class="meaning">早晨；上午</div><div class="story">太阳刚升起，小船在清晨出发。把这个画面和 <strong>morning</strong> 连在一起。</div><button class="inline-audio" data-action="audio"><span>${icon('volume')}</span>再听一次标准音</button><div class="lesson-spacer"></div><button class="btn btn-primary" data-action="next">我记住了 ${icon('arrow')}</button></section></div>`;
}

function optionCard(id, cls, title) {
  const status = state.answer === id ? (id === 'sunrise' ? 'correct selected' : 'wrong selected') : '';
  return `<button class="option-card ${status}" data-answer="${id}" aria-pressed="${state.answer === id}"><div class="option-illustration ${cls}" aria-hidden="true"></div><strong>${title}</strong>${state.answer === id && id === 'sunrise' ? `<span class="small-label">${icon('check')}就是它</span>` : ''}</button>`;
}

function verifyScreen() {
  const answered = state.answer !== null;
  return `<div class="screen no-tabs fade-in">${lessonHeader(2)}<section class="card lesson-card"><div class="step-kicker">选一选</div><h1 class="question">哪张图表示 morning？</h1><div class="option-grid">${optionCard('sunrise','sunrise','清晨')}${optionCard('night','night','夜晚')}${optionCard('noon','noon','中午')}${optionCard('rain','rain','雨天')}</div>${answered ? (state.answer === 'sunrise' ? `<div class="feedback success">${icon('check')}<span><strong>选对了！</strong><br>morning 就是早晨或上午。</span></div>` : `<div class="feedback retry">${icon('volume')}<span><strong>差一点，再听一次。</strong><br>想想太阳刚升起的画面。</span></div>`) : ''}<div class="lesson-spacer"></div><button class="btn btn-primary" data-action="${state.answer === 'sunrise' ? 'next' : 'audio'}" ${answered && state.answer !== 'sunrise' ? '' : answered ? '' : 'disabled'}>${state.answer === 'sunrise' ? `继续航行 ${icon('arrow')}` : `选好后继续`}</button></section></div>`;
}

function speakScreen() {
  return `<div class="screen no-tabs fade-in">${lessonHeader(3)}<section class="card lesson-card ${state.recording ? 'recording' : ''}"><div class="step-kicker">跟着读一读</div><h1 class="word">morning</h1><div class="phonetic">注意最后的 /ŋ/ 音</div>${state.evaluated ? `<div class="rating" aria-label="发音获得三颗星"><span class="star on"></span><span class="star on"></span><span class="star on"></span></div><div class="coach-tip">最后一个音读得更清楚了。继续保持这个节奏。</div><div class="audio-actions"><button class="mini-action" data-action="audio">${icon('volume')}标准音</button><button class="mini-action" data-action="slow">${icon('slow')}慢速听</button></div>` : `<div class="mic-area"><div class="mic-rings"><button class="mic-button" data-action="record" aria-label="${state.recording ? '完成录音' : '开始录音'}" aria-pressed="${state.recording}">${icon('mic')}</button></div><div class="record-status">${state.recording ? '正在听…' : '点一下，读出 morning'}</div><p class="record-hint">${state.recording ? '自然地读完这个词' : '不会因为环境噪声扣分'}</p></div><div class="audio-actions"><button class="mini-action" data-action="audio">${icon('volume')}标准音</button><button class="mini-action" data-action="slow">${icon('slow')}慢速听</button></div>`}<div class="lesson-spacer"></div><button class="btn btn-primary" data-action="next" ${state.evaluated ? '' : 'disabled'}>继续航行 ${icon('arrow')}</button></section></div>`;
}

function completeScreen() {
  return `<div class="screen no-tabs fade-in"><section class="card lesson-card complete-card"><div class="confetti" aria-hidden="true">${'<i></i>'.repeat(4)}</div><div class="completion-badge">${icon('check')}</div><h1 class="complete-title">今天完成啦</h1><p class="complete-summary">你听清了标准音，也记住了<br><strong>morning</strong> 的意思。</p><div class="reward-strip"><div class="reward"><strong>7 个</strong><span>完成词汇</span></div><div class="reward"><strong>3 颗</strong><span>发音星星</span></div><div class="reward"><strong>+1 段</strong><span>航程推进</span></div></div><div class="rest-note">今天的学习已经结束，去看看窗外，让眼睛休息一下吧。</div><div class="lesson-spacer"></div><button class="btn btn-primary" data-action="finish">休息一下</button></section></div>`;
}

function parentScreen() {
  return `<div class="screen fade-in"><div class="small-label">9 月 16 日—9 月 22 日</div><h1 class="page-title">本周学习简报</h1><section class="card parent-hero"><div class="small-label">本周总结</div><h2>学习节奏很稳定</h2><p>孩子独立完成了 4 次航程，词义掌握正在稳步提升。</p></section><div class="metric-grid"><section class="metric"><span>学习天数</span><strong>4 天</strong><small class="trend">保持稳定</small></section><section class="metric"><span>任务完成率</span><strong>86%</strong><small class="trend">本周 +6%</small></section><section class="metric"><span>已掌握</span><strong>18 词</strong><small class="trend">新增 7 词</small></section><section class="metric"><span>待复习</span><strong>5 词</strong><small class="muted">已安排复习</small></section></div><section class="card report-card"><div class="card-head"><strong>发音情况</strong><span>比上周更稳定</span></div><div class="report-row"><strong>发音通过率</strong><span>78%</span></div><div class="bar"><span style="width:78%;background:var(--success)"></span></div><div class="report-note"><strong>下周建议</strong><p>“morning”的尾音还可以更清楚。每天听一次慢速标准音即可，不需要额外加量。</p></div></section><section class="card report-card"><div class="unit-row"><div class="unit-icon">${icon('book')}</div><div class="unit-copy"><strong>当前教材</strong><span>湘少版 · 三年级上册</span></div>${icon('chevron')}</div></section><button class="text-link" data-action="toast" data-message="原型中暂不展开教材与权益设置">教材、权益与设置</button></div>${tabbar('parent')}<div class="toast" role="status"></div>`;
}

function render() {
  if (state.screen === 'home') app.innerHTML = homeScreen();
  if (state.screen === 'listen') app.innerHTML = listenScreen();
  if (state.screen === 'memory') app.innerHTML = memoryScreen();
  if (state.screen === 'verify') app.innerHTML = verifyScreen();
  if (state.screen === 'speak') app.innerHTML = speakScreen();
  if (state.screen === 'complete') app.innerHTML = completeScreen();
  if (state.screen === 'parent') app.innerHTML = parentScreen();
}

function showToast(message) {
  const toast = app.querySelector('.toast');
  if (!toast) return;
  toast.textContent = message;
  toast.classList.add('show');
  clearTimeout(state.toastTimer);
  state.toastTimer = setTimeout(() => toast.classList.remove('show'), 1800);
}

app.addEventListener('click', (event) => {
  const answer = event.target.closest('[data-answer]');
  if (answer) {
    state.answer = answer.dataset.answer;
    render();
    return;
  }
  const control = event.target.closest('[data-action]');
  if (!control || control.disabled) return;
  const action = control.dataset.action;
  if (action === 'home' || action === 'finish') {
    Object.assign(state,{screen:'home',step:0,answer:null,recording:false,evaluated:false,audioPlaying:false});
    render();
  }
  if (action === 'parent') { state.screen = 'parent'; render(); }
  if (action === 'start') { state.screen = 'listen'; state.step = 0; render(); }
  if (action === 'exit') { state.screen = 'home'; render(); setTimeout(()=>showToast('航程已保存，下次从这里继续'),30); }
  if (action === 'next') {
    const current = screens.indexOf(state.screen);
    if (current >= 0 && current < screens.length - 1) {
      state.screen = screens[current + 1];
      state.step = current + 1;
      state.audioPlaying = false;
      render();
    }
  }
  if (action === 'audio' || action === 'slow') {
    state.audioPlaying = !state.audioPlaying;
    if (state.screen === 'listen') render();
    else showToast(action === 'slow' ? '正在播放慢速标准音' : '正在播放标准音');
    setTimeout(()=>{state.audioPlaying=false;if(state.screen==='listen')render();},1200);
  }
  if (action === 'record') {
    if (!state.recording) {
      state.recording = true; render();
      setTimeout(()=>{if(state.recording){state.recording=false;state.evaluated=true;render();}},1500);
    } else { state.recording=false; state.evaluated=true; render(); }
  }
  if (action === 'unit-status') showToast(control.dataset.message);
  if (action === 'toast') showToast(control.dataset.message || '该功能将在后续原型中展开');
});

render();
