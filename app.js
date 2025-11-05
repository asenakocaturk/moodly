// Tema (light/dark)
const THEME_KEY = "moodly_theme";
function applyTheme(t){
  document.documentElement.classList.toggle("dark", t === "dark");
  document.body.classList.toggle("dark", t === "dark");
}
const savedTheme = localStorage.getItem(THEME_KEY);
if(savedTheme){ applyTheme(savedTheme); }
const toggleEl = document.getElementById("themeToggle");
if(toggleEl){
  toggleEl.checked = (savedTheme === "dark");
  toggleEl.addEventListener("change", (e)=>{
    const t = e.target.checked ? "dark" : "light";
    localStorage.setItem(THEME_KEY, t);
    applyTheme(t);
  });
}
// Simple localStorage-based MVP
const STORAGE_KEY = "moodly_entries_v1";

function loadEntries(){
  try{
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
  }catch(_){ return []; }
}

function saveEntries(entries){
  localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
}

function renderEntries(){
  const entries = loadEntries().sort((a,b)=> a.date.localeCompare(b.date));
  const wrap = document.getElementById("entries");
  wrap.innerHTML = "";
  entries.forEach((e,i)=>{
    const div = document.createElement("div");
    div.className = "entry";
    const meta = document.createElement("div");
    meta.className = "meta";
    meta.textContent = `${e.date} • Puan ${e.score} • ${e.emotion}`;
    const note = document.createElement("div");
    note.textContent = e.note || "";
    const del = document.createElement("button");
    del.textContent = "Sil";
    del.className = "danger";
    del.onclick = ()=>{
      const all = loadEntries();
      all.splice(all.findIndex(x=>x.id===e.id),1);
      saveEntries(all);
      renderEntries();
      renderChartAndInsights();
    };
    div.append(meta,note,del);
    wrap.appendChild(div);
  });
}
const edit = document.createElement("button");
edit.textContent = "Düzenle";
edit.onclick = ()=>{
  // Formu kayıt verileriyle doldur
  document.getElementById("date").value = e.date;
  document.getElementById("score").value = e.score;
  document.getElementById("scoreOut").textContent = e.score;
  document.getElementById("emotion").value = e.emotion;
  document.getElementById("note").value = e.note || "";
  // Eski kaydı silip, kaydettiğimizde aynı gün üzerine yazacağız
  const all = loadEntries();
  all.splice(all.findIndex(x=>x.id===e.id),1);
  saveEntries(all);
  renderEntries();
  renderChartAndInsights();
};
div.append(meta,note,edit); // edit'i de ekle

function renderChartAndInsights(){
  const ctx = document.getElementById("weeklyChart");
  const entries = loadEntries()
    .map(e=>({...e, ts: new Date(e.date+"T00:00:00")}))
    .sort((a,b)=>a.ts-b.ts);

  // take last 7 distinct days
  const byDay = {};
  entries.forEach(e=>{
    const d = e.date;
    if(!byDay[d]) byDay[d] = [];
    byDay[d].push(e.score);
  });
  const days = Object.keys(byDay).sort().slice(-7);
  const scores = days.map(d=> Math.round(byDay[d].reduce((a,b)=>a+b,0)/byDay[d].length));

  if(window._chart){ window._chart.destroy(); }
  window._chart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: days,
      datasets: [{
        label: 'Günlük Ortalama Puan',
        data: scores,
        tension: 0.35
      }]
    },
    options: {
      responsive: true,
      scales: {
        y: { min: 1, max: 5, ticks: { stepSize: 1 } }
      }
    }
  });

  // Insights
  const insights = document.getElementById("insights");
  if(days.length === 0){ insights.textContent = "Grafik için en az 1 gün kayıt ekleyin."; return; }
  const avg = scores.reduce((a,b)=>a+b,0)/scores.length;
  const trend = scores[scores.length-1] - scores[0];
  let msg = `Ortalama: ${avg.toFixed(2)} / 5. `;
  if(trend > 0) msg += "Hafta başına göre bir iyileşme var 👍";
  else if(trend < 0) msg += "Hafta başına göre bir düşüş var, küçük molalar, uyku ve suya dikkat 🧘";
  else msg += "Denge korunuyor; düzenli kayıt iyi gidiyor ✅";
  insights.textContent = msg;
}

