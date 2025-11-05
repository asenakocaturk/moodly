// ========== Tema (default DARK) ==========
const THEME_KEY = "moodly_theme";
function applyTheme(t){
  document.documentElement.classList.toggle("dark", t === "dark");
  document.body.classList.toggle("dark", t === "dark");
}
const savedTheme = localStorage.getItem(THEME_KEY);
const defaultTheme = savedTheme || "dark";
applyTheme(defaultTheme);
const toggleEl = document.getElementById("themeToggle");
if (toggleEl) {
  toggleEl.checked = (defaultTheme === "dark");
  toggleEl.addEventListener("change", (e)=>{
    const t = e.target.checked ? "dark" : "light";
    localStorage.setItem(THEME_KEY, t);
    applyTheme(t);
  });
}

// ========== Depolama ==========
const STORAGE_KEY = "moodly_entries_v1";
function loadEntries(){
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || []; }
  catch { return []; }
}
function saveEntries(arr){ localStorage.setItem(STORAGE_KEY, JSON.stringify(arr)); }

// ========== Toast ==========
function showToast(msg="Kaydedildi ✅"){
  const t = document.getElementById("toast");
  if(!t) return;
  t.textContent = msg;
  t.classList.add("show");
  setTimeout(()=> t.classList.remove("show"), 1600);
}

// ========== Liste & render ==========
function renderEntries(){
  const wrap = document.getElementById("entries");
  if(!wrap) return;
  wrap.innerHTML = "";
  const list = loadEntries().sort((a,b)=> a.date.localeCompare(b.date));
  if(!list.length){
    wrap.innerHTML = `<div class="entry"><div class="meta">Henüz kayıt yok.</div></div>`;
    return;
  }
  for(const e of list){
    const div = document.createElement("div");
    div.className = "entry";
    const meta = document.createElement("div");
    meta.className = "meta";
    meta.textContent = `${e.date} • ${e.emotion} • ${e.score}/5`;
    const note = document.createElement("div");
    note.className = "note" + (!e.note ? " empty": "");
    note.textContent = e.note || "(not yok)";
    // Aksiyonlar
    const edit = document.createElement("button");
    edit.textContent = "Düzenle";
    edit.className = "btn btn-ghost";
    edit.onclick = ()=>{
      document.getElementById("date").value = e.date;
      document.getElementById("score").value = e.score;
      document.getElementById("scoreOut").textContent = e.score;
      document.getElementById("emotion").value = e.emotion;
      document.getElementById("note").value = e.note || "";
      const all = loadEntries();
      const idx = all.findIndex(x=>x.id===e.id);
      if(idx !== -1){ all.splice(idx,1); saveEntries(all); }
      renderEntries();
      showReminderIfNeeded();
    };
    const del = document.createElement("button");
    del.textContent = "Sil";
    del.className = "btn btn-danger";
    del.onclick = ()=>{
      const all = loadEntries();
      const idx = all.findIndex(x=>x.id===e.id);
      if(idx !== -1){ all.splice(idx,1); saveEntries(all); }
      renderEntries();
      showReminderIfNeeded();
      showToast("Kayıt silindi");
    };
    const actions = document.createElement("div");
    actions.className = "actions";
    actions.append(edit, del);
    div.append(meta, note, actions);
    wrap.append(div);
  }
}

// ========== Form ==========
document.getElementById("moodForm")?.addEventListener("submit", (ev)=>{
  ev.preventDefault();
  const date = document.getElementById("date").value || new Date().toISOString().slice(0,10);
  const score = +document.getElementById("score").value;
  const emotion = document.getElementById("emotion").value;
  const note = document.getElementById("note").value.trim();

  const entries = loadEntries();
  // Aynı güne tek kayıt: varsa sil
  const idx = entries.findIndex(e => e.date === date);
  if (idx !== -1) entries.splice(idx, 1);

  entries.push({ id: crypto.randomUUID(), date, score, emotion, note, createdAt: Date.now() });
  saveEntries(entries);

  ev.target.reset();
  document.getElementById("date").value = new Date().toISOString().slice(0,10);
  document.getElementById("scoreOut").textContent = 3;

  renderEntries();
  showReminderIfNeeded();
  showToast("Kayıt eklendi");
});

// ========== CSV dışa/içe aktar ==========
function exportCsv(){
  const rows = loadEntries()
    .sort((a,b)=> a.date.localeCompare(b.date))
    .map(e => [e.date, e.score, e.emotion, (e.note||"").replaceAll('"','""')]);
  const header = ['date','score','emotion','note'];
  const csv = [header, ...rows].map(r => r.map(v => `"${String(v)}"`).join(',')).join('\n');
  const blob = new Blob([csv], {type: 'text/csv;charset=utf-8;'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `moodly-${new Date().toISOString().slice(0,10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
document.getElementById("exportCsv")?.addEventListener("click", exportCsv);

function importCsv(file){
  const reader = new FileReader();
  reader.onload = () => {
    const lines = reader.result.split(/\r?\n/).filter(Boolean);
    lines.shift(); // header
    const entries = loadEntries();
    for(const line of lines){
      const cols = line.split(",").map(s=>s.replace(/^"|"$/g,"").replace(/""/g,'"'));
      const [date, score, emotion, note] = cols;
      if(!date) continue;
      entries.push({ id: crypto.randomUUID(), date, score:+score||3, emotion, note, createdAt: Date.now() });
    }
    saveEntries(entries);
    renderEntries();
    showReminderIfNeeded();
    showToast("CSV içe aktarıldı");
  };
  reader.readAsText(file, "utf-8");
}
document.getElementById("importCsv")?.addEventListener("change", (e)=>{
  if(e.target.files && e.target.files[0]) importCsv(e.target.files[0]);
});

// ========== Tümünü Sil ==========
document.getElementById("clearAll")?.addEventListener("click", ()=>{
  if(confirm("Tüm kayıtları silmek istiyor musun?")){
    localStorage.removeItem(STORAGE_KEY);
    renderEntries();
    showReminderIfNeeded();
    showToast("Hepsi silindi");
  }
});

// ========== Hatırlatma ==========
function showReminderIfNeeded(){
  const wrap = document.getElementById("reminder");
  if(!wrap) return;
  const today = new Date().toISOString().slice(0,10);
  const hasEntryToday = loadEntries().some(e => e.date === today);
  if(hasEntryToday){ wrap.classList.add("hidden"); return; }
  wrap.classList.remove("hidden");
  document.getElementById("addNow").onclick = ()=>{
    document.getElementById("date").value = today;
    document.getElementById("note").focus();
    wrap.classList.add("hidden");
  };
  document.getElementById("dismissRem").onclick = ()=> wrap.classList.add("hidden");
}

// ========== Başlangıç ==========
document.getElementById("date")?.setAttribute("value", new Date().toISOString().slice(0,10));
renderEntries();
showReminderIfNeeded();
