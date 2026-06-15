import { useState, useEffect, useCallback } from "react";

const STORAGE_KEY = "inventory_db";

const emptyPurchase = { hsn: "", rate: "", quantity: "", per: "", date: "" };
const emptySale = { hsn: "", rate: "", quantity: "", per: "", date: "" };

function loadDB() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return { purchases: [], sales: [] };
}

function saveDB(db) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
}

// Compute remaining stock grouped by hsn+per
function computeStock(db) {
  const map = {};

  for (const p of db.purchases) {
    const key = `${p.hsn}__${p.per}`;
    if (!map[key]) map[key] = { hsn: p.hsn, per: p.per, purchased: 0, sold: 0, rate: p.rate };
    map[key].purchased += Number(p.quantity);
  }

  for (const s of db.sales) {
    const key = `${s.hsn}__${s.per}`;
    if (!map[key]) map[key] = { hsn: s.hsn, per: s.per, purchased: 0, sold: 0, rate: s.rate };
    map[key].sold += Number(s.quantity);
  }

  return Object.values(map).map(r => ({
    ...r,
    remaining: r.purchased - r.sold,
  }));
}

const tabs = ["Purchase Entry", "Sale Entry", "Stock Report"];

const inputClass =
  "w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white";

const labelClass = "block text-xs font-semibold text-slate-500 mb-1 uppercase tracking-wide";

