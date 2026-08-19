// ──────────────────────────────────────────
// 법인세법 완전정복 - 핵심 로직
// ──────────────────────────────────────────

const EXAM_DATE = new Date('2027-04-24');

// ── D-Day ──
function getDDay() {
  const today = new Date();
  today.setHours(0,0,0,0);
  const exam = new Date(EXAM_DATE);
  exam.setHours(0,0,0,0);
  const diff = Math.ceil((exam - today)/(1000*60*60*24));
  return diff > 0 ? `D-${diff}` : diff === 0 ? 'D-Day!' : `D+${Math.abs(diff)}`;
}

// ── 날짜 ──
function getTodayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

// ── 진도 관리 ──
function getProgress() {
  const p = localStorage.getItem('tls_progress');
  return p ? JSON.parse(p) : {};
}

function saveProgress(p) {
  localStorage.setItem('tls_progress', JSON.stringify(p));
}

function updateProgress(chKey, type, correct, total) {
  const p = getProgress();
  if (!p[chKey]) p[chKey] = {};
  if (!p[chKey][type]) p[chKey][type] = { correct:0, total:0, lastDate:'' };
  p[chKey][type].correct += correct;
  p[chKey][type].total   += total;
  p[chKey][type].lastDate = getTodayStr();
  saveProgress(p);
}

function getChapterPct(chKey) {
  const p = getProgress();
  if (!p[chKey]) return 0;
  let c=0, t=0;
  Object.values(p[chKey]).forEach(v => { c+=v.correct; t+=v.total; });
  return t > 0 ? Math.round(c/t*100) : 0;
}

// ── 오답 노트 ──
function getWrongNotes() {
  const w = localStorage.getItem('tls_wrong');
  return w ? JSON.parse(w) : [];
}

function saveWrongNotes(arr) {
  localStorage.setItem('tls_wrong', JSON.stringify(arr));
}

function addWrongNote(chKey, type, q, myAns, correctAns, 해설, 원문) {
  const arr = getWrongNotes();
  arr.push({
    id: Date.now(),
    chKey, type, q, myAns, correctAns, 해설, 원문,
    date: getTodayStr(),
    reviewCount: 0
  });
  // 최대 500개 유지
  if (arr.length > 500) arr.splice(0, arr.length-500);
  saveWrongNotes(arr);
}

// ── 셔플 ──
function shuffle(arr) {
  const a = [...arr];
  for (let i=a.length-1; i>0; i--) {
    const j = Math.floor(Math.random()*(i+1));
    [a[i],a[j]] = [a[j],a[i]];
  }
  return a;
}

// ── 토스트 ──
function showToast(msg) {
  let t = document.getElementById('toast');
  if (!t) {
    t = document.createElement('div');
    t.id = 'toast';
    t.className = 'toast';
    document.body.appendChild(t);
  }
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 2200);
}

// ── 챕터 정보 ──
const CHAPTER_LIST = [
  { key:'CH01', label:'CH01 총론' },
  { key:'CH02', label:'CH02 세무조정·소득처분' },
  { key:'CH03', label:'CH03 익금' },
  { key:'CH04', label:'CH04 손금' },
  { key:'CH05', label:'CH05 손익귀속·자산평가' },
  { key:'CH06', label:'CH06 감가상각' },
  { key:'CH07', label:'CH07 충당금·준비금' },
  { key:'CH08', label:'CH08 부당행위계산' },
  { key:'CH09', label:'CH09 과세표준·세액' },
  { key:'CH10', label:'CH10 납세절차' },
  { key:'CH11', label:'CH11 기타 법인세' },
  { key:'CH12', label:'CH12 합병·분할' },
];

// ── 학습 유형 ──
const TYPE_LIST = [
  { key:'ox',      label:'OX 퀴즈',         color:'#1565C0', icon:'⭕' },
  { key:'choice',  label:'4지선다',          color:'#8E24AA', icon:'📝' },
  { key:'blank',   label:'빈칸 채우기',      color:'#2E7D32', icon:'✏️' },
  { key:'cards',   label:'플래시카드',       color:'#E65100', icon:'🃏' },
  { key:'compare', label:'Book vs Tax',      color:'#C62828', icon:'📊' },
  { key:'numbers', label:'숫자 집중 암기',   color:'#00838F', icon:'🔢' },
  { key:'flow',    label:'계산흐름도',       color:'#37474F', icon:'🔄' },
  { key:'white',   label:'백지 테스트',      color:'#4527A0', icon:'📄' },
];

