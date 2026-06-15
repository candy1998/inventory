import { useState, useEffect } from "react";

const STORAGE_KEY = "inventory_db";

export default function App() {
  const [purchases, setPurchases] = useState([]);
  const [sales, setSales] = useState([]);

  const [purchase, setPurchase] = useState({
    hsn: "",
    rate: "",
    quantity: "",
    per: "",
    date: new Date().toISOString().slice(0,10)
  });

  const [sale, setSale] = useState({
    hsn: "",
    rate: "",
    quantity: "",
    per: "",
    date: new Date().toISOString().slice(0,10)
  });

  useEffect(() => {
    const db = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{"purchases":[],"sales":[]}');
    setPurchases(db.purchases || []);
    setSales(db.sales || []);
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ purchases, sales }));
  }, [purchases, sales]);

  const computeStock = () => {
    const map = {};

    purchases.forEach(p => {
      const key = `${p.hsn}_${p.per}`;
      if (!map[key]) map[key] = { ...p, purchased: 0, sold: 0 };
      map[key].purchased += Number(p.quantity);
    });

    sales.forEach(s => {
      const key = `${s.hsn}_${s.per}`;
      if (!map[key]) return;
      map[key].sold += Number(s.quantity);
    });

    return Object.values(map).map(i => ({
      ...i,
      remaining: i.purchased - i.sold
    }));
  };

  const stock = computeStock();

  const submitPurchase = () => {
    setPurchases([...purchases, { ...purchase, id: Date.now() }]);
    setPurchase({
      hsn: "",
      rate: "",
      quantity: "",
      per: "",
      date: new Date().toISOString().slice(0,10)
    });
  };

  const submitSale = () => {
    const item = stock.find(
      s => s.hsn === sale.hsn && s.per === sale.per
    );

    if (!item || item.remaining < Number(sale.quantity)) {
      alert("Insufficient stock");
      return;
    }

    setSales([...sales, { ...sale, id: Date.now() }]);
    setSale({
      hsn: "",
      rate: "",
      quantity: "",
      per: "",
      date: new Date().toISOString().slice(0,10)
    });
  };

  return (
    <div style={{padding:30,fontFamily:"Arial"}}>
      <h1>Inventory Manager</h1>

      <h2>Purchase Entry</h2>
      <input placeholder="HSN" value={purchase.hsn}
        onChange={e=>setPurchase({...purchase, hsn:e.target.value})}/>
      <input placeholder="Rate" type="number" value={purchase.rate}
        onChange={e=>setPurchase({...purchase, rate:e.target.value})}/>
      <input placeholder="Qty" type="number" value={purchase.quantity}
        onChange={e=>setPurchase({...purchase, quantity:e.target.value})}/>
      <input placeholder="Per" value={purchase.per}
        onChange={e=>setPurchase({...purchase, per:e.target.value})}/>
      <button onClick={submitPurchase}>Add Purchase</button>

      <h2>Sale Entry</h2>
      <input placeholder="HSN" value={sale.hsn}
        onChange={e=>setSale({...sale, hsn:e.target.value})}/>
      <input placeholder="Rate" type="number" value={sale.rate}
        onChange={e=>setSale({...sale, rate:e.target.value})}/>
      <input placeholder="Qty" type="number" value={sale.quantity}
        onChange={e=>setSale({...sale, quantity:e.target.value})}/>
      <input placeholder="Per" value={sale.per}
        onChange={e=>setSale({...sale, per:e.target.value})}/>
      <button onClick={submitSale}>Add Sale</button>

      <h2>Remaining Stock</h2>
      <table border="1" cellPadding="10">
        <thead>
          <tr>
            <th>HSN</th>
            <th>Per</th>
            <th>Purchased</th>
            <th>Sold</th>
            <th>Remaining</th>
          </tr>
        </thead>
        <tbody>
          {stock.map((s, i)=>(
            <tr key={i}>
              <td>{s.hsn}</td>
              <td>{s.per}</td>
              <td>{s.purchased}</td>
              <td>{s.sold}</td>
              <td>{s.remaining}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
