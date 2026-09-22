const app = document.querySelector('#app');

const icon = (name, label = '') => `<svg class="icon" ${label ? `role="img" aria-label="${label}"` : 'aria-hidden="true"'}><use href="#i-${name}"></use></svg>`;

const state = {
  screen: 'home', audioPlaying: false, listenCount: 0, answer: null,
  recording: false, pronunciation: 'idle', attempts: 0, toastTimer: null
};

const lessonScreens = ['listen', 'memory', 'verify', 'speak', 'word-complete'];

function resetLesson() {
  Object.assign(state, {screen:'listen',audioPlaying:false,listenCount:0,answer:null,recording:false,pronunciation:'idle',attempts:0});
}

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
        </div><span class="hero-gradient"></span>
      </div>
      <div class="hero-copy">
        <div class="hero-heading"><div><h2 id="today-title">今天的单词航程</h2><div class="small-label">向下一座小岛出发</div></div><div class="time-pill">${icon('clock')}约 5 分钟</div></div>
        <div class="stats"><div class="stat"><strong>5 个</strong><span>新词</span></div><div class="stat"><strong>2 个</strong><span>复习词</span></div><div class="stat"><strong>第 4 天</strong><span>本周学习</span></div></div>
        <button class="btn btn-primary" data-action="start">开始今日航程 ${icon('arrow')}</button>
      </div>
    </section>
    <section class="card week-card" aria-label="本周学习情况"><div class="card-head"><strong>本周学习</strong><span>已完成 4 天</span></div><div class="week-days">
      ${['一','二','三'].map(day => `<div class="week-day">${day}<span class="day-dot done">${icon('check')}</span></div>`).join('')}
      <div class="week-day">四<span class="day-dot today">今</span></div>
      ${['五','六','日'].map(day => `<div class="week-day">${day}<span class="day-dot">${day}</span></div>`).join('')}
    </div></section>
    <section class="card unit-card"><div class="unit-row"><div class="unit-icon">${icon('book')}</div><div class="unit-copy"><strong>Unit 2 · 问候岛</strong><span>本单元已完成 12 / 20 个词</span></div><span class="small-label">60%</span></div><div class="bar" aria-label="单元进度 60%"><span style="width:60%"></span></div></section>
  </div>${tabbar('learn')}<div class="toast" role="status"></div>`;
}

function lessonHeader(stepIndex) {
  const progress = [16,36,60,82,100][stepIndex];
  const labels = ['听标准音','联想记义','选图辨义','发音闯关','单词完成'];
  return `<header class="lesson-header-v2">
    <button class="icon-button" data-action="exit" aria-label="退出并保存学习进度">${icon('x')}</button>
    <div class="lesson-position"><strong>今日第 1 / 7 词</strong><span>${labels[stepIndex]}</span></div>
    <div class="word-chip" aria-label="当前单词 morning">morning</div>
  </header>
  <div class="stage-row" aria-label="单词学习进度，第 ${stepIndex + 1} 步，共 5 步">${labels.map((label,index) => `<span class="stage-dot ${index < stepIndex ? 'done' : ''} ${index === stepIndex ? 'current' : ''}" aria-label="${label}${index < stepIndex ? '，已完成' : index === stepIndex ? '，当前步骤' : '，未开始'}"></span>`).join('')}</div>
  <div class="progress-track"><span style="width:${progress}%"></span></div>`;
}

function lessonShell(stepIndex, content) {
  return `<div class="screen no-tabs lesson-screen fade-in">${lessonHeader(stepIndex)}${content}<div class="toast lesson-toast" role="status"></div></div>`;
}

function listenScreen() {
  const ready = state.listenCount >= 2;
  return lessonShell(0, `<section class="card lesson-card listen-card">
    <div class="step-kicker">先听两遍标准发音</div><h1 class="word">morning</h1><div class="phonetic">/ˈmɔːnɪŋ/</div>
    <button class="audio-button ${state.audioPlaying ? 'playing' : ''}" data-action="listen-audio" aria-label="播放 morning 标准发音" aria-pressed="${state.audioPlaying}">${icon(state.audioPlaying ? 'pause' : 'play')}</button>
    <div class="wave" aria-hidden="true">${'<i></i>'.repeat(7)}</div>
    <div class="listen-counter" aria-label="已听 ${state.listenCount} 遍，共需听 2 遍"><span class="${state.listenCount >= 1 ? 'heard' : ''}">${state.listenCount >= 1 ? icon('check') : '1'}</span><i></i><span class="${state.listenCount >= 2 ? 'heard' : ''}">${state.listenCount >= 2 ? icon('check') : '2'}</span></div>
    <p class="listen-hint">${ready ? '耳朵准备好啦，可以继续。' : '暂时不看中文，先熟悉它的声音。'}</p>
    <div class="lesson-spacer"></div><button class="btn btn-primary" data-action="next" ${ready ? '' : 'disabled'}>我听好了 ${icon('arrow')}</button>
  </section><aside class="info-note">${icon('shield')}<span>先听清正确读音，再用记忆暗号帮助记住意思。</span></aside>`);
}

function memoryPlaceholder(compact = false) {
  return `<div class="memory-placeholder ${compact ? 'compact' : ''}" role="img" aria-label="谐音联想插图待补"><div class="placeholder-mark">${icon('book')}</div><strong>谐音联想插图待补</strong><span>${compact ? '之后插入联想图' : '建议比例 3:2 · 后续直接替换图片'}</span></div>`;
}

function memoryScreen() {
  return lessonShell(1, `<section class="card lesson-card memory-card">
    <div class="step-kicker">看图记住意思</div>${memoryPlaceholder()}
    <div class="word-meaning-row"><div><h1 class="word compact-word">morning</h1><div class="phonetic">/ˈmɔːnɪŋ/</div></div><div class="meaning">早晨；上午</div></div>
    <div class="story"><span class="story-label">记忆暗号</span>太阳刚升起，小船在清晨出发。把这个画面和 <strong>morning</strong> 连在一起。</div>
    <button class="inline-audio" data-action="audio"><span>${icon('volume')}</span>再听一次标准音</button>
    <aside class="mnemonic-note">${icon('shield')}<span>记忆暗号只帮助记住意思，正确读音请听标准音。</span></aside>
    <div class="lesson-spacer"></div><button class="btn btn-primary" data-action="next">我记住了 ${icon('arrow')}</button>
  </section>`);
}

function optionCard(id, illustration, title) {
  const selected = state.answer === id;
  const status = selected ? (id === 'sunrise' ? 'correct selected' : 'wrong selected') : '';
  return `<button class="option-card ${status}" data-answer="${id}" aria-pressed="${selected}"><div class="option-illustration ${illustration}" aria-hidden="true"></div><strong>${title}</strong>${selected ? `<span class="option-status">${id === 'sunrise' ? `${icon('check')}正确` : '再想一想'}</span>` : ''}</button>`;
}

function verifyScreen() {
  const answered = state.answer !== null;
  const correct = state.answer === 'sunrise';
  return lessonShell(2, `<section class="card lesson-card verify-card">
    <div class="step-kicker">选一选</div><h1 class="question">哪张图表示 <strong>morning</strong>？</h1>
    <div class="option-grid">${optionCard('sunrise','sunrise','清晨')}${optionCard('night','night','夜晚')}${optionCard('noon','noon','中午')}${optionCard('rain','rain','雨天')}</div>
    ${answered ? (correct ? `<div class="feedback success">${icon('check')}<span><strong>选对了！</strong><br>morning 就是早晨或上午。</span></div>` : `<div class="recall-panel">${memoryPlaceholder(true)}<div><strong>回想一下联想画面</strong><span>太阳刚升起，小船在清晨出发。</span><button class="recall-audio" data-action="audio">${icon('volume')}听标准音</button></div></div>`) : `<p class="choice-hint">先看图片，再选出单词的意思。</p>`}
    <div class="lesson-spacer"></div><button class="btn btn-primary" data-action="next" ${correct ? '' : 'disabled'}>${correct ? `继续航行 ${icon('arrow')}` : '选对后继续'}</button>
  </section>`);
}

function speakResult() {
  if (state.pronunciation === 'noise') return `<div class="speech-feedback neutral">${icon('volume')}<div><strong>这次没有听清</strong><span>可能是声音太小或周围有点吵。这不算闯关失败。</span></div></div>`;
  if (state.pronunciation === 'success') return `<div class="rating" aria-label="发音获得两颗星"><span class="star on"></span><span class="star on"></span><span class="star"></span></div><div class="coach-tip"><strong>读得更清楚了</strong><span>最后的 /ŋ/ 音再轻轻收住，就更自然了。</span></div>`;
  return '';
}

function speakScreen() {
  const success = state.pronunciation === 'success';
  return lessonShell(3, `<section class="card lesson-card speak-card ${state.recording ? 'recording' : ''}">
    <div class="step-kicker">跟着读一读</div><h1 class="word speak-word">morning</h1><div class="pronunciation-focus"><span>/ˈmɔːnɪŋ/</span><strong>注意最后的 /ŋ/ 音</strong></div>
    ${success ? speakResult() : `<div class="mic-area"><div class="mic-rings"><button class="mic-button" data-action="record" aria-label="${state.recording ? '完成录音' : '开始录音'}" aria-pressed="${state.recording}">${icon('mic')}</button></div><div class="record-status">${state.recording ? '正在听…' : state.pronunciation === 'noise' ? '准备好后再试一次' : '点一下，读出 morning'}</div><p class="record-hint">${state.recording ? '自然地读完这个词' : '噪声或网络问题不会被判低分'}</p></div>${speakResult()}`}
    <div class="audio-actions"><button class="mini-action" data-action="audio">${icon('volume')}标准音</button><button class="mini-action" data-action="slow">${icon('slow')}慢速听</button></div>
    <div class="lesson-spacer"></div><button class="btn btn-primary" data-action="${success ? 'next' : 'record'}">${success ? `完成这个单词 ${icon('arrow')}` : state.pronunciation === 'noise' ? `${icon('mic')}再读一次` : `${icon('mic')}开始录音`}</button>
  </section>`);
}

function wordCompleteScreen() {
  return lessonShell(4, `<section class="card lesson-card word-complete-card">
    <div class="word-complete-icon">${icon('check')}</div><div class="step-kicker">第 1 个单词已完成</div><h1 class="complete-title">morning 已学会</h1>
    <p class="complete-summary">你听清了标准音，记住了词义，<br>也勇敢地完成了跟读。</p>
    <div class="word-result-list">
      <div><span class="result-icon audio">${icon('volume')}</span><p><strong>标准听音</strong><small>已听 2 遍</small></p><span class="result-check">${icon('check')}</span></div>
      <div><span class="result-icon meaning-icon">${icon('book')}</span><p><strong>词义辨认</strong><small>早晨；上午</small></p><span class="result-check">${icon('check')}</span></div>
      <div><span class="result-icon speech">${icon('mic')}</span><p><strong>发音闯关</strong><small>获得 2 颗星</small></p><span class="result-check">${icon('check')}</span></div>
    </div>
    <div class="next-progress"><div><strong>今日航程</strong><span>已完成 1 / 7 个词</span></div><div class="bar" aria-label="今日单词进度 14%"><span style="width:14%"></span></div></div>
    <div class="lesson-spacer"></div><button class="btn btn-primary" data-action="next-word">学习下一个单词 ${icon('arrow')}</button>
  </section>`);
}

function parentScreen() {
  return `<div class="screen fade-in"><div class="small-label">9 月 16 日—9 月 22 日</div><h1 class="page-title">本周学习简报</h1><section class="card parent-hero"><div class="small-label">本周总结</div><h2>学习节奏很稳定</h2><p>孩子独立完成了 4 次航程，词义掌握正在稳步提升。</p></section><div class="metric-grid"><section class="metric"><span>学习天数</span><strong>4 天</strong><small class="trend">保持稳定</small></section><section class="metric"><span>任务完成率</span><strong>86%</strong><small class="trend">本周 +6%</small></section><section class="metric"><span>已掌握</span><strong>18 词</strong><small class="trend">新增 7 词</small></section><section class="metric"><span>待复习</span><strong>5 词</strong><small class="muted">已安排复习</small></section></div><section class="card report-card"><div class="card-head"><strong>发音情况</strong><span>比上周更稳定</span></div><div class="report-row"><strong>发音通过率</strong><span>78%</span></div><div class="bar"><span style="width:78%;background:var(--success)"></span></div><div class="report-note"><strong>下周建议</strong><p>“morning”的尾音还可以更清楚。每天听一次慢速标准音即可，不需要额外加量。</p></div></section><section class="card report-card"><div class="unit-row"><div class="unit-icon">${icon('book')}</div><div class="unit-copy"><strong>当前教材</strong><span>湘少版 · 三年级上册</span></div>${icon('chevron')}</div></section><button class="text-link" data-action="toast" data-message="原型中暂不展开教材与权益设置">教材、权益与设置</button></div>${tabbar('parent')}<div class="toast" role="status"></div>`;
}

function render() {
  const views = {home:homeScreen,listen:listenScreen,memory:memoryScreen,verify:verifyScreen,speak:speakScreen,'word-complete':wordCompleteScreen,parent:parentScreen};
  app.innerHTML = views[state.screen]();
}

function showToast(message) {
  const toast = app.querySelector('.toast');
  if (!toast) return;
  toast.textContent = message; toast.classList.add('show'); clearTimeout(state.toastTimer);
  state.toastTimer = setTimeout(() => toast.classList.remove('show'), 1800);
}

function finishRecording() {
  state.recording = false;
  if (state.attempts === 0) { state.attempts = 1; state.pronunciation = 'noise'; }
  else { state.attempts += 1; state.pronunciation = 'success'; }
  render();
}

app.addEventListener('click', event => {
  const answer = event.target.closest('[data-answer]');
  if (answer) { state.answer = answer.dataset.answer; render(); return; }
  const control = event.target.closest('[data-action]');
  if (!control || control.disabled) return;
  const action = control.dataset.action;

  if (action === 'home') { state.screen = 'home'; render(); }
  if (action === 'parent') { state.screen = 'parent'; render(); }
  if (action === 'start') { resetLesson(); render(); }
  if (action === 'exit') { state.screen = 'home'; render(); setTimeout(() => showToast('学习进度已保存，下次从这里继续'), 30); }
  if (action === 'next') { const current = lessonScreens.indexOf(state.screen); if (current >= 0 && current < lessonScreens.length - 1) { state.screen = lessonScreens[current + 1]; state.audioPlaying = false; render(); } }
  if (action === 'listen-audio') {
    if (state.audioPlaying) return;
    state.audioPlaying = true; render();
    setTimeout(() => { state.audioPlaying = false; state.listenCount = Math.min(2, state.listenCount + 1); render(); }, 750);
  }
  if (action === 'audio' || action === 'slow') showToast(action === 'slow' ? '正在播放慢速标准音' : '正在播放标准音');
  if (action === 'record') {
    if (state.recording) finishRecording();
    else { state.recording = true; state.pronunciation = 'idle'; render(); setTimeout(() => { if (state.recording) finishRecording(); }, 1450); }
  }
  if (action === 'next-word') { state.screen = 'home'; render(); setTimeout(() => showToast('morning 已保存，下一词将复用此学习流程'), 30); }
  if (action === 'unit-status') showToast(control.dataset.message);
  if (action === 'toast') showToast(control.dataset.message || '该功能将在后续原型中展开');
});

render();
