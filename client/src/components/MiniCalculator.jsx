import { useEffect, useMemo, useState } from 'react';
import { Calculator, Check, Copy, RotateCcw } from 'lucide-react';

const taxRates = [10, 11, 15, 18];
const money = (value) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 2 }).format(value || 0);

export default function MiniCalculator({ onAddItem }) {
  const [basePrice, setBasePrice] = useState('');
  const [discountPercent, setDiscountPercent] = useState('');
  const [taxRate, setTaxRate] = useState(() => Number(localStorage.getItem('catalogue-tax-rate')) || 0);
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [applied, setApplied] = useState(false);
  const [itemName, setItemName] = useState('');
  const [quantity, setQuantity] = useState('');
  const [unitPrice, setUnitPrice] = useState('0.00');
  const [priceEdited, setPriceEdited] = useState(false);
  const [itemError, setItemError] = useState('');

  // Values are derived from the two inputs, so changing either recalculates instantly.
  const prices = useMemo(() => {
    const base = Math.max(0, Number(basePrice) || 0);
    const discount = Math.min(100, Math.max(0, Number(discountPercent) || 0));
    const discountAmount = base * (discount / 100);
    const afterDiscount = base - discountAmount;
    const taxAmount = afterDiscount * (taxRate / 100);
    return { base, discount, discountAmount, afterDiscount, taxAmount, final: afterDiscount + taxAmount };
  }, [basePrice, discountPercent, taxRate]);
  const chooseTax = (rate) => { setTaxRate(rate); localStorage.setItem('catalogue-tax-rate', String(rate)); };
  const reset = () => { setBasePrice(''); setDiscountPercent(''); setTaxRate(0); setCopied(false); setApplied(false); setPriceEdited(false); localStorage.removeItem('catalogue-tax-rate'); };
  const copyFinal = async () => { await navigator.clipboard?.writeText(prices.final.toFixed(2)); setCopied(true); setTimeout(() => setCopied(false), 1500); };
  // Keep this suggested unit price tied to the calculator unless the user overrides it.
  useEffect(() => { if (!priceEdited) setUnitPrice(prices.final.toFixed(2)); }, [prices.final, priceEdited]);
  const addItem = () => { const qty = Number(quantity); const price = Number(unitPrice); if (!itemName.trim() || !Number.isFinite(qty) || qty <= 0 || !Number.isFinite(price) || price < 0) { setItemError('Enter an item name, a quantity above zero, and a valid unit price.'); return; } const lastUnitPrice = prices.final.toFixed(2); onAddItem({ name: itemName.trim(), quantity: qty, unitPrice: price }); setItemName(''); setQuantity(''); setBasePrice(''); setDiscountPercent(''); setApplied(false); setUnitPrice(lastUnitPrice); setPriceEdited(true); setItemError(''); };

  return <aside className="min-h-0 shrink-0 border-t border-slate-200 bg-white lg:flex lg:h-full lg:w-72 lg:flex-col lg:border-l lg:border-t-0">
    <button className="flex w-full items-center justify-between px-4 py-3 text-left lg:hidden" onClick={() => setOpen(!open)} aria-expanded={open}><span className="flex items-center gap-2 font-bold"><Calculator size={18} className="text-electrical"/> Price calculator</span><span className="text-sm text-slate-500">{open ? 'Hide' : 'Show'}</span></button>
    <div className={`${open ? 'block' : 'hidden'} max-h-[52vh] overflow-y-auto p-4 lg:block lg:min-h-0 lg:max-h-none lg:flex-1`}>
      <div className="mb-4 hidden items-center gap-2 lg:flex"><Calculator size={19} className="text-electrical"/><h3 className="font-bold">Price calculator</h3></div>
      <label className="label">Base price / MRP</label><input className="field" inputMode="decimal" type="number" min="0" step="0.01" placeholder="₹ 0.00" value={basePrice} onChange={e => { setApplied(false); setPriceEdited(false); setBasePrice(e.target.value); }}/>
      <label className="label mt-3">Discount %</label><input className="field" inputMode="decimal" type="number" min="0" max="100" step="0.01" placeholder="Enter discount" value={discountPercent} onChange={e => { setApplied(false); setPriceEdited(false); setDiscountPercent(e.target.value); }}/>
      <button className="btn-primary mt-3 w-full" type="button" onClick={() => setApplied(true)}>{applied ? 'Discount Applied' : 'Apply Discount'}</button>
      <div className="mt-4 border-t border-slate-100 pt-4"><p className="label">Add tax</p><div className="grid grid-cols-2 gap-2">{taxRates.map(rate => <button key={rate} type="button" onClick={() => chooseTax(rate)} className={`btn !px-2 !py-2 ${taxRate === rate ? 'bg-navy text-white' : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50'}`}>+{rate}% Tax</button>)}</div></div>
      <dl className="mt-4 space-y-2 rounded-xl bg-slate-50 p-3 text-sm"><div className="flex justify-between"><dt>MRP</dt><dd>{money(prices.base)}</dd></div><div className="flex justify-between text-red-700"><dt>Discount ({prices.discount}%)</dt><dd>−{money(prices.discountAmount)}</dd></div><div className="flex justify-between font-medium"><dt>After discount</dt><dd>{money(prices.afterDiscount)}</dd></div><div className="flex justify-between text-emerald-700"><dt>Tax ({taxRate}%)</dt><dd>+{money(prices.taxAmount)}</dd></div><div className="flex justify-between border-t border-slate-200 pt-2 text-base font-extrabold text-navy"><dt>Final price</dt><dd>{money(prices.final)}</dd></div></dl>
      <div className="mt-3 grid grid-cols-2 gap-2"><button type="button" className="btn-secondary !px-2" onClick={reset}><RotateCcw size={16}/> Reset</button><button type="button" className="btn-secondary !px-2" onClick={copyFinal}>{copied ? <Check size={16}/> : <Copy size={16}/>} {copied ? 'Copied' : 'Copy final'}</button></div>
      <div className="mt-5 border-t border-slate-200 pt-4"><h4 className="font-bold">Add item to list</h4><label className="label mt-3">Item name</label><input className="field" value={itemName} onChange={e => setItemName(e.target.value)} placeholder="e.g. 1.5 mm² Red Wire"/><div className="mt-3 grid grid-cols-2 gap-2"><label><span className="label">Quantity</span><input className="field" type="number" min="0" inputMode="numeric" value={quantity} onChange={e => setQuantity(e.target.value)} placeholder="Nos"/></label><label><span className="label">Unit price</span><input className="field" type="number" min="0" step="0.01" inputMode="decimal" value={unitPrice} onChange={e => { setPriceEdited(true); setUnitPrice(e.target.value); }}/></label></div><p className="mt-2 text-sm font-medium text-slate-600">Line total: {money((Number(quantity) || 0) * (Number(unitPrice) || 0))}</p>{itemError && <p className="mt-2 text-xs text-red-700">{itemError}</p>}<button type="button" className="btn-primary mt-3 w-full" onClick={addItem}>Add to list</button></div>
    </div>
  </aside>;
}