// ── 현재 선택 상태 (전역) ──
window.SELECTED_CH  = null;
window.SELECTED_TYPE = null;
window.CURRENT_DATA = [];
window.CURRENT_IDX  = 0;
window.SESSION_CORRECT = 0;
window.SESSION_TOTAL   = 0;
window.SESSION_WRONGS  = [];

// ── 데이터 로드 ──
function getChData(chKey) {
  return window[chKey] || null;
}

function getTypeData(chKey, type) {
  const ch = getChData(chKey);
  if (!ch) return [];
  return ch[type] || [];
}

// ── 세션 초기화 ──
function initSession(chKey, type) {
  window.SELECTED_CH   = chKey;
  window.SELECTED_TYPE = type;
  const raw = getTypeData(chKey, type);
  window.CURRENT_DATA  = shuffle(raw);
  window.CURRENT_IDX   = 0;
  window.SESSION_CORRECT = 0;
  window.SESSION_TOTAL   = 0;
  window.SESSION_WRONGS  = [];
}

// ── 정답 처리 공통 ──
function processAnswer(isCorrect, q, myAns, correctAns, 해설, 원문) {
  window.SESSION_TOTAL++;
  if (isCorrect) {
    window.SESSION_CORRECT++;
  } else {
    window.SESSION_WRONGS.push({ q, myAns, correctAns, 해설, 원문 });
    addWrongNote(
      window.SELECTED_CH,
      window.SELECTED_TYPE,
      q, myAns, correctAns, 해설, 원문
    );
  }
  updateProgress(
    window.SELECTED_CH,
    window.SELECTED_TYPE,
    isCorrect ? 1 : 0, 1
  );
}

// ── 결과 HTML 생성 ──
function buildResultHTML(chLabel, typeLabel) {
  const c = window.SESSION_CORRECT;
  const t = window.SESSION_TOTAL;
  const pct = t > 0 ? Math.round(c/t*100) : 0;
  const wrongs = window.SESSION_WRONGS;

  let msg = '';
  if (pct >= 90)      msg = '🏆 훌륭합니다!';
  else if (pct >= 70) msg = '👍 잘 하셨어요!';
  else                msg = '📖 조금 더 복습해봐요!';

  let wrongHTML = '';
  if (wrongs.length === 0) {
    wrongHTML = '<div style="text-align:center;color:#2E7D32;font-weight:bold;padding:14px;">🎊 모든 문제 정답!</div>';
  } else {
    wrongHTML = `<div style="font-weight:bold;color:#B71C1C;margin:12px 0 6px;">❌ 틀린 문제 (${wrongs.length}개) — 아래를 다시 공부하세요!</div>`;
    wrongs.forEach((w,i) => {
      wrongHTML += `
        <div class="wrong-item">
          <div class="wi-q">Q${i+1}. ${w.q}</div>
          <div class="wi-ans">
            <span class="ans-my">내 답: ${w.myAns}</span>
            <span class="ans-correct">정답: ${w.correctAns}</span>
          </div>
          <div class="wi-exp">📖 ${w.해설}</div>
          ${w.원문 ? `<div style="font-size:0.75rem;color:#888;margin-top:3px;">📌 원문: ${w.원문}</div>` : ''}
        </div>`;
    });
  }

  return `
    <div style="text-align:center;margin-bottom:14px;">
      <div style="font-size:1rem;color:#555;">${chLabel} · ${typeLabel}</div>
      <div style="font-size:2rem;font-weight:bold;color:#1A237E;margin:6px 0;">${c} / ${t}</div>
      <div style="font-size:1.1rem;color:#555;">정답률 ${pct}%</div>
      <div style="font-size:1.1rem;font-weight:bold;color:#E65100;margin-top:4px;">${msg}</div>
    </div>
    ${wrongHTML}
  `;
}

// ── 모달 닫기 ──
function closeModalOutside(e) {
  if (e.target.classList.contains('modal-overlay')) {
    e.target.classList.remove('active');
  }
}
