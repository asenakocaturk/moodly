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
