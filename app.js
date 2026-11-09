/* e-DBR Gizi — frontend (GitHub Pages) */
const API = window.APP_CONFIG.API_URL;
const KND = { B: 'Baik', RR: 'Rusak Ringan', RB: 'Rusak Berat', BD: 'Belum Dicek' };
const ROLE = { super: 'Super Admin', pengurus: 'Pengurus Barang', pj: 'PJ Ruangan' };
let D = null;
let TOKEN = store('get', 'edbr_token') || '';
let CUR = 'dashboard';
const Q = { barang: '', barangR: '', dbrR: '', cekR: '' };

function store(op, k, v) { try { if (op === 'get') return localStorage.getItem(k); if (op === 'set') localStorage.setItem(k, v); else localStorage.removeItem(k); } catch (e) { return null; } }

/* ================= API ================= */
async function call(action, payload = {}, silent = false) {
  if (!silent) busy(true, action === 'bootstrap' ? 'Memuat data…' : action === 'login' ? 'Masuk…' : 'Menyimpan…');
  try {
    const r = await fetch(API, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify({ action, token: TOKEN, ...payload }) });
    const j = await r.json();
    if (!j.ok) {
      if (j.code === 'AUTH') { logoutLocal(); }
      throw new Error(j.msg || 'Terjadi kesalahan');
    }
    if (j.data && j.data.me) D = j.data;
    return j;
  } catch (e) {
    const net = /fetch|NetworkError|JSON|Unexpected token/i.test(e.message);
    if (API.includes('GANTI_DENGAN')) toast('URL API belum diisi di config.js');
    else toast(net ? 'Server tidak merespons. Cek URL API di config.js dan akses Web App harus "Siapa saja".' : e.message);
    console.error('[e-DBR] ' + action + ':', e);
    throw e;
  } finally { if (!silent) busy(false); }
}
async function act(action, payload, after) {
  try { const j = await call(action, payload); closeM(); go(after || CUR); if (j.msg) toast(j.msg); return true; } catch (e) { return false; }
}

/* ================= AUTH ================= */
async function doLogin() {
  try {
    const j = await call('login', { username: val('lu'), password: document.getElementById('lp').value });
    TOKEN = j.token; store('set', 'edbr_token', TOKEN); D = j.data; showApp();
  } catch (e) { }
}
async function doLogout() {
  try { await call('logout', {}, true); } catch (e) { }
  logoutLocal();
}
function logoutLocal() {
  TOKEN = ''; D = null; store('del', 'edbr_token');
  document.getElementById('appView').style.display = 'none';
  document.getElementById('loginView').style.display = '';
}
function showApp() {
  document.getElementById('loginView').style.display = 'none';
  document.getElementById('appView').style.display = '';
  go(location.hash.slice(1) || 'dashboard');
}
async function refresh() { try { await call('bootstrap'); go(CUR); toast('Data diperbarui'); } catch (e) { } }
function formPass() {
  openM(`<h2>Ganti Password</h2>
   <div class="fld"><label>Password lama</label><input id="pl" type="password"></div>
   <div class="fld"><label>Password baru (min. 6 karakter)</label><input id="pb" type="password"></div>
   <div class="fld"><label>Ulangi password baru</label><input id="pb2" type="password"></div>
   <div class="row" style="justify-content:flex-end"><button class="btn g" onclick="closeM()">Batal</button><button class="btn p" onclick="savePass()">Simpan</button></div>`);
}
function savePass() {
  const b = document.getElementById('pb').value;
  if (b !== document.getElementById('pb2').value) return toast('Ulangan password baru tidak sama');
  act('gantiPassword', { lama: document.getElementById('pl').value, baru: b });
}

