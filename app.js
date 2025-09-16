// Minimal React app (no build step). Uses htm for JSX-like templating.
const { useState, useEffect, useMemo } = React;
const html = htm.bind(React.createElement);

const prettyMoney = (n, currency) => new Intl.NumberFormat(undefined, { style: "currency", currency, maximumFractionDigits: 4 }).format(n);
const clamp = (n, min, max) => Math.max(min, Math.min(max, n));

function App() {
  const [rows, setRows] = useState([]);
  const [q, setQ] = useState("");

  // Tokens (10k steps)
  const [inTokens, setInTokens] = useState(100000);
  const [outTokens, setOutTokens] = useState(0);

  // Currency
  const [currency, setCurrency] = useState("USD");
  const [fx, setFx] = useState(50);
  const isEGP = currency === "EGP";
  const rate = isEGP ? fx : 1;

  useEffect(() => {
    fetch("./Models-price.json", { cache: "no-store" })
      .then(r => r.json())
      .then(data => setRows(data.map(r => ({
        ...r,
        input_price_per_token: Number(r.input_price_per_1M_tokens) / 1_000_000,
        output_price_per_token: Number(r.output_price_per_1M_tokens) / 1_000_000,
        total_per_1M: Number(r.input_price_per_1M_tokens) + Number(r.output_price_per_1M_tokens)
      }))))
      .catch(() => setRows([]));
  }, []);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    return rows
      .filter(r => !term || r.model_name.toLowerCase().includes(term) || r.provider.toLowerCase().includes(term))
      .map(r => ({
        ...r,
        est_cost_usd: (inTokens * r.input_price_per_token) + (outTokens * r.output_price_per_token),
      }));
  }, [rows, q, inTokens, outTokens]);

  return html`
    <div class="space-y-6">
      <section class="card">
        <div class="grid gap-4 md:grid-cols-2 lg:grid-cols-4 items-end">
          <div>
            <label class="block text-sm font-medium">Search</label>
            <input class="mt-1 w-full rounded-xl border px-3 py-2" placeholder="Find model or provider…" value=${q} onInput=${e => setQ(e.target.value)} />
          </div>
          <div>
            <label class="block text-sm font-medium">Input tokens (10k steps)</label>
            <input type="number" step="10000" min="0" class="mt-1 w-full rounded-xl border px-3 py-2" value=${inTokens}
              onInput=${e => setInTokens(clamp(Number(e.target.value || 0), 0, 10_000_000_000))} />
            <input type="range" min="0" max="2000000" step="10000" class="mt-2 w-full" value=${Math.min(inTokens, 2000000)}
              onInput=${e => setInTokens(Number(e.target.value))} />
          </div>
          <div>
            <label class="block text-sm font-medium">Output tokens (10k steps)</label>
            <input type="number" step="10000" min="0" class="mt-1 w-full rounded-xl border px-3 py-2" value=${outTokens}
              onInput=${e => setOutTokens(clamp(Number(e.target.value || 0), 0, 10_000_000_000))} />
            <input type="range" min="0" max="2000000" step="10000" class="mt-2 w-full" value=${Math.min(outTokens, 2000000)}
              onInput=${e => setOutTokens(Number(e.target.value))} />
          </div>
          <div>
            <label class="block text-sm font-medium">Currency</label>
            <div class="mt-1 flex gap-2">
              <button class="btn ${currency==='USD'?'bg-slate-100':''}" onClick=${() => setCurrency('USD')}>USD</button>
              <button class="btn ${currency==='EGP'?'bg-slate-100':''}" onClick=${() => setCurrency('EGP')}>EGP</button>
            </div>
            ${isEGP && html`
              <div class="mt-2 flex items-center gap-2">
                <input type="number" min="1" class="w-28 rounded-xl border px-3 py-2" value=${fx} onInput=${e => setFx(clamp(Number(e.target.value||0),1,10000))} />
                <span class="text-xs muted">EGP / USD</span>
                <button class="btn" onClick=${() => setFx(50)}>Reset</button>
              </div>`}
          </div>
        </div>
      </section>

      <section class="card">
        <h2 class="font-semibold mb-3">Model Pricing Table</h2>
        <div class="overflow-x-auto">
          <table class="table w-full text-sm text-left">
            <thead class="bg-slate-100">
              <tr>
                <th>Model Name</th>
                <th>Input / 1M</th>
                <th>Output / 1M</th>
              </tr>
            </thead>
            <tbody>
              ${rows.map(r => html`
                <tr key=${r.model_name}>
                  <td class="font-medium">${r.model_name}</td>
                  <td>${prettyMoney(r.input_price_per_1M_tokens * rate, currency)}</td>
                  <td>${prettyMoney(r.output_price_per_1M_tokens * rate, currency)}</td>
                </tr>
              `)}
            </tbody>
          </table>
        </div>
      </section>

      <section class="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        ${filtered.map((r, idx) => {
          const estDisp = prettyMoney(r.est_cost_usd * rate, currency);
          const total1M = prettyMoney(r.total_per_1M * rate, currency);
          const in1M = prettyMoney(r.input_price_per_1M_tokens * rate, currency);
          const out1M = prettyMoney(r.output_price_per_1M_tokens * rate, currency);
          return html`
            <div key=${r.model_name} class="card">
              <div class="flex items-center justify-between mb-2">
                <div class="font-semibold truncate">${r.model_name}</div>
                <span class="badge">${r.provider}</span>
              </div>
              <div class="grid grid-cols-3 gap-2 text-sm">
                <div class="rounded-xl bg-slate-50 p-3">
                  <div class="text-xs muted">Input / 1M</div>
                  <div class="font-semibold">${in1M}</div>
                </div>
                <div class="rounded-xl bg-slate-50 p-3">
                  <div class="text-xs muted">Output / 1M</div>
                  <div class="font-semibold">${out1M}</div>
                </div>
                <div class="rounded-xl bg-slate-50 p-3">
                  <div class="text-xs muted">Total / 1M</div>
                  <div class="font-semibold">${total1M}</div>
                </div>
              </div>
              <div class="mt-3 rounded-xl border p-3 flex items-center justify-between">
                <div>
                  <div class="text-xs muted">Est. Session Cost</div>
                  <div class="text-xl font-bold">${estDisp}</div>
                </div>
                <div class="text-xs muted text-right">
                  <div>Input: ${inTokens.toLocaleString()} tok</div>
                  <div>Output: ${outTokens.toLocaleString()} tok</div>
                </div>
              </div>
              <div class="mt-2 text-xs muted">Pricing is per 1M tokens; we divide by 1,000,000 to get per-token rate.</div>
            </div>`;
        })}
      </section>
    </div>
  `;
}

ReactDOM.createRoot(document.getElementById("root")).render(React.createElement(App));
