import { useState, useEffect } from "react";
import {
  collection, addDoc, updateDoc, deleteDoc,
  doc, onSnapshot, query, orderBy, serverTimestamp
} from "firebase/firestore";
import { db } from "./firebase";

// ─── THEME ────────────────────────────────────────────────────────────────────
const C = {
  bg:          "#0d0f14",
  surface:     "#13161f",
  card:        "#191c28",
  border:      "#252836",
  borderHover: "#383b52",
  accent:      "#4f8ef7",
  accentDim:   "#1e2d4a",
  green:       "#2dd4a0",
  greenDim:    "#0f2e22",
  amber:       "#f7b94f",
  amberDim:    "#2e2210",
  red:         "#f75a5a",
  redDim:      "#2e1010",
  text:        "#e8eaf0",
  sub:         "#8b91a8",
  muted:       "#4a4f66",
};

const inp = {
  background: C.bg,
  border: `1px solid ${C.border}`,
  borderRadius: 8,
  color: C.text,
  padding: "10px 14px",
  width: "100%",
  fontSize: 14,
  outline: "none",
  boxSizing: "border-box",
  fontFamily: "inherit",
};

const btnPrimary = {
  background: C.accent,
  color: "#fff",
  border: "none",
  borderRadius: 8,
  padding: "10px 22px",
  cursor: "pointer",
  fontWeight: 700,
  fontSize: 14,
  fontFamily: "inherit",
  letterSpacing: "0.02em",
};

const btnGhost = {
  background: "transparent",
  color: C.sub,
  border: `1px solid ${C.border}`,
  borderRadius: 8,
  padding: "10px 22px",
  cursor: "pointer",
  fontWeight: 500,
  fontSize: 14,
  fontFamily: "inherit",
};

const label = {
  display: "block",
  fontSize: 11,
  fontWeight: 700,
  color: C.muted,
  marginTop: 14,
  marginBottom: 6,
  textTransform: "uppercase",
  letterSpacing: "0.08em",
};

// ─── HELPERS ──────────────────────────────────────────────────────────────────
function today() {
  return new Date().toISOString().split("T")[0];
}

function daysSince(dateStr) {
  return Math.ceil((new Date() - new Date(dateStr)) / 86400000);
}

// ─── MODAL ────────────────────────────────────────────────────────────────────
function Modal({ title, onClose, children }) {
  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed", inset: 0,
        background: "rgba(0,0,0,0.75)",
        zIndex: 200,
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: 20,
        backdropFilter: "blur(4px)",
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: C.card,
          border: `1px solid ${C.border}`,
          borderRadius: 16,
          padding: 28,
          width: "100%",
          maxWidth: 460,
          animation: "pop 0.18s ease",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <span style={{ fontWeight: 800, fontSize: 17 }}>{title}</span>
          <button onClick={onClose} style={{ background: "none", border: "none", color: C.muted, fontSize: 22, cursor: "pointer", lineHeight: 1 }}>×</button>
        </div>
        {children}
      </div>
    </div>
  );
}

// ─── TOAST ────────────────────────────────────────────────────────────────────
function Toast({ toast }) {
  if (!toast) return null;
  const bg = toast.type === "error" ? C.red : toast.type === "warn" ? C.amber : C.green;
  return (
    <div style={{
      position: "fixed", top: 20, right: 20, zIndex: 999,
      background: bg, color: "#fff",
      padding: "12px 20px", borderRadius: 10,
      fontWeight: 700, fontSize: 14,
      boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
      animation: "pop 0.2s ease",
    }}>{toast.msg}</div>
  );
}

// ─── BADGE ────────────────────────────────────────────────────────────────────
function Badge({ children, color = C.accent, bg }) {
  return (
    <span style={{
      background: bg || C.accentDim,
      color,
      padding: "2px 9px",
      borderRadius: 6,
      fontSize: 12,
      fontWeight: 600,
    }}>{children}</span>
  );
}

