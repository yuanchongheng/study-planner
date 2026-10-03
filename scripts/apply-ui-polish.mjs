import fs from 'node:fs';

const path = 'index.html';
let h = fs.readFileSync(path, 'utf8');

function replaceOnce(oldText, newText, label) {
  const i = h.indexOf(oldText);
  if (i < 0) throw new Error(`Missing ${label}`);
  h = h.slice(0, i) + newText + h.slice(i + oldText.length);
}

// Remove an older copy if this script is run again.
h = h.replace(/\/\* UI POLISH V3 START \*\/[\s\S]*?\/\* UI POLISH V3 END \*\//, '');

const polish = String.raw`
/* UI POLISH V3 START */
:root{
  --surface:#ffffff;
  --surface-soft:#f8f9fd;
  --surface-tint:#f3f2ff;
  --line-strong:#dfe4ee;
  --purple-deep:#5e55c8;
  --purple-soft:#f0eeff;
  --mint-soft:#edf8f4;
  --shadow-soft:0 12px 34px rgba(32,48,78,.07);
  --shadow-card:0 7px 22px rgba(36,48,78,.055);
}
body{
  background:
    radial-gradient(circle at 78% -10%,rgba(112,102,223,.10),transparent 30%),
    radial-gradient(circle at 34% 8%,rgba(35,129,105,.055),transparent 24%),
    #f5f7fb;
}
.sidebar{
  background:linear-gradient(180deg,#182840 0%,#1a2c45 52%,#16263b 100%);
  box-shadow:10px 0 34px rgba(17,35,58,.08);
}
.mark{
  background:linear-gradient(145deg,#c3f4db,#9fe4c5);
  box-shadow:0 8px 24px rgba(56,183,132,.18),inset 0 1px 0 rgba(255,255,255,.8);
}
.sidebar nav a{border:1px solid transparent;transition:.18s ease}
.sidebar nav a:hover{background:#ffffff0d;border-color:#ffffff10;transform:translateX(2px)}
.sidebar nav a.active{
  background:linear-gradient(90deg,#ffffff16,#ffffff0a);
  border-color:#ffffff14;
  box-shadow:inset 3px 0 0 #b7f3d1;
}
.content{max-width:1560px;padding-bottom:90px}
.topbar{
  position:sticky;top:0;z-index:8;
  margin:0 -10px;padding:18px 10px 16px;
  background:linear-gradient(180deg,rgba(245,247,251,.96),rgba(245,247,251,.82));
  backdrop-filter:blur(16px);-webkit-backdrop-filter:blur(16px);
}
.btn{transition:transform .16s ease,box-shadow .16s ease,border-color .16s ease,background .16s ease}
.btn:hover{box-shadow:0 8px 22px rgba(31,49,80,.10);transform:translateY(-1px)}
.btn.purple{background:linear-gradient(135deg,#756ae4,#6258cf);box-shadow:0 6px 16px rgba(112,102,223,.18)}
.btn.dark{background:linear-gradient(135deg,#213753,#172940)}
.hero{
  border:1px solid rgba(255,255,255,.86);
  background:
    radial-gradient(circle at 82% 20%,rgba(255,255,255,.72),transparent 27%),
    linear-gradient(122deg,#e8e8ff 0%,#f0efff 43%,#e7f5f0 100%);
  box-shadow:0 20px 58px rgba(35,45,86,.09),inset 0 1px 0 rgba(255,255,255,.9);
}
.hero:before{content:'';position:absolute;left:0;top:0;width:5px;height:100%;background:linear-gradient(180deg,#7066df,#8abfae);opacity:.65}
.hero h1{letter-spacing:-.8px;color:#233149}
.pill{backdrop-filter:blur(6px);box-shadow:inset 0 1px 0 rgba(255,255,255,.7)}
.notice{box-shadow:var(--shadow-card);background:rgba(255,255,255,.91)}
.stat,.panel,.mini-card,.goal-panel,.study-time-panel{
  border-color:#e4e8f0;
  box-shadow:var(--shadow-card);
}
.stat{position:relative;overflow:hidden;transition:transform .18s ease,box-shadow .18s ease,border-color .18s ease}
.stat:before{content:'';position:absolute;left:0;right:0;top:0;height:3px;background:linear-gradient(90deg,#7066df,#92c9b7);opacity:.7}
.stat:hover{transform:translateY(-2px);box-shadow:0 13px 31px rgba(30,45,76,.085);border-color:#dce0eb}
.stat-num{color:#26364f}
.head{position:relative;padding-left:13px}
.head:before{content:'';position:absolute;left:0;top:4px;bottom:4px;width:3px;border-radius:4px;background:linear-gradient(180deg,#7066df,#93cbb8)}
.head h2{letter-spacing:-.25px;color:#223149}
.panel{background:rgba(255,255,255,.94)}
.modebox{border:1px solid #e6e9f0;background:linear-gradient(180deg,#fafbfe,#f7f8fc)}
.field input,.field select,.field textarea,.date-nav input,.modebox select,.edit-field input,.edit-field textarea,.edit-field select{
  border-color:#dde3ec;background:#fff;box-shadow:inset 0 1px 2px rgba(31,45,70,.018);transition:border-color .16s ease,box-shadow .16s ease;
}
.field input:focus,.field select:focus,.field textarea:focus,.date-nav input:focus,.modebox select:focus,.edit-field input:focus,.edit-field textarea:focus,.edit-field select:focus{
  border-color:#9b93ea;box-shadow:0 0 0 3px rgba(112,102,223,.09);
}
.time-row{gap:10px}
.time-text{color:#67768c;font-weight:800}
.dot{border-color:#9288eb;box-shadow:0 0 0 4px #f0efff}
.line{background:linear-gradient(#d9dcef,#e9ebf4)}
.task{
  position:relative;
  border-color:#e7eaf1;background:linear-gradient(180deg,#fff,#fcfcff);
  border-radius:15px;padding:16px 14px;
  box-shadow:0 5px 16px rgba(38,48,80,.035);
  transition:border-color .18s ease,box-shadow .18s ease,transform .18s ease;
}
.task:hover{border-color:#c8c3f7;box-shadow:0 10px 26px rgba(63,54,137,.07);transform:translateY(-1px)}
.task.done{background:linear-gradient(180deg,#f7fcf9,#f1faf6);border-color:#d5eadf}
.duration{background:linear-gradient(135deg,#f1efff,#e9e6ff);border:1px solid #e1ddff}
.subject{border:1px solid #dce7fa}
.subject.phd{border-color:#cde9df}.subject.apply{border-color:#f0dfc5}
.task-efficiency{background:linear-gradient(90deg,#fafbfe,#f8f8fd);border-color:#dfe3ec}
.eff-btn{transition:.14s ease}.eff-btn:hover{transform:translateY(-1px)}
.task-actions .task-action{transition:.14s ease}
.task-action:hover{transform:translateY(-1px);box-shadow:0 4px 10px rgba(80,70,160,.07)}
.study-time-panel,.goal-panel{background:rgba(255,255,255,.95)}
.study-time-kpi,.goal-kpi{background:linear-gradient(180deg,#fafbfe,#f7f8fc);border:1px solid #eceef4;border-radius:12px}
.study-chart-shell{border-color:#e5e8ef;background:linear-gradient(180deg,#fbfcfe,#f8f9fc)}
.module,.drill-module-card,.civil-sub-input-row,.drill-sub-row{box-shadow:0 4px 13px rgba(35,47,75,.035)}
.module{background:linear-gradient(180deg,#fff,#fcfcfe)}
.records tbody tr:hover{background:#fafaff}
.live{background:
  radial-gradient(circle at 90% 10%,rgba(105,217,174,.12),transparent 28%),
  linear-gradient(145deg,#1c2d46,#16263c);
  box-shadow:0 15px 38px rgba(17,37,63,.13)
}
.calendar-panel{
  box-shadow:0 20px 54px rgba(12,19,34,.18),inset 0 1px 0 rgba(255,255,255,.035);
  border-color:#30384d;
}
.calendar-heading h3{letter-spacing:-.25px}
.calendar-viewport{scrollbar-color:#47506a #171b27}
.calendar-event{
  border-radius:10px!important;
  box-shadow:0 5px 14px rgba(5,10,20,.16);
  transition:box-shadow .14s ease,filter .14s ease;
}
.calendar-event:hover{box-shadow:0 9px 24px rgba(5,10,20,.25);filter:brightness(1.04)}
.calendar-event.short{min-height:50px}
.calendar-event.compact{min-height:28px}
.calendar-hour{font-weight:750;letter-spacing:.1px}
.calendar-now-line{filter:drop-shadow(0 0 4px rgba(255,92,92,.25))}
.notion-panel{box-shadow:var(--shadow-card);border-color:#d5e9e2}
@media(max-width:1150px){.topbar{margin:0}.content{padding-left:25px;padding-right:25px}}
@media(max-width:730px){.topbar{position:static;background:transparent;backdrop-filter:none}.task{border-radius:13px}.head{padding-left:10px}}
/* UI POLISH V3 END */
`;

const styleEnd = h.indexOf('</style>');
if (styleEnd < 0) throw new Error('Missing </style>');
h = h.slice(0, styleEnd) + polish + h.slice(styleEnd);

// Make the calendar vertically more generous: 40 min ≈ 56px, 45 min ≈ 63px.
if (h.includes('const CAL_SCALE=1, CAL_STEP=5;')) {
  h = h.replace('const CAL_SCALE=1, CAL_STEP=5;', 'const CAL_SCALE=1.4, CAL_STEP=5;');
} else if (!h.includes('const CAL_SCALE=1.4, CAL_STEP=5;')) {
  throw new Error('Missing CAL_SCALE declaration');
}

replaceOnce(
  'style="top:${h*60}px"',
  'style="top:${h*60*CAL_SCALE}px"',
  'calendar hour scale'
);
replaceOnce(
  "board.style.height=boardEnd+'px'",
  "board.style.height=(boardEnd*CAL_SCALE)+'px'",
  'calendar board scale'
);

fs.writeFileSync(path, h);
console.log('Applied UI polish and calendar scale.');