/* ================= HELPERS ================= */
const me = () => D.me;
const room = id => D.rooms.find(r => r.id === id);
const user = id => D.users.find(u => u.id === id);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const chip = k => `<span class="chip k-${k}">${KND[k] || k}</span>`;
const fmtD = d => { if (!d) return '—'; const x = new Date(String(d).slice(0, 10) + 'T00:00'); return isNaN(x) ? d : x.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }); };
const myRooms = () => me().role === 'pj' ? D.rooms.filter(r => r.pjId === me().id) : D.rooms;
const isAdmin = () => ['super', 'pengurus'].includes(me().role);
const val = id => (document.getElementById(id)?.value || '').trim();
const units = list => list.reduce((a, b) => a + (+b.jumlah || 0), 0);
const roomOpts = (sel, list = myRooms(), all = false) => (all ? '<option value="">Semua ruangan</option>' : '') + list.map(r => `<option value="${r.id}" ${r.id === sel ? 'selected' : ''}>${esc(r.kode)} — ${esc(r.nama)}</option>`).join('');
const publicUrl = r => new URL('ruang.html?k=' + encodeURIComponent(r.kode), location.href).href;
function busy(on, tx) { document.getElementById('busyTx').textContent = tx || ''; document.getElementById('busy').classList.toggle('on', on); }
function toast(m) { const t = document.getElementById('toast'); t.textContent = m; t.classList.add('on'); clearTimeout(t._h); t._h = setTimeout(() => t.classList.remove('on'), 2800); }
function openM(h) { document.getElementById('modal').innerHTML = h; document.getElementById('ov').classList.add('on'); }
function closeM() { document.getElementById('ov').classList.remove('on'); }
function askConfirm(msg, fn) { window._cf = fn; openM(`<h2>Konfirmasi</h2><p>${msg}</p><div class="row" style="justify-content:flex-end"><button class="btn g" onclick="closeM()">Batal</button><button class="btn d" onclick="_cf()">Ya, lanjutkan</button></div>`); }
function toggleSide(o) { document.getElementById('side').classList.toggle('open', o); document.getElementById('scrim').classList.toggle('on', o); }
function downloadCSV(name, rows) {
  const csv = '﻿' + rows.map(r => r.map(c => '"' + String(c ?? '').replace(/"/g, '""') + '"').join(';')).join('\r\n');
  const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' })); a.download = name; a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}

/* ================= ICONS ================= */
const IC = {
  dash: '<rect x="3" y="3" width="7" height="9" rx="2"/><rect x="14" y="3" width="7" height="5" rx="2"/><rect x="14" y="12" width="7" height="9" rx="2"/><rect x="3" y="16" width="7" height="5" rx="2"/>',
  room: '<path d="M3 21h18M5 21V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16"/><path d="M14 12h.01"/>',
  box: '<path d="M21 8 12 3 3 8v8l9 5 9-5z"/><path d="m3 8 9 5 9-5M12 13v8"/>',
  doc: '<path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><path d="M14 3v6h6M8 13h8M8 17h5"/>',
  check: '<path d="M9 11l3 3 8-8"/><path d="M20 12v7a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h9"/>',
  swap: '<path d="M7 7h13l-4-4M17 17H4l4 4"/>',
  warn: '<path d="M12 3 2 20h20z"/><path d="M12 10v4M12 17h.01"/>',
  chart: '<path d="M3 3v18h18"/><path d="M7 15v3M12 10v8M17 6v12"/>',
  users: '<circle cx="9" cy="8" r="4"/><path d="M2 21a7 7 0 0 1 14 0M17 4a4 4 0 0 1 0 8M22 21a7 7 0 0 0-4-6.3"/>',
  gear: '<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M2 12h3M19 12h3M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1"/>',
  plus: '<path d="M12 5v14M5 12h14"/>', edit: '<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/>',
  trash: '<path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6"/>',
  qr: '<rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><path d="M14 14h3v3h-3zM20 14v.01M14 20h.01M17 20h4v-3"/>',
  print: '<path d="M6 9V3h12v6"/><rect x="3" y="9" width="18" height="8" rx="2"/><path d="M6 14h12v7H6z"/>',
  dl: '<path d="M12 3v12M7 10l5 5 5-5M4 21h16"/>'
};
const ic = (k, st = '') => `<svg class="i" viewBox="0 0 24 24" style="${st}">${IC[k]}</svg>`;

/* ================= NAV ================= */
const MENU = [
  { k: 'dashboard', t: 'Dashboard', i: 'dash', r: ['super', 'pengurus', 'pj'], sub: 'Ringkasan kondisi sarpras Jurusan Gizi' },
  { sec: 'Data Master', r: ['super', 'pengurus'] },
  { k: 'ruangan', t: 'Ruangan', i: 'room', r: ['super', 'pengurus'], sub: 'Daftar ruangan & penanggung jawab' },
  { k: 'barang', t: 'Barang BMN', i: 'box', r: ['super', 'pengurus'], sub: 'Seluruh barang dan penempatannya' },
  { sec: 'Layanan', r: ['super', 'pengurus', 'pj'] },
  { k: 'dbr', t: 'Cetak DBR', i: 'doc', r: ['super', 'pengurus', 'pj'], sub: 'Daftar Barang Ruangan siap cetak' },
  { k: 'cek', t: 'Cek Kondisi', i: 'check', r: ['super', 'pengurus', 'pj'], sub: 'Perbarui kondisi barang per ruangan' },
  { k: 'mutasi', t: 'Mutasi Barang', i: 'swap', r: ['super', 'pengurus', 'pj'], sub: 'Perpindahan barang antarruangan' },
  { k: 'rusak', t: 'Laporan Kerusakan', i: 'warn', r: ['super', 'pengurus', 'pj'], sub: 'Laporan dan tindak lanjut kerusakan' },
  { k: 'rekap', t: 'Rekap & Penghapusan', i: 'chart', r: ['super', 'pengurus'], sub: 'Rekap kondisi dan calon usulan penghapusan' },
  { sec: 'Sistem', r: ['super'] },
  { k: 'pengguna', t: 'Pengguna', i: 'users', r: ['super'], sub: 'Akun pengurus barang & PJ ruangan' },
  { k: 'pengaturan', t: 'Pengaturan', i: 'gear', r: ['super'], sub: 'Identitas satker & penandatangan DBR' }
];
function badge(k) {
  if (k === 'mutasi') return isAdmin() ? D.mutasi.filter(m => m.status === 'wait').length : 0;
  if (k === 'rusak') return D.rusak.filter(m => m.status !== 'Selesai').length;
  return 0;
}
function renderNav() {
  const u = me();
  document.getElementById('nav').innerHTML = MENU.filter(m => m.r.includes(u.role)).map(m => m.sec ? `<div class="sec">${m.sec}</div>` :
    `<a class="${CUR === m.k ? 'on' : ''}" onclick="go('${m.k}')">${ic(m.i)}${m.t}${badge(m.k) ? `<span class="badge">${badge(m.k)}</span>` : ''}</a>`).join('');
  document.getElementById('av').textContent = u.nama.replace(/[^A-Za-z ]/g, '').split(' ').filter(Boolean).slice(0, 2).map(s => s[0]).join('').toUpperCase();
  document.getElementById('hi').textContent = 'Hai, ' + u.nama.split(',')[0] + '! 👋';
  document.getElementById('rl').textContent = ROLE[u.role];
  document.getElementById('gsearch').style.visibility = isAdmin() ? 'visible' : 'hidden';
}
function go(k) {
  const m = MENU.find(x => x.k === k);
  if (!m || !m.r.includes(me().role)) k = 'dashboard';
  CUR = k; const mm = MENU.find(x => x.k === k);
  if (location.hash.slice(1) !== k) history.replaceState(null, '', '#' + k);
  document.getElementById('ttl').textContent = mm.t;
  document.getElementById('ttlsub').textContent = mm.sub;
  renderNav(); document.getElementById('view').innerHTML = V[k](); toggleSide(false);
  if (k === 'dbr') drawPaperQR();
}

/* ================= VIEWS ================= */
const V = {};
V.dashboard = () => {
  const rs = myRooms(), ids = rs.map(r => r.id), its = D.items.filter(i => ids.includes(i.ruangId));
  const unit = k => units(its.filter(i => !k || i.kondisi === k)); const tot = unit() || 1;
  const st = [['Ruangan', rs.length, 'room', 'linear-gradient(145deg,#11A39C,#00535C)'], ['Jenis Barang', its.length, 'box', 'linear-gradient(145deg,#5CC9C2,#11A39C)'],
  ['Total Unit', unit(), 'chart', 'linear-gradient(145deg,#B9D85A,#7FA020)'], ['Rusak Berat', unit('RB'), 'warn', 'linear-gradient(145deg,#EE7F7A,#C2403B)']];
  return `<div class="grid g4">${st.map(s => `<div class="card stat"><div class="ic" style="background:${s[3]}">${ic(s[2])}</div><div class="v">${s[1]}</div><div class="l">${s[0]}</div></div>`).join('')}</div>
  <div class="grid g2" style="margin-top:16px">
   <div class="card"><h3>${ic('room', 'color:var(--tq)')}Status Ruangan</h3><div class="tw"><table class="t"><tr><th>Kode</th><th>Ruangan</th><th>Unit</th><th>Cek terakhir</th></tr>
    ${rs.map(r => `<tr><td><b>${esc(r.kode)}</b></td><td>${esc(r.nama)}<div class="muted">PJ: ${esc(user(r.pjId)?.nama || '—')}</div></td><td>${units(D.items.filter(i => i.ruangId === r.id))}</td>
     <td>${r.lastCek ? fmtD(r.lastCek) : '<span class="chip k-RR">Belum dicek</span>'}</td></tr>`).join('') || '<tr><td colspan=4 class="empty">Belum ada ruangan</td></tr>'}</table></div></div>
   <div class="card"><h3>${ic('chart', 'color:var(--tq)')}Kondisi Barang (unit)</h3>
    ${['B', 'RR', 'RB', 'BD'].map(k => { const n = unit(k), p = Math.round(n / tot * 100); const c = { B: 'var(--b)', RR: 'var(--rr)', RB: 'var(--rb)', BD: 'var(--bd)' }[k];
      return `<div class="row" style="justify-content:space-between;font-size:13px"><b>${KND[k]}</b><span class="muted">${n} unit · ${p}%</span></div><div class="bar"><i style="width:${p}%;background:${c}"></i></div>`; }).join('')}
    <h3 style="margin-top:8px">${ic('check', 'color:var(--tq)')}Aktivitas Terbaru</h3>
    ${D.logs.slice(0, 6).map(l => `<div class="act"><span class="dot"></span><div>${esc(l.m)}<div class="muted">${esc(l.nama)} · ${esc(l.t)}</div></div></div>`).join('') || '<div class="muted">Belum ada aktivitas</div>'}
   </div></div>`;
};

/* ---- Ruangan ---- */
V.ruangan = () => `<div class="card"><div class="row" style="justify-content:space-between;margin-bottom:6px"><span class="muted">${D.rooms.length} ruangan terdaftar</span>
  <button class="btn p" onclick="formRoom()">${ic('plus')}Tambah Ruangan</button></div>
  <div class="tw"><table class="t"><tr><th>Kode</th><th>Nama Ruangan</th><th>Gedung/Lt</th><th>PJ Ruangan</th><th>Jenis brg</th><th></th></tr>
  ${D.rooms.map(r => `<tr><td><b>${esc(r.kode)}</b></td><td>${esc(r.nama)}</td><td>${esc(r.gedung) || '—'} / ${esc(r.lantai) || '—'}</td><td>${esc(user(r.pjId)?.nama || '—')}</td>
   <td>${D.items.filter(i => i.ruangId === r.id).length}</td>
   <td style="white-space:nowrap"><button class="btn g s" onclick="Q.dbrR='${r.id}';go('dbr')">${ic('doc')}DBR</button>
   <button class="btn g s" onclick="showQR('${r.id}')">${ic('qr')}</button><button class="btn g s" onclick="formRoom('${r.id}')">${ic('edit')}</button>
   <button class="btn d s" onclick="delRoom('${r.id}')">${ic('trash')}</button></td></tr>`).join('') || '<tr><td colspan=6 class="empty">Belum ada ruangan</td></tr>'}</table></div></div>`;
function formRoom(id) {
  const r = id ? room(id) : { kode: '', nama: '', gedung: '', lantai: '', pjId: '' };
  openM(`<h2>${id ? 'Ubah' : 'Tambah'} Ruangan</h2><div class="f2">
   <div class="fld"><label>Kode Ruangan</label><input id="fk" value="${esc(r.kode)}" placeholder="mis. B.1.6"></div>
   <div class="fld"><label>Nama Ruangan</label><input id="fn" value="${esc(r.nama)}" placeholder="mis. Ruang Kaprodi D3"></div>
   <div class="fld"><label>Gedung</label><input id="fg" value="${esc(r.gedung)}"></div>
   <div class="fld"><label>Lantai</label><input id="fl" value="${esc(r.lantai)}"></div></div>
   <div class="fld"><label>Penanggung Jawab Ruangan</label><select id="fp"><option value="">— pilih —</option>${D.users.filter(u => u.role === 'pj' && u.aktif !== 'tidak').map(u => `<option value="${u.id}" ${u.id === r.pjId ? 'selected' : ''}>${esc(u.nama)}</option>`).join('')}</select>
   <span class="muted">Akun PJ ditambahkan super admin lewat menu Pengguna.</span></div>
   <div class="row" style="justify-content:flex-end"><button class="btn g" onclick="closeM()">Batal</button><button class="btn p" onclick="saveRoom('${id || ''}')">Simpan</button></div>`);
}
function saveRoom(id) { act('saveRoom', { room: { id, kode: val('fk'), nama: val('fn'), gedung: val('fg'), lantai: val('fl'), pjId: val('fp') } }); }
function delRoom(id) { askConfirm('Hapus ruangan ini?', () => act('delRoom', { id })); }
function showQR(id) {
  const r = room(id), url = publicUrl(r);
  openM(`<h2>QR Pintu — ${esc(r.kode)}</h2><div style="display:grid;place-items:center;padding:10px"><div id="qrb" style="background:#fff;padding:14px;border-radius:16px"></div>
   <p style="text-align:center;font-weight:700;margin:12px 0 4px">${esc(r.nama)}</p><p class="muted" style="text-align:center;word-break:break-all">${esc(url)}</p>
   ${D.settings.qrPublik !== 'ya' ? '<div class="note">Tampilan publik sedang nonaktif (Pengaturan).</div>' : ''}</div>
   <div class="row" style="justify-content:flex-end"><button class="btn g" onclick="navigator.clipboard.writeText('${esc(url)}').then(()=>toast('Link disalin'))">Salin link</button><button class="btn p" onclick="closeM()">Tutup</button></div>`);
  try { new QRCode(document.getElementById('qrb'), { text: url, width: 200, height: 200, colorDark: '#00535C' }); } catch (e) { document.getElementById('qrb').textContent = 'QR gagal dimuat'; }
}

/* ---- Barang ---- */
V.barang = () => {
  const q = Q.barang.toLowerCase();
  const its = D.items.filter(i => (!Q.barangR || i.ruangId === Q.barangR) && (!q || (i.nama + ' ' + i.merk + ' ' + i.kode + ' ' + i.nup).toLowerCase().includes(q)));
  return `<div class="card"><div class="row" style="margin-bottom:6px">
   <select class="inp" onchange="Q.barangR=this.value;go('barang')">${roomOpts(Q.barangR, D.rooms, true)}</select>
   <input class="inp" placeholder="Cari nama/merk/kode/NUP" value="${esc(Q.barang)}" onkeydown="if(event.key==='Enter'){Q.barang=this.value;go('barang')}" style="flex:1;min-width:160px">
   <button class="btn g" onclick="exportBarang()">${ic('dl')}Unduh</button>
   <button class="btn p" onclick="formItem()">${ic('plus')}Tambah Barang</button></div>
   <div class="note">Kode Barang dan NUP diambil dari SIMAK-BMN/SAKTI. Kalau satu jenis barang kondisinya berbeda (mis. 49 kursi baik, 1 rusak), catat sebagai dua baris terpisah.</div>
   <div class="tw"><table class="t"><tr><th>Nama Barang</th><th>Merk/Type</th><th>Kode / NUP</th><th>Tahun</th><th>Jml</th><th>Kondisi</th><th>Ruangan</th><th></th></tr>
   ${its.map(i => `<tr><td><b>${esc(i.nama)}</b>${i.ket ? `<div class="muted">${esc(i.ket)}</div>` : ''}</td><td>${esc(i.merk) || '—'}</td>
    <td>${i.kode || i.nup ? esc(i.kode) + ' / ' + esc(i.nup) : '<span class="chip k-RR">belum diisi</span>'}</td><td>${esc(i.tahun) || '—'}</td><td>${i.jumlah}</td><td>${chip(i.kondisi)}</td>
    <td>${esc(room(i.ruangId)?.kode || '—')}</td><td style="white-space:nowrap"><button class="btn g s" onclick="formItem('${i.id}')">${ic('edit')}</button>
    <button class="btn d s" onclick="delItem('${i.id}')">${ic('trash')}</button></td></tr>`).join('') || '<tr><td colspan=8 class="empty">Tidak ada barang</td></tr>'}</table></div></div>`;
};
function formItem(id) {
  if (!D.rooms.length) return toast('Tambahkan ruangan dulu');
  const i = id ? D.items.find(x => x.id === id) : { ruangId: Q.barangR || D.rooms[0].id, nama: '', merk: '', kode: '', nup: '', tahun: '', jumlah: 1, kondisi: 'B', ket: '' };
  openM(`<h2>${id ? 'Ubah' : 'Tambah'} Barang</h2>
   <div class="fld"><label>Ruangan</label><select id="xr">${roomOpts(i.ruangId, D.rooms)}</select></div>
   <div class="f2"><div class="fld"><label>Nama Barang</label><input id="xn" value="${esc(i.nama)}"></div>
   <div class="fld"><label>Merk/Type</label><input id="xm" value="${esc(i.merk)}"></div>
   <div class="fld"><label>Kode Barang (SAKTI)</label><input id="xk" value="${esc(i.kode)}" placeholder="mis. 3.05.02.01.002"></div>
   <div class="fld"><label>NUP</label><input id="xu" value="${esc(i.nup)}"></div>
   <div class="fld"><label>Tahun Perolehan</label><input id="xt" value="${esc(i.tahun)}" inputmode="numeric"></div>
   <div class="fld"><label>Jumlah</label><input id="xj" type="number" min="1" value="${i.jumlah}"></div></div>
   <div class="fld"><label>Kondisi</label><select id="xc">${Object.keys(KND).map(k => `<option value="${k}" ${k === i.kondisi ? 'selected' : ''}>${KND[k]}</option>`).join('')}</select></div>
   <div class="fld"><label>Keterangan</label><input id="xe" value="${esc(i.ket)}" placeholder="pinjaman/titipan, catatan, dll."></div>
   <div class="row" style="justify-content:flex-end"><button class="btn g" onclick="closeM()">Batal</button><button class="btn p" onclick="saveItem('${id || ''}')">Simpan</button></div>`);
}
function saveItem(id) { act('saveItem', { item: { id, ruangId: val('xr'), nama: val('xn'), merk: val('xm'), kode: val('xk'), nup: val('xu'), tahun: val('xt'), jumlah: val('xj'), kondisi: val('xc'), ket: val('xe') } }); }
function delItem(id) { askConfirm('Hapus barang ini dari daftar?', () => act('delItem', { id })); }
function exportBarang() {
  downloadCSV('Daftar_Barang_Jurusan_Gizi.csv', [['Kode Ruang', 'Nama Ruang', 'Nama Barang', 'Merk/Type', 'Kode Barang', 'NUP', 'Tahun', 'Jumlah', 'Kondisi', 'Keterangan'],
  ...D.items.map(i => [room(i.ruangId)?.kode, room(i.ruangId)?.nama, i.nama, i.merk, i.kode, i.nup, i.tahun, i.jumlah, KND[i.kondisi], i.ket])]);
}

/* ---- DBR ---- */
V.dbr = () => {
  const rs = myRooms(); if (!rs.length) return '<div class="card empty">Anda belum ditugaskan ke ruangan mana pun.</div>';
  if (!rs.find(r => r.id === Q.dbrR)) Q.dbrR = rs[0].id;
  const r = room(Q.dbrR), st = D.settings, its = D.items.filter(i => i.ruangId === r.id), n = Math.max(15, its.length);
  const pj = user(r.pjId);
  let rows = '';
  for (let k = 0; k < n; k++) {
    const i = its[k];
    rows += i ? `<tr><td class="c">${k + 1}</td><td>${esc(i.nama)}</td><td class="c">${esc(i.merk)}</td><td class="c">${esc(i.kode)}</td><td class="c">${esc(i.nup)}</td><td class="c">${esc(i.tahun)}</td><td class="c">${i.jumlah}</td><td class="c">${i.kondisi === 'BD' ? '' : KND[i.kondisi]}</td></tr>`
      : `<tr><td class="c">${k + 1}</td><td></td><td></td><td></td><td></td><td></td><td></td><td></td></tr>`;
  }
  return `<div class="card noprint" style="margin-bottom:16px"><div class="row"><select class="inp" onchange="Q.dbrR=this.value;go('dbr')">${roomOpts(Q.dbrR, rs)}</select>
   <button class="btn p" onclick="window.print()">${ic('print')}Cetak / Simpan PDF</button><span class="muted">Kondisi "Belum Dicek" dikosongkan di cetakan. Pilih kertas A4, orientasi tegak.</span></div></div>
  <div class="paper">
   <div class="hd"><span>${esc(st.instansi)}</span><span>DAFTAR BARANG RUANGAN ( DBR )</span></div>
   ${st.qrPublik === 'ya' ? `<div class="qrp"><div id="pqr" data-url="${esc(publicUrl(r))}"></div>Pindai untuk<br>DBR terkini</div>` : ''}
   <div class="meta"><div><span>Nomor</span><span>: DBR/${esc(r.kode)}/${esc(st.tahun)}</span></div><div><span>Tahun</span><span>: ${esc(st.tahun)}</span></div>
    <div><span>Ruang</span><span>: ${esc(r.kode)} — ${esc(r.nama)}</span></div><div><span>K.Lokasi</span><span>: ${esc(st.kodeLokasi)}</span></div></div>
   <table><tr><th rowspan="2" style="width:30px">No</th><th rowspan="2">Nama Barang</th><th colspan="4">Tanda Pengenal Barang</th><th rowspan="2" style="width:40px">Jml</th><th rowspan="2" style="width:80px">Kondisi</th></tr>
    <tr><th>Merk/Type</th><th>Kode Barang</th><th>NUP</th><th style="width:50px">Tahun</th></tr>${rows}</table>
   <div class="warn">TIDAK DIBENARKAN MEMINDAHKAN BARANG - BARANG YANG ADA DI DAFTAR INI TANPA<br>SEPENGETAHUAN PENGURUS BARANG DAN PENANGGUNG JAWAB RUANGAN INI</div>
   <div class="sig"><div>Pengurus Barang<div class="nm">${esc(st.pengurusNama)}</div><div class="nip">NIP. ${esc(st.pengurusNip) || '..............................'}</div></div>
    <div class="r"><div>Penanggung Jawab Ruangan<div class="nm">${esc(pj?.nama || '..............................')}</div><div class="nip">NIP. ${esc(pj?.nip) || '..............................'}</div></div></div></div>
   <div class="mid">Mengetahui/Menyetujui;<br>${esc(st.mengetahuiJab)}<div class="nm">${esc(st.mengetahuiNama)}</div><div class="nip">NIP. ${esc(st.mengetahuiNip) || '..............................'}</div></div>
   <div class="cat"><u>Catatan :</u><br>Kondisi barang diisi Baik / Rusak Ringan / Rusak Berat. Barang pinjaman/titipan supaya diberi catatan di jalur keterangan.</div>
  </div>`;
};
function drawPaperQR() {
  const el = document.getElementById('pqr'); if (!el) return;
  try { new QRCode(el, { text: el.dataset.url, width: 156, height: 156, colorDark: '#000000' }); } catch (e) { }
}

/* ---- Cek kondisi ---- */
V.cek = () => {
  const rs = myRooms(); if (!rs.length) return '<div class="card empty">Anda belum ditugaskan ke ruangan mana pun.</div>';
  if (!rs.find(r => r.id === Q.cekR)) Q.cekR = rs[0].id;
  const r = room(Q.cekR), its = D.items.filter(i => i.ruangId === r.id);
  return `<div class="card"><div class="row" style="margin-bottom:8px"><select class="inp" onchange="Q.cekR=this.value;go('cek')">${roomOpts(Q.cekR, rs)}</select>
   <span class="muted">Pemeriksaan terakhir: <b>${r.lastCek ? fmtD(r.lastCek) : 'belum pernah'}</b></span></div>
   <div class="tw"><table class="t"><tr><th>Barang</th><th>Jml</th><th>Kondisi</th><th>Catatan</th></tr>
   ${its.map(i => `<tr><td><b>${esc(i.nama)}</b><div class="muted">${esc(i.merk)}</div></td><td>${i.jumlah}</td>
    <td><select class="inp" id="ck_${i.id}">${Object.keys(KND).map(k => `<option value="${k}" ${k === i.kondisi ? 'selected' : ''}>${KND[k]}</option>`).join('')}</select></td>
    <td><input class="inp" id="ce_${i.id}" value="${esc(i.ket)}" style="width:100%;min-width:140px"></td></tr>`).join('') || '<tr><td colspan=4 class="empty">Ruangan ini belum berisi barang</td></tr>'}</table></div>
   <p class="muted">Kalau sebagian unit rusak (mis. 2 dari 49 kursi), laporkan lewat menu Laporan Kerusakan atau minta Pengurus Barang memecah barisnya.</p>
   <div class="row" style="justify-content:flex-end;margin-top:8px"><button class="btn l" onclick="saveCek()">${ic('check')}Simpan Hasil Pemeriksaan</button></div></div>`;
};
function saveCek() {
  const its = D.items.filter(i => i.ruangId === Q.cekR);
  act('saveCek', { ruangId: Q.cekR, updates: its.map(i => ({ id: i.id, kondisi: val('ck_' + i.id), ket: val('ce_' + i.id) })) });
}

/* ---- Mutasi ---- */
V.mutasi = () => {
  const sl = { wait: ['Menunggu', 's-wait'], ok: ['Disetujui', 's-ok'], no: ['Ditolak', 's-no'] };
  return `<div class="card"><div class="row" style="justify-content:space-between;margin-bottom:6px"><span class="muted">Mutasi diajukan PJ ruangan / pengurus, disetujui Pengurus Barang.</span>
   <button class="btn p" onclick="formMut()">${ic('plus')}Ajukan Mutasi</button></div>
   <div class="tw"><table class="t"><tr><th>Tanggal</th><th>Barang</th><th>Dari → Ke</th><th>Jml</th><th>Alasan</th><th>Status</th><th></th></tr>
   ${D.mutasi.map(m => `<tr><td>${fmtD(m.t)}</td><td><b>${esc(m.nama)}</b><div class="muted">oleh ${esc(user(m.by)?.nama || '—')}</div></td><td>${esc(room(m.dari)?.kode || '?')} → ${esc(room(m.ke)?.kode || '?')}</td><td>${m.jumlah}</td>
    <td>${esc(m.alasan)}</td><td><span class="chip ${sl[m.status]?.[1]}">${sl[m.status]?.[0] || m.status}</span></td>
    <td style="white-space:nowrap">${m.status === 'wait' && isAdmin() ? `<button class="btn l s" onclick="act('prosesMutasi',{id:'${m.id}',setuju:true})">Setujui</button> <button class="btn d s" onclick="act('prosesMutasi',{id:'${m.id}',setuju:false})">Tolak</button>` : ''}</td></tr>`).join('') || '<tr><td colspan=7 class="empty">Belum ada pengajuan mutasi</td></tr>'}</table></div></div>`;
};
function formMut() {
  const ids = myRooms().map(r => r.id), its = D.items.filter(i => ids.includes(i.ruangId));
  if (!its.length) return toast('Tidak ada barang yang bisa dimutasi');
  openM(`<h2>Ajukan Mutasi Barang</h2>
   <div class="fld"><label>Barang (ruangan asal)</label><select id="mb">${its.map(i => `<option value="${i.id}">${esc(room(i.ruangId).kode)} · ${esc(i.nama)} ${esc(i.merk)} (${i.jumlah} unit, ${KND[i.kondisi]})</option>`).join('')}</select></div>
   <div class="f2"><div class="fld"><label>Ruangan tujuan</label><select id="mk">${roomOpts('', D.rooms)}</select></div>
   <div class="fld"><label>Jumlah dipindah</label><input id="mj" type="number" min="1" value="1"></div></div>
   <div class="fld"><label>Alasan</label><input id="ma" placeholder="mis. kebutuhan ruang rapat"></div>
   <div class="row" style="justify-content:flex-end"><button class="btn g" onclick="closeM()">Batal</button><button class="btn p" onclick="act('ajukanMutasi',{itemId:val('mb'),ke:val('mk'),jumlah:val('mj'),alasan:val('ma')})">Ajukan</button></div>`);
}

/* ---- Kerusakan ---- */
V.rusak = () => {
  const nx = { Dilaporkan: 'Ditangani', Ditangani: 'Selesai' }, cl = { Dilaporkan: 's-no', Ditangani: 's-wait', Selesai: 's-ok' };
  return `<div class="card"><div class="row" style="justify-content:space-between;margin-bottom:6px"><span class="muted">Laporan kerusakan ditindaklanjuti Pengurus Barang.</span>
   <button class="btn p" onclick="formRusak()">${ic('plus')}Lapor Kerusakan</button></div>
   <div class="tw"><table class="t"><tr><th>Tanggal</th><th>Barang</th><th>Ruangan</th><th>Uraian</th><th>Status</th><th></th></tr>
   ${D.rusak.map(x => `<tr><td>${fmtD(x.t)}</td><td><b>${esc(x.nama)}</b> ${chip(x.tingkat)}</td><td>${esc(room(x.ruangId)?.kode || '—')}</td>
    <td>${esc(x.uraian)}${x.foto ? `<div><a href="${esc(x.foto)}" target="_blank" rel="noopener">Lihat foto</a></div>` : ''}</td>
    <td><span class="chip ${cl[x.status]}">${x.status}</span></td><td>${isAdmin() && nx[x.status] ? `<button class="btn g s" onclick="act('prosesRusak',{id:'${x.id}'})">→ ${nx[x.status]}</button>` : ''}</td></tr>`).join('') || '<tr><td colspan=6 class="empty">Belum ada laporan kerusakan</td></tr>'}</table></div></div>`;
};
function formRusak() {
  const ids = myRooms().map(r => r.id), its = D.items.filter(i => ids.includes(i.ruangId));
  if (!its.length) return toast('Tidak ada barang di ruangan Anda');
  openM(`<h2>Lapor Kerusakan</h2><div class="fld"><label>Barang</label><select id="rb">${its.map(i => `<option value="${i.id}">${esc(room(i.ruangId).kode)} · ${esc(i.nama)} ${esc(i.merk)}</option>`).join('')}</select></div>
   <div class="fld"><label>Tingkat kerusakan</label><select id="rk"><option value="RR">Rusak Ringan</option><option value="RB">Rusak Berat</option></select></div>
   <div class="fld"><label>Uraian kerusakan</label><textarea id="ru" rows="3" placeholder="mis. kaki meja patah, kipas tidak berputar"></textarea></div>
   <div class="fld"><label>Foto (opsional)</label><input id="rf" type="file" accept="image/*" capture="environment"></div>
   <div class="row" style="justify-content:flex-end"><button class="btn g" onclick="closeM()">Batal</button><button class="btn p" onclick="saveRusak()">Kirim Laporan</button></div>`);
}
async function saveRusak() {
  const f = document.getElementById('rf').files[0];
  let foto = null;
  if (f) { try { busy(true); foto = await shrink(f); } catch (e) { toast('Foto gagal diproses'); } finally { busy(false); } }
  act('laporRusak', { itemId: val('rb'), tingkat: val('rk'), uraian: val('ru'), foto });
}
function shrink(file, max = 1280) {
  return new Promise((res, rej) => {
    const img = new Image(), url = URL.createObjectURL(file);
    img.onload = () => {
      const s = Math.min(1, max / Math.max(img.width, img.height)), c = document.createElement('canvas');
      c.width = Math.round(img.width * s); c.height = Math.round(img.height * s);
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height); URL.revokeObjectURL(url);
      res({ type: 'image/jpeg', data: c.toDataURL('image/jpeg', 0.8).split(',')[1] });
    };
    img.onerror = rej; img.src = url;
  });
}

/* ---- Rekap ---- */
V.rekap = () => {
  const rb = D.items.filter(i => i.kondisi === 'RB');
  return `<div class="grid g2e"><div class="card"><h3>${ic('chart', 'color:var(--tq)')}Rekap Kondisi per Ruangan (unit)</h3><div class="tw"><table class="t">
   <tr><th>Ruangan</th><th>B</th><th>RR</th><th>RB</th><th>Blm</th></tr>
   ${D.rooms.map(r => { const f = k => units(D.items.filter(i => i.ruangId === r.id && i.kondisi === k));
     return `<tr><td><b>${esc(r.kode)}</b><div class="muted">${esc(r.nama)}</div></td><td>${f('B')}</td><td>${f('RR')}</td><td>${f('RB')}</td><td>${f('BD')}</td></tr>`; }).join('')}</table></div></div>
   <div class="card"><h3>${ic('warn', 'color:var(--rb)')}Calon Usulan Penghapusan (Rusak Berat)</h3><div class="tw"><table class="t"><tr><th>Barang</th><th>Kode/NUP</th><th>Ruangan</th><th>Jml</th></tr>
   ${rb.map(i => `<tr><td><b>${esc(i.nama)}</b> ${esc(i.merk)}</td><td>${esc(i.kode) || '—'} / ${esc(i.nup) || '—'}</td><td>${esc(room(i.ruangId)?.kode)}</td><td>${i.jumlah}</td></tr>`).join('') || '<tr><td colspan=4 class="empty">Tidak ada barang rusak berat</td></tr>'}</table></div>
   <div class="row" style="justify-content:space-between;margin-top:8px"><span class="muted">Bahan awal usulan penghapusan BMN. Pastikan Kode Barang & NUP lengkap.</span>
   <button class="btn g s" onclick="exportRB()">${ic('dl')}Unduh</button></div></div></div>`;
};
function exportRB() {
  downloadCSV('Calon_Penghapusan_BMN_Jurusan_Gizi.csv', [['Nama Barang', 'Merk/Type', 'Kode Barang', 'NUP', 'Tahun', 'Jumlah', 'Ruang', 'Keterangan'],
  ...D.items.filter(i => i.kondisi === 'RB').map(i => [i.nama, i.merk, i.kode, i.nup, i.tahun, i.jumlah, room(i.ruangId)?.kode, i.ket])]);
}

/* ---- Pengguna ---- */
V.pengguna = () => `<div class="card"><div class="row" style="justify-content:space-between;margin-bottom:6px"><span class="muted">${D.users.length} akun</span>
  <button class="btn p" onclick="formUser()">${ic('plus')}Tambah Pengguna</button></div>
  <div class="tw"><table class="t"><tr><th>Nama</th><th>NIP</th><th>Username</th><th>Peran</th><th>Ruangan</th><th>Status</th><th></th></tr>
  ${D.users.map(u => `<tr><td><b>${esc(u.nama)}</b></td><td>${esc(u.nip) || '—'}</td><td>${esc(u.username)}</td><td><span class="chip k-B">${ROLE[u.role]}</span></td>
   <td>${u.role === 'pj' ? D.rooms.filter(r => r.pjId === u.id).map(r => esc(r.kode)).join(', ') || '—' : 'Semua'}</td>
   <td>${u.aktif === 'tidak' ? '<span class="chip s-no">Nonaktif</span>' : '<span class="chip s-ok">Aktif</span>'}</td>
   <td style="white-space:nowrap"><button class="btn g s" onclick="formUser('${u.id}')">${ic('edit')}</button>${u.role !== 'super' ? `<button class="btn d s" onclick="delUser('${u.id}')">${ic('trash')}</button>` : ''}</td></tr>`).join('')}</table></div>
  <p class="muted">Setelah membuat akun PJ, tetapkan ruangannya lewat menu Ruangan → ubah → Penanggung Jawab.</p></div>`;
function formUser(id) {
  const u = id ? user(id) : { nama: '', nip: '', username: '', role: 'pj', aktif: 'ya' };
  openM(`<h2>${id ? 'Ubah' : 'Tambah'} Pengguna</h2><div class="fld"><label>Nama lengkap & gelar</label><input id="un" value="${esc(u.nama)}"></div>
   <div class="f2"><div class="fld"><label>NIP</label><input id="ui" value="${esc(u.nip)}" inputmode="numeric"></div><div class="fld"><label>Username</label><input id="uu" value="${esc(u.username)}" autocapitalize="off"></div>
   <div class="fld"><label>Peran</label><select id="ur" ${u.role === 'super' ? 'disabled' : ''}>${Object.keys(ROLE).filter(k => k !== 'super' || u.role === 'super').map(k => `<option value="${k}" ${k === u.role ? 'selected' : ''}>${ROLE[k]}</option>`).join('')}</select></div>
   <div class="fld"><label>Status</label><select id="ua" ${u.role === 'super' ? 'disabled' : ''}><option value="ya">Aktif</option><option value="tidak" ${u.aktif === 'tidak' ? 'selected' : ''}>Nonaktif</option></select></div></div>
   <div class="fld"><label>${id ? 'Reset password (kosongkan jika tidak diubah)' : 'Password awal (min. 6 karakter)'}</label><input id="uw" type="text" autocomplete="off"></div>
   <div class="row" style="justify-content:flex-end"><button class="btn g" onclick="closeM()">Batal</button><button class="btn p" onclick="saveUser('${id || ''}')">Simpan</button></div>`);
}
function saveUser(id) { act('saveUser', { user: { id, nama: val('un'), nip: val('ui'), username: val('uu'), role: val('ur'), aktif: val('ua'), password: val('uw') } }); }
function delUser(id) { askConfirm('Hapus akun ini? Ruangan yang dipegangnya akan kosong PJ-nya.', () => act('delUser', { id })); }

/* ---- Pengaturan ---- */
V.pengaturan = () => {
  const s = D.settings;
  return `<div class="grid g2e"><div class="card"><h3>${ic('room', 'color:var(--tq)')}Identitas Satker</h3>
  <div class="fld"><label>Kementerian</label><input id="s1" value="${esc(s.instansi)}"></div>
  <div class="fld"><label>Unit</label><input id="s2" value="${esc(s.unit)}"></div>
  <div class="f2"><div class="fld"><label>Kode Lokasi</label><input id="s3" value="${esc(s.kodeLokasi)}"></div><div class="fld"><label>Tahun DBR</label><input id="s4" value="${esc(s.tahun)}"></div></div>
  <div class="fld"><label>Tampilan publik lewat QR pintu</label><select id="s10"><option value="ya">Aktif — siapa pun yang memindai bisa melihat DBR</option><option value="tidak" ${s.qrPublik === 'tidak' ? 'selected' : ''}>Nonaktif</option></select></div></div>
  <div class="card"><h3>${ic('doc', 'color:var(--tq)')}Penandatangan DBR</h3>
  <div class="note">Kalau ada pergantian pejabat, cukup ubah di sini. DBR yang dicetak setelahnya otomatis memakai nama baru.</div>
  <div class="f2"><div class="fld"><label>Pengurus Barang</label><input id="s5" value="${esc(s.pengurusNama)}"></div><div class="fld"><label>NIP</label><input id="s6" value="${esc(s.pengurusNip)}" inputmode="numeric"></div>
  <div class="fld"><label>Mengetahui/Menyetujui</label><input id="s7" value="${esc(s.mengetahuiNama)}"></div><div class="fld"><label>NIP</label><input id="s8" value="${esc(s.mengetahuiNip)}" inputmode="numeric"></div></div>
  <div class="fld"><label>Jabatan (Mengetahui)</label><input id="s9" value="${esc(s.mengetahuiJab)}"></div></div></div>
  <div class="row" style="justify-content:flex-end;margin-top:16px"><button class="btn p" onclick="saveSet()">Simpan Pengaturan</button></div>`;
};
function saveSet() {
  act('saveSettings', { settings: { instansi: val('s1'), unit: val('s2'), kodeLokasi: val('s3'), tahun: val('s4'), pengurusNama: val('s5'), pengurusNip: val('s6'),
    mengetahuiNama: val('s7'), mengetahuiNip: val('s8'), mengetahuiJab: val('s9'), qrPublik: val('s10') } });
}

/* ================= START ================= */
window.addEventListener('hashchange', () => { if (D) { const k = location.hash.slice(1); if (k && k !== CUR) go(k); } });
(async function start() {
  if (!TOKEN) return logoutLocal();
  try { await call('bootstrap'); showApp(); } catch (e) { logoutLocal(); }
})();