document.getElementById("moodForm").addEventListener("submit", (ev)=>{
  ev.preventDefault();
  const date = document.getElementById("date").value || new Date().toISOString().slice(0,10);
  const score = +document.getElementById("score").value;
  const emotion = document.getElementById("emotion").value;
  const note = document.getElementById("note").value.trim();
  const entries = loadEntries();
  entries.push({ id: crypto.randomUUID(), date, score, emotion, note, createdAt: Date.now() });
  saveEntries(entries);
  (ev.target).reset();
  document.getElementById("scoreOut").textContent = 3;
  renderEntries();
  renderChartAndInsights();
});

document.getElementById("clearAll").addEventListener("click", ()=>{
  if(confirm("Tüm kayıtları silmek istediğine emin misin? Bu işlem geri alınamaz.")){
    localStorage.removeItem(STORAGE_KEY);
    renderEntries();
    renderChartAndInsights();
  }
});

// Günlük hatırlatma
const today = new Date().toISOString().slice(0,10);
const hasEntryToday = loadEntries().some(e => e.date === today);
if(!hasEntryToday){
  alert("Bugün ruh halini kaydetmek ister misin? 😊");
}

// init date to today
document.getElementById("date").value = new Date().toISOString().slice(0,10);

// initial render
renderEntries();
renderChartAndInsights();
// Günlük hatırlatma (sayfa yüklendikten HEMEN sonra)
setTimeout(()=>{
  const today = new Date().toISOString().slice(0,10);
  const hasEntryToday = loadEntries().some(e => e.date === today);
  console.log("hatırlatma kontrolü:", { today, hasEntryToday });
  if(!hasEntryToday){
    alert("Bugün ruh halini kaydetmek ister misin? 😊");
  }
}, 300);
// Sayfa içi hatırlatma (banner)
function showReminderIfNeeded(){
  const wrap = document.getElementById("reminder");
  if(!wrap) return;
  const today = new Date().toISOString().slice(0,10);
  const hasEntryToday = loadEntries().some(e => e.date === today);
  if(hasEntryToday){ 
    wrap.classList.add("hidden"); 
    return;
  }
  wrap.classList.remove("hidden");

  // Butonlar
  document.getElementById("addNow").onclick = ()=>{
    // Formu bugüne hazırla ve not kutusuna odakla
    document.getElementById("date").value = today;
    document.getElementById("note").focus();
    wrap.classList.add("hidden");
  };
  document.getElementById("dismissRem").onclick = ()=>{
    wrap.classList.add("hidden");
  };
}

// İlk yüklemede ve her kayıt sonrası hatırlatmayı değerlendir
showReminderIfNeeded();
function exportCsv(){
  const rows = loadEntries()
    .sort((a,b)=> a.date.localeCompare(b.date))
    .map(e => [e.date, e.score, e.emotion, (e.note||"").replaceAll('"','""')]);
  const header = ['date','score','emotion','note'];
  const csv = [header, ...rows].map(r => r.map(v=>`"${String(v)}"`).join(',')).join('\n');

  const blob = new Blob([csv], {type: 'text/csv;charset=utf-8;'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `moodly-${new Date().toISOString().slice(0,10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
document.getElementById("exportCsv").addEventListener("click", exportCsv);
function importCsv(file){
  const reader = new FileReader();
  reader.onload = () => {
    const lines = reader.result.split(/\r?\n/).filter(Boolean);
    const header = lines.shift(); // "date,score,emotion,note"
    const entries = loadEntries();
    for(const line of lines){
      const cols = line.split(",").map(s=>s.replace(/^"|"$/g,"").replace(/""/g,'"'));
      const [date, score, emotion, note] = cols;
      if(!date) continue;
      entries.push({ id: crypto.randomUUID(), date, score:+score||3, emotion, note, createdAt: Date.now() });
    }
    saveEntries(entries);
    renderEntries();
    renderChartAndInsights();
    alert("CSV içe aktarıldı ✅");
  };
  reader.readAsText(file, "utf-8");
}
document.getElementById("importCsv")?.addEventListener("change", (e)=>{
  if(e.target.files && e.target.files[0]) importCsv(e.target.files[0]);
});
// Basit onboarding + yerel depolama onayı
(function onboarding(){
  const KEY = "moodly_onboarded_v1";
  const ok = localStorage.getItem(KEY);
  const box = document.getElementById("ob");
  if(!box) return;
  if(!ok){
    box.style.display = "block";
  }
  const btn = document.getElementById("startBtn");
  const chk = document.getElementById("consentChk");
  if(btn){
    btn.onclick = ()=>{
      if(!chk.checked){ alert("Lütfen kutucuğu işaretle."); return; }
      localStorage.setItem(KEY, "yes");
      box.style.display = "none";
    };
  }
})();