export default function App() {
  const [activeTab, setActiveTab] = useState(0);
  const [db, setDB] = useState(loadDB);
  const [purchase, setPurchase] = useState({ ...emptyPurchase, date: today() });
  const [sale, setSale] = useState({ ...emptySale, date: today() });
  const [toast, setToast] = useState(null);
  const [saleError, setSaleError] = useState("");
  const [purchaseErrors, setPurchaseErrors] = useState({});
  const [saleErrors, setSaleErrors] = useState({});

  function today() {
    return new Date().toISOString().slice(0, 10);
  }

  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const persistDB = useCallback((newDB) => {
    setDB(newDB);
    saveDB(newDB);
  }, []);

  function validatePurchase() {
    const errs = {};
    if (!purchase.hsn.trim()) errs.hsn = "Required";
    if (!purchase.rate || isNaN(purchase.rate) || Number(purchase.rate) <= 0) errs.rate = "Enter valid rate";
    if (!purchase.quantity || isNaN(purchase.quantity) || Number(purchase.quantity) <= 0) errs.quantity = "Enter valid quantity";
    if (!purchase.per.trim()) errs.per = "Required";
    if (!purchase.date) errs.date = "Required";
    return errs;
  }

  function validateSale() {
    const errs = {};
    if (!sale.hsn.trim()) errs.hsn = "Required";
    if (!sale.rate || isNaN(sale.rate) || Number(sale.rate) <= 0) errs.rate = "Enter valid rate";
    if (!sale.quantity || isNaN(sale.quantity) || Number(sale.quantity) <= 0) errs.quantity = "Enter valid quantity";
    if (!sale.per.trim()) errs.per = "Required";
    if (!sale.date) errs.date = "Required";
    return errs;
  }

  function submitPurchase() {
    const errs = validatePurchase();
    setPurchaseErrors(errs);
    if (Object.keys(errs).length) return;

    const newEntry = {
      id: Date.now(),
      hsn: purchase.hsn.trim(),
      rate: Number(purchase.rate),
      quantity: Number(purchase.quantity),
      per: purchase.per.trim(),
      date: purchase.date,
    };
    const newDB = { ...db, purchases: [...db.purchases, newEntry] };
    persistDB(newDB);
    setPurchase({ ...emptyPurchase, date: today() });
    setPurchaseErrors({});
    showToast("Purchase recorded successfully!");
  }

  function submitSale() {
    const errs = validateSale();
    setSaleErrors(errs);
    if (Object.keys(errs).length) return;

    setSaleError("");
    const stock = computeStock(db);
    const key = `${sale.hsn.trim()}__${sale.per.trim()}`;
    const match = stock.find(s => `${s.hsn}__${s.per}` === key);

    if (!match || match.remaining < Number(sale.quantity)) {
      setSaleError(
        match
          ? `Only ${match.remaining} ${match.per} available for HSN ${sale.hsn}.`
          : `No stock found for HSN ${sale.hsn} / Per: ${sale.per}.`
      );
      return;
    }

    const newEntry = {
      id: Date.now(),
      hsn: sale.hsn.trim(),
      rate: Number(sale.rate),
      quantity: Number(sale.quantity),
      per: sale.per.trim(),
      date: sale.date,
    };
    const newDB = { ...db, sales: [...db.sales, newEntry] };
    persistDB(newDB);
    setSale({ ...emptySale, date: today() });
    setSaleErrors({});
    setSaleError("");
    showToast("Sale recorded. Stock updated!");
  }

  const stock = computeStock(db);

  return (
    <div style={{ fontFamily: "'Inter', sans-serif", minHeight: "100vh", background: "#f1f5f9" }}>
      {/* Toast */}
      {toast && (
        <div
          style={{
            position: "fixed", top: 20, right: 20, zIndex: 1000,
            background: toast.type === "success" ? "#22c55e" : "#ef4444",
            color: "#fff", borderRadius: 10, padding: "12px 20px",
            boxShadow: "0 4px 20px rgba(0,0,0,0.15)", fontSize: 14, fontWeight: 600,
            display: "flex", alignItems: "center", gap: 8
          }}
        >
          {toast.type === "success" ? "✓" : "✗"} {toast.msg}
        </div>
      )}

      {/* Header */}
      <div style={{ background: "linear-gradient(135deg, #4338ca 0%, #6366f1 100%)", padding: "28px 0 0 0" }}>
        <div style={{ maxWidth: 800, margin: "0 auto", padding: "0 24px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 24 }}>
            <div style={{
              width: 44, height: 44, borderRadius: 12,
              background: "rgba(255,255,255,0.2)", display: "flex", alignItems: "center",
              justifyContent: "center", fontSize: 22
            }}>📦</div>
            <div>
              <h1 style={{ color: "#fff", fontSize: 22, fontWeight: 700, margin: 0 }}>Inventory Manager</h1>
              <p style={{ color: "rgba(255,255,255,0.7)", fontSize: 13, margin: 0 }}>Purchase · Sale · Stock Report</p>
            </div>
          </div>

          {/* Tabs */}
          <div style={{ display: "flex", gap: 4 }}>
            {tabs.map((t, i) => (
              <button
                key={t}
                onClick={() => setActiveTab(i)}
                style={{
                  padding: "10px 20px", border: "none", cursor: "pointer",
                  borderRadius: "10px 10px 0 0", fontSize: 13, fontWeight: 600,
                  background: activeTab === i ? "#fff" : "rgba(255,255,255,0.15)",
                  color: activeTab === i ? "#4338ca" : "rgba(255,255,255,0.85)",
                  transition: "all 0.2s"
                }}
              >
                {i === 0 ? "🛒 " : i === 1 ? "💸 " : "📊 "}{t}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div style={{ maxWidth: 800, margin: "0 auto", padding: "28px 24px" }}>

        {/* PURCHASE FORM */}
        {activeTab === 0 && (
          <div>
            <SectionCard title="New Purchase Entry" subtitle="Record incoming stock">
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                <Field label="HSN Code" error={purchaseErrors.hsn}>
                  <input className={inputClass} placeholder="e.g. 84733099" value={purchase.hsn}
                    onChange={e => setPurchase(p => ({ ...p, hsn: e.target.value }))} />
                </Field>
                <Field label="Rate (₹)" error={purchaseErrors.rate}>
                  <input className={inputClass} type="number" placeholder="0.00" value={purchase.rate}
                    onChange={e => setPurchase(p => ({ ...p, rate: e.target.value }))} />
                </Field>
                <Field label="Quantity" error={purchaseErrors.quantity}>
                  <input className={inputClass} type="number" placeholder="0" value={purchase.quantity}
                    onChange={e => setPurchase(p => ({ ...p, quantity: e.target.value }))} />
                </Field>
                <Field label="Per (Unit)" error={purchaseErrors.per}>
                  <input className={inputClass} placeholder="e.g. KG, PCS, MTR" value={purchase.per}
                    onChange={e => setPurchase(p => ({ ...p, per: e.target.value }))} />
                </Field>
                <Field label="Date" error={purchaseErrors.date} style={{ gridColumn: "1 / -1" }}>
                  <input className={inputClass} type="date" value={purchase.date}
                    onChange={e => setPurchase(p => ({ ...p, date: e.target.value }))} />
                </Field>
              </div>
              <button onClick={submitPurchase} style={primaryBtn("#4338ca")}>
                ＋ Add Purchase
              </button>
            </SectionCard>

            {/* Purchase history */}
            {db.purchases.length > 0 && (
              <SectionCard title={`Purchase History (${db.purchases.length})`} style={{ marginTop: 20 }}>
                <Table
                  cols={["#", "HSN", "Rate (₹)", "Qty", "Per", "Date"]}
                  rows={[...db.purchases].reverse().map((p, i) => [
                    db.purchases.length - i, p.hsn, `₹${p.rate}`, p.quantity, p.per, p.date
                  ])}
                />
              </SectionCard>
            )}
          </div>
        )}

        {/* SALE FORM */}
        {activeTab === 1 && (
          <div>
            <SectionCard title="New Sale Entry" subtitle="Deducts from purchase stock">
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                <Field label="HSN Code" error={saleErrors.hsn}>
                  <input className={inputClass} placeholder="e.g. 84733099" value={sale.hsn}
                    onChange={e => { setSale(s => ({ ...s, hsn: e.target.value })); setSaleError(""); }} />
                </Field>
                <Field label="Sale Rate (₹)" error={saleErrors.rate}>
                  <input className={inputClass} type="number" placeholder="0.00" value={sale.rate}
                    onChange={e => setSale(s => ({ ...s, rate: e.target.value }))} />
                </Field>
                <Field label="Quantity to Sell" error={saleErrors.quantity}>
                  <input className={inputClass} type="number" placeholder="0" value={sale.quantity}
                    onChange={e => setSale(s => ({ ...s, quantity: e.target.value }))} />
                </Field>
                <Field label="Per (Unit)" error={saleErrors.per}>
                  <input className={inputClass} placeholder="e.g. KG, PCS, MTR" value={sale.per}
                    onChange={e => { setSale(s => ({ ...s, per: e.target.value })); setSaleError(""); }} />
                </Field>
                <Field label="Date" error={saleErrors.date} style={{ gridColumn: "1 / -1" }}>
                  <input className={inputClass} type="date" value={sale.date}
                    onChange={e => setSale(s => ({ ...s, date: e.target.value }))} />
                </Field>
              </div>

              {saleError && (
                <div style={{
                  background: "#fef2f2", border: "1px solid #fca5a5", borderRadius: 8,
                  padding: "10px 14px", color: "#dc2626", fontSize: 13, fontWeight: 500, marginTop: 4
                }}>
                  ⚠️ {saleError}
                </div>
              )}

              {/* Quick stock hint */}
              {sale.hsn && sale.per && (() => {
                const s = stock.find(x => x.hsn === sale.hsn.trim() && x.per === sale.per.trim());
                if (s) return (
                  <div style={{
                    background: "#f0fdf4", border: "1px solid #86efac", borderRadius: 8,
                    padding: "10px 14px", color: "#16a34a", fontSize: 13, fontWeight: 500
                  }}>
                    ✅ Available stock: <strong>{s.remaining} {s.per}</strong> for HSN {s.hsn}
                  </div>
                );
              })()}

              <button onClick={submitSale} style={primaryBtn("#7c3aed")}>
                Record Sale & Deduct Stock
              </button>
            </SectionCard>

            {/* Sale history */}
            {db.sales.length > 0 && (
              <SectionCard title={`Sale History (${db.sales.length})`} style={{ marginTop: 20 }}>
                <Table
                  cols={["#", "HSN", "Rate (₹)", "Qty Sold", "Per", "Date"]}
                  rows={[...db.sales].reverse().map((s, i) => [
                    db.sales.length - i, s.hsn, `₹${s.rate}`, s.quantity, s.per, s.date
                  ])}
                />
              </SectionCard>
            )}
          </div>
        )}

        {/* STOCK REPORT */}
        {activeTab === 2 && (
          <div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14, marginBottom: 20 }}>
              <StatCard label="Total HSN Codes" value={stock.length} color="#4338ca" icon="🏷️" />
              <StatCard label="Total Purchased" value={db.purchases.reduce((a, b) => a + Number(b.quantity), 0)} color="#0891b2" icon="📥" />
              <StatCard label="Total Sold" value={db.sales.reduce((a, b) => a + Number(b.quantity), 0)} color="#7c3aed" icon="📤" />
            </div>

            <SectionCard title="Remaining Stock Report" subtitle="Live balance after all purchases and sales">
              {stock.length === 0 ? (
                <div style={{ textAlign: "center", padding: "40px 0", color: "#94a3b8", fontSize: 14 }}>
                  No data yet. Add purchase entries to begin.
                </div>
              ) : (
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                    <thead>
                      <tr style={{ background: "#f8fafc" }}>
                        {["#", "HSN Code", "Unit (Per)", "Purchased", "Sold", "Remaining", "Status"].map(h => (
                          <th key={h} style={{
                            padding: "10px 12px", textAlign: "left", fontWeight: 700,
                            color: "#475569", borderBottom: "2px solid #e2e8f0", whiteSpace: "nowrap"
                          }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {stock.map((s, i) => {
                        const pct = s.purchased > 0 ? (s.remaining / s.purchased) * 100 : 0;
                        const statusColor = pct > 50 ? "#16a34a" : pct > 20 ? "#d97706" : "#dc2626";
                        const statusLabel = pct > 50 ? "Good" : pct > 20 ? "Low" : s.remaining === 0 ? "Out" : "Critical";
                        return (
                          <tr key={i} style={{ borderBottom: "1px solid #f1f5f9", background: i % 2 === 0 ? "#fff" : "#fafafa" }}>
                            <td style={{ padding: "10px 12px", color: "#94a3b8" }}>{i + 1}</td>
                            <td style={{ padding: "10px 12px", fontWeight: 700, color: "#1e293b", fontFamily: "monospace" }}>{s.hsn}</td>
                            <td style={{ padding: "10px 12px", color: "#475569" }}>{s.per}</td>
                            <td style={{ padding: "10px 12px", color: "#0891b2" }}>{s.purchased}</td>
                            <td style={{ padding: "10px 12px", color: "#7c3aed" }}>{s.sold}</td>
                            <td style={{ padding: "10px 12px", fontWeight: 700, color: statusColor, fontSize: 15 }}>{s.remaining}</td>
                            <td style={{ padding: "10px 12px" }}>
                              <span style={{
                                background: statusColor + "18", color: statusColor,
                                borderRadius: 20, padding: "3px 10px", fontSize: 11, fontWeight: 700
                              }}>{statusLabel}</span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </SectionCard>

            {/* Clear data */}
            <div style={{ marginTop: 16, textAlign: "right" }}>
              <button
                onClick={() => {
                  if (confirm("Clear ALL data? This cannot be undone.")) {
                    const empty = { purchases: [], sales: [] };
                    persistDB(empty);
                    showToast("All data cleared.", "error");
                  }
                }}
                style={{
                  background: "none", border: "1px solid #fca5a5", color: "#dc2626",
                  borderRadius: 8, padding: "6px 14px", fontSize: 12, cursor: "pointer", fontWeight: 600
                }}
              >
                🗑 Clear All Data
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function SectionCard({ title, subtitle, children, style }) {
  return (
    <div style={{
      background: "#fff", borderRadius: 16, padding: 24,
      boxShadow: "0 1px 3px rgba(0,0,0,0.07), 0 4px 16px rgba(0,0,0,0.04)", ...style
    }}>
      {title && (
        <div style={{ marginBottom: 18 }}>
          <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: "#1e293b" }}>{title}</h2>
          {subtitle && <p style={{ margin: "2px 0 0", fontSize: 12, color: "#94a3b8" }}>{subtitle}</p>}
        </div>
      )}
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {children}
      </div>
    </div>
  );
}

function Field({ label, error, children, style }) {
  return (
    <div style={style}>
      <label style={{
        display: "block", fontSize: 11, fontWeight: 700,
        color: "#64748b", marginBottom: 5, textTransform: "uppercase", letterSpacing: "0.05em"
      }}>{label}</label>
      {children}
      {error && <p style={{ color: "#dc2626", fontSize: 11, margin: "3px 0 0" }}>{error}</p>}
    </div>
  );
}

function Table({ cols, rows }) {
  return (
    <div style={{ overflowX: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
        <thead>
          <tr style={{ background: "#f8fafc" }}>
            {cols.map(c => (
              <th key={c} style={{
                padding: "9px 12px", textAlign: "left", fontWeight: 700,
                color: "#475569", borderBottom: "2px solid #e2e8f0", whiteSpace: "nowrap"
              }}>{c}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} style={{ borderBottom: "1px solid #f1f5f9", background: i % 2 === 0 ? "#fff" : "#fafafa" }}>
              {row.map((cell, j) => (
                <td key={j} style={{ padding: "9px 12px", color: "#334155" }}>{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function StatCard({ label, value, color, icon }) {
  return (
    <div style={{
      background: "#fff", borderRadius: 14, padding: "16px 20px",
      boxShadow: "0 1px 3px rgba(0,0,0,0.07)"
    }}>
      <div style={{ fontSize: 20, marginBottom: 6 }}>{icon}</div>
      <div style={{ fontSize: 26, fontWeight: 800, color }}>{value}</div>
      <div style={{ fontSize: 12, color: "#94a3b8", fontWeight: 500, marginTop: 2 }}>{label}</div>
    </div>
  );
}

function primaryBtn(color) {
  return {
    background: color, color: "#fff", border: "none", borderRadius: 10,
    padding: "12px 24px", fontSize: 14, fontWeight: 700, cursor: "pointer",
    width: "100%", marginTop: 4, letterSpacing: "0.01em",
    boxShadow: `0 4px 14px ${color}55`, transition: "opacity 0.2s"
  };
}
