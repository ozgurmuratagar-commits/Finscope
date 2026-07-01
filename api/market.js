module.exports = async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store, max-age=0');
  const result = {
    ok: true,
    updatedAt: new Date().toISOString(),
    fx: null,
    market: {},
    notes: []
  };

  async function fetchJson(url) {
    const r = await fetch(url, { headers: { 'User-Agent': 'FinScope/2.1' } });
    if (!r.ok) throw new Error(`${r.status} ${url}`);
    return r.json();
  }

  try {
    const fx = await fetchJson('https://open.er-api.com/v6/latest/USD');
    if (fx && fx.rates && fx.rates.TRY) {
      result.fx = {
        source: 'open.er-api.com',
        usdTry: fx.rates.TRY,
        eurTry: fx.rates.TRY / fx.rates.EUR,
        gbpTry: fx.rates.TRY / fx.rates.GBP,
        eurUsd: 1 / fx.rates.EUR,
        gbpUsd: 1 / fx.rates.GBP
      };
    } else {
      result.notes.push('Döviz verisi beklenen formatta gelmedi.');
    }
  } catch (e) {
    result.notes.push('Döviz verisi alınamadı: ' + e.message);
  }

  // Yahoo Finance sembolleri gecikmeli olabilir. Veri alınamazsa UI değer göstermez.
  const yahooSymbols = ['GC=F','SI=F','XU100.IS','XU050.IS','XU030.IS'];
  try {
    const url = 'https://query1.finance.yahoo.com/v7/finance/quote?symbols=' + encodeURIComponent(yahooSymbols.join(','));
    const y = await fetchJson(url);
    const rows = y?.quoteResponse?.result || [];
    for (const row of rows) {
      result.market[row.symbol] = {
        price: row.regularMarketPrice ?? null,
        changePercent: row.regularMarketChangePercent ?? null,
        source: 'Yahoo Finance',
        delayed: true
      };
    }
  } catch (e) {
    result.notes.push('Yahoo Finance verisi alınamadı: ' + e.message);
  }

  res.status(200).json(result);
};