// ─── MAIN APP ─────────────────────────────────────────────────────────────────
export default function App() {
  const [items, setItems]     = useState([]);
  const [loans, setLoans]     = useState([]);
  const [tab, setTab]         = useState("active");
  const [search, setSearch]   = useState("");
  const [toast, setToast]     = useState(null);
  const [loading, setLoading] = useState(true);

  // Modals
  const [showItem, setShowItem] = useState(false);
  const [showLoan, setShowLoan] = useState(false);

  // Forms
  const emptyItem = { name: "", description: "", quantity: 1 };
  const emptyLoan = { borrower: "", itemId: "", quantity: 1, notes: "", date: today() };
  const [itemForm, setItemForm] = useState(emptyItem);
  const [loanForm, setLoanForm] = useState(emptyLoan);

  // ── Firebase listeners ──
  useEffect(() => {
    const unsub1 = onSnapshot(
      query(collection(db, "items"), orderBy("createdAt", "asc")),
      snap => {
        setItems(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        setLoading(false);
      }
    );
    const unsub2 = onSnapshot(
      query(collection(db, "loans"), orderBy("createdAt", "desc")),
      snap => setLoans(snap.docs.map(d => ({ id: d.id, ...d.data() })))
    );
    return () => { unsub1(); unsub2(); };
  }, []);

  function notify(msg, type = "ok") {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  }

  // ── Stock helpers ──
  function available(itemId) {
    const item = items.find(i => i.id === itemId);
    if (!item) return 0;
    const lent = loans
      .filter(l => l.itemId === itemId && !l.returnedAt)
      .reduce((s, l) => s + (l.quantity || 1), 0);
    return item.quantity - lent;
  }

  // ── CRUD Items ──
  async function addItem() {
    if (!itemForm.name.trim()) return;
    try {
      await addDoc(collection(db, "items"), {
        ...itemForm,
        quantity: Number(itemForm.quantity),
        createdAt: serverTimestamp(),
      });
      setItemForm(emptyItem);
      setShowItem(false);
      notify("Ítem agregado ✓");
    } catch { notify("Error al guardar", "error"); }
  }

  async function removeItem(id) {
    if (loans.some(l => l.itemId === id && !l.returnedAt)) {
      notify("Tiene préstamos activos, no se puede eliminar", "warn");
      return;
    }
    await deleteDoc(doc(db, "items", id));
    notify("Ítem eliminado");
  }

  // ── CRUD Loans ──
  async function addLoan() {
    if (!loanForm.borrower.trim() || !loanForm.itemId) return;
    const qty = Number(loanForm.quantity);
    if (qty > available(loanForm.itemId)) {
      notify(`Solo hay ${available(loanForm.itemId)} disponibles`, "warn");
      return;
    }
    try {
      await addDoc(collection(db, "loans"), {
        ...loanForm,
        quantity: qty,
        returnedAt: null,
        createdAt: serverTimestamp(),
      });
      setLoanForm(emptyLoan);
      setShowLoan(false);
      notify("Préstamo registrado ✓");
    } catch { notify("Error al guardar", "error"); }
  }

  async function returnLoan(id) {
    await updateDoc(doc(db, "loans", id), { returnedAt: today() });
    notify("Devolución registrada ✓");
  }

  // ── Filtered lists ──
  const activeLoans   = loans.filter(l => !l.returnedAt);
  const historyLoans  = loans.filter(l => l.returnedAt);

  const visibleLoans = (tab === "active" ? activeLoans : tab === "history" ? historyLoans : [])
    .filter(l => {
      const item = items.find(i => i.id === l.itemId);
      const q = search.toLowerCase();
      return l.borrower.toLowerCase().includes(q) || (item?.name || "").toLowerCase().includes(q);
    });

  const visibleItems = items.filter(i =>
    i.name.toLowerCase().includes(search.toLowerCase())
  );

  // ── RENDER ──
  if (loading) return (
    <div style={{ minHeight: "100vh", background: C.bg, display: "flex", alignItems: "center", justifyContent: "center", color: C.sub, fontFamily: "'Syne', sans-serif", fontSize: 16 }}>
      Conectando con la base de datos…
    </div>
  );

  return (
    <div style={{ minHeight: "100vh", background: C.bg, color: C.text, fontFamily: "'Syne', 'Segoe UI', sans-serif" }}>
      <Toast toast={toast} />

      {/* ── HEADER ── */}
      <header style={{ background: C.surface, borderBottom: `1px solid ${C.border}`, position: "sticky", top: 0, zIndex: 100 }}>
        <div style={{ maxWidth: 960, margin: "0 auto", padding: "0 24px", height: 62, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div style={{ width: 38, height: 38, background: C.accent, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 19 }}>📦</div>
            <div>
              <div style={{ fontWeight: 800, fontSize: 16, letterSpacing: "-0.02em" }}>Inventario</div>
              <div style={{ fontSize: 11, color: C.muted, letterSpacing: "0.04em" }}>SISTEMA DE PRÉSTAMOS · EN VIVO</div>
            </div>
            <div style={{ width: 8, height: 8, borderRadius: "50%", background: C.green, marginLeft: 4, boxShadow: `0 0 8px ${C.green}` }} title="Conectado en tiempo real" />
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button style={{ ...btnGhost, padding: "8px 14px", fontSize: 13 }} onClick={() => { setShowItem(true); }}>+ Ítem</button>
            <button style={{ ...btnPrimary, padding: "8px 14px", fontSize: 13 }} onClick={() => setShowLoan(true)}>+ Préstamo</button>
          </div>
        </div>
      </header>

      <main style={{ maxWidth: 960, margin: "0 auto", padding: "28px 24px 60px" }}>

        {/* ── STATS ── */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 14, marginBottom: 28 }}>
          {[
            { icon: "🗂️", val: items.length,         label: "Ítems totales",      color: C.accent,  dim: C.accentDim },
            { icon: "📤", val: activeLoans.length,    label: "Préstamos activos",  color: C.amber,   dim: C.amberDim },
            { icon: "✅", val: historyLoans.length,   label: "Devueltos",          color: C.green,   dim: C.greenDim },
          ].map(s => (
            <div key={s.label} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: "20px 22px" }}>
              <div style={{ fontSize: 26, marginBottom: 10 }}>{s.icon}</div>
              <div style={{ fontSize: 32, fontWeight: 800, color: s.color, letterSpacing: "-0.03em" }}>{s.val}</div>
              <div style={{ fontSize: 12, color: C.muted, marginTop: 2, textTransform: "uppercase", letterSpacing: "0.05em" }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* ── TABS ── */}
        <div style={{ display: "flex", gap: 4, background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: 4, marginBottom: 18 }}>
          {[
            { id: "active",    label: `Activos (${activeLoans.length})` },
            { id: "history",   label: `Historial (${historyLoans.length})` },
            { id: "inventory", label: `Inventario (${items.length})` },
          ].map(t => (
            <button key={t.id} onClick={() => { setTab(t.id); setSearch(""); }} style={{
              flex: 1, padding: "9px 0", borderRadius: 9, border: "none", cursor: "pointer",
              background: tab === t.id ? C.accent : "transparent",
              color: tab === t.id ? "#fff" : C.muted,
              fontWeight: tab === t.id ? 800 : 500,
              fontSize: 13, fontFamily: "inherit", transition: "all 0.15s",
              letterSpacing: "0.01em",
            }}>{t.label}</button>
          ))}
        </div>

        {/* ── SEARCH ── */}
        <input
          placeholder="🔍  Buscar por persona o ítem…"
          style={{ ...inp, marginBottom: 16 }}
          value={search}
          onChange={e => setSearch(e.target.value)}
        />

        {/* ── LOANS LIST ── */}
        {(tab === "active" || tab === "history") && (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {visibleLoans.length === 0 && (
              <div style={{ textAlign: "center", color: C.muted, padding: "64px 0", fontSize: 14 }}>
                {tab === "active" ? "Sin préstamos activos en este momento" : "No hay registros en el historial"}
              </div>
            )}
            {visibleLoans.map(loan => {
              const item = items.find(i => i.id === loan.itemId);
              const days = daysSince(loan.date);
              const overdue = !loan.returnedAt && days > 7;
              return (
                <div key={loan.id} style={{
                  background: C.card,
                  border: `1px solid ${overdue ? C.red : C.border}`,
                  borderRadius: 12,
                  padding: "14px 18px",
                  display: "flex",
                  alignItems: "center",
                  gap: 14,
                  transition: "border-color 0.2s",
                }}>
                  <div style={{
                    width: 42, height: 42, borderRadius: 10, flexShrink: 0,
                    background: loan.returnedAt ? C.greenDim : overdue ? C.redDim : C.accentDim,
                    display: "flex", alignItems: "center", justifyContent: "center", fontSize: 19,
                  }}>
                    {loan.returnedAt ? "✅" : overdue ? "⚠️" : "📤"}
                  </div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 5 }}>{loan.borrower}</div>
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                      <Badge>{item?.name || "Ítem eliminado"}</Badge>
                      <Badge color={C.sub} bg={C.surface}>×{loan.quantity}</Badge>
                      {overdue && <Badge color={C.red} bg={C.redDim}>Vencido</Badge>}
                    </div>
                    {loan.notes && <div style={{ fontSize: 12, color: C.muted, marginTop: 5 }}>📝 {loan.notes}</div>}
                  </div>

                  <div style={{ textAlign: "right", flexShrink: 0 }}>
                    <div style={{ fontSize: 12, color: C.muted }}>Prestado: {loan.date}</div>
                    {loan.returnedAt
                      ? <div style={{ fontSize: 12, color: C.green, marginTop: 3 }}>↩ Devuelto: {loan.returnedAt}</div>
                      : <div style={{ fontSize: 12, color: overdue ? C.red : C.amber, fontWeight: 600, marginTop: 3 }}>{days}d activo</div>
                    }
                    {!loan.returnedAt && (
                      <button
                        onClick={() => returnLoan(loan.id)}
                        style={{ ...btnPrimary, background: C.green, padding: "6px 14px", fontSize: 12, marginTop: 8, borderRadius: 7 }}
                      >Registrar devolución</button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ── INVENTORY LIST ── */}
        {tab === "inventory" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {visibleItems.length === 0 && (
              <div style={{ textAlign: "center", color: C.muted, padding: "64px 0", fontSize: 14 }}>
                No hay ítems. Agrega el primero con el botón "+ Ítem"
              </div>
            )}
            {visibleItems.map(item => {
              const avail = available(item.id);
              const lent  = item.quantity - avail;
              return (
                <div key={item.id} style={{
                  background: C.card,
                  border: `1px solid ${C.border}`,
                  borderRadius: 12,
                  padding: "14px 18px",
                  display: "flex",
                  alignItems: "center",
                  gap: 14,
                }}>
                  <div style={{
                    width: 42, height: 42, borderRadius: 10, flexShrink: 0,
                    background: avail > 0 ? C.greenDim : C.redDim,
                    border: `2px solid ${avail > 0 ? C.green : C.red}`,
                    display: "flex", alignItems: "center", justifyContent: "center", fontSize: 19,
                  }}>📦</div>

                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 4 }}>{item.name}</div>
                    {item.description && <div style={{ fontSize: 13, color: C.muted }}>{item.description}</div>}
                  </div>

                  {/* Mini bar */}
                  <div style={{ textAlign: "right", minWidth: 120 }}>
                    <div style={{ fontSize: 12, color: C.muted, marginBottom: 6 }}>
                      {lent > 0 ? `${lent} prestado${lent > 1 ? "s" : ""}` : "Sin préstamos"}
                    </div>
                    <div style={{ background: C.border, borderRadius: 4, height: 6, overflow: "hidden", width: 100, marginLeft: "auto" }}>
                      <div style={{
                        height: "100%",
                        width: `${(avail / item.quantity) * 100}%`,
                        background: avail > 0 ? C.green : C.red,
                        borderRadius: 4,
                        transition: "width 0.4s ease",
                      }} />
                    </div>
                    <div style={{ fontSize: 12, marginTop: 4 }}>
                      <span style={{ color: C.green, fontWeight: 700 }}>{avail}</span>
                      <span style={{ color: C.muted }}> / {item.quantity} disponibles</span>
                    </div>
                  </div>

                  <button
                    onClick={() => removeItem(item.id)}
                    style={{ ...btnGhost, padding: "6px 12px", fontSize: 12, color: C.red, borderColor: C.redDim }}
                  >✕</button>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* ── MODAL: ADD ITEM ── */}
      {showItem && (
        <Modal title="Agregar ítem al inventario" onClose={() => { setShowItem(false); setItemForm(emptyItem); }}>
          <div style={label}>Nombre *</div>
          <input style={inp} placeholder="Ej: Taladro Bosch, Laptop Dell, Cámara…" value={itemForm.name} onChange={e => setItemForm({ ...itemForm, name: e.target.value })} />
          <div style={label}>Descripción (opcional)</div>
          <input style={inp} placeholder="Modelo, serie, color…" value={itemForm.description} onChange={e => setItemForm({ ...itemForm, description: e.target.value })} />
          <div style={label}>Cantidad total disponible</div>
          <input style={inp} type="number" min="1" value={itemForm.quantity} onChange={e => setItemForm({ ...itemForm, quantity: e.target.value })} />
          <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
            <button style={{ ...btnGhost, flex: 1 }} onClick={() => { setShowItem(false); setItemForm(emptyItem); }}>Cancelar</button>
            <button style={{ ...btnPrimary, flex: 1 }} onClick={addItem}>Agregar</button>
          </div>
        </Modal>
      )}

      {/* ── MODAL: NEW LOAN ── */}
      {showLoan && (
        <Modal title="Registrar préstamo" onClose={() => { setShowLoan(false); setLoanForm(emptyLoan); }}>
          <div style={label}>Nombre de quien recibe *</div>
          <input style={inp} placeholder="Nombre completo…" value={loanForm.borrower} onChange={e => setLoanForm({ ...loanForm, borrower: e.target.value })} />
          <div style={label}>Ítem a prestar *</div>
          <select style={{ ...inp, appearance: "none" }} value={loanForm.itemId} onChange={e => setLoanForm({ ...loanForm, itemId: e.target.value, quantity: 1 })}>
            <option value="">Seleccionar ítem…</option>
            {items.filter(i => available(i.id) > 0).map(i => (
              <option key={i.id} value={i.id}>{i.name} — {available(i.id)} disponibles</option>
            ))}
          </select>
          {loanForm.itemId && (
            <>
              <div style={label}>Cantidad</div>
              <input style={inp} type="number" min="1" max={available(loanForm.itemId)} value={loanForm.quantity} onChange={e => setLoanForm({ ...loanForm, quantity: e.target.value })} />
            </>
          )}
          <div style={label}>Fecha de préstamo</div>
          <input style={inp} type="date" value={loanForm.date} onChange={e => setLoanForm({ ...loanForm, date: e.target.value })} />
          <div style={label}>Notas (opcional)</div>
          <input style={inp} placeholder="Estado del ítem, observaciones…" value={loanForm.notes} onChange={e => setLoanForm({ ...loanForm, notes: e.target.value })} />
          <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
            <button style={{ ...btnGhost, flex: 1 }} onClick={() => { setShowLoan(false); setLoanForm(emptyLoan); }}>Cancelar</button>
            <button style={{ ...btnPrimary, flex: 1 }} onClick={addLoan}>Registrar</button>
          </div>
        </Modal>
      )}

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;500;600;700;800&display=swap');
        * { box-sizing: border-box; }
        body { margin: 0; background: ${C.bg}; }
        input[type=date]::-webkit-calendar-picker-indicator { filter: invert(0.5); }
        select option { background: ${C.card}; color: ${C.text}; }
        @keyframes pop {
          from { opacity: 0; transform: scale(0.95) translateY(6px); }
          to   { opacity: 1; transform: scale(1) translateY(0); }
        }
      `}</style>
    </div>
  );
}
