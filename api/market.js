function round(n, digits = 2) {
  return typeof n === 'number' && Number.isFinite(n) ? Number(n.toFixed(digits)) : null;
}

async function fetchJson(url) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), 8000);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { 'user-agent': 'FinScope/0.5', 'accept': 'application/json' },
      cache: 'no-store'
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } finally {
    clearTimeout(id);
  }
}

function parseYahooQuote(json, symbol) {
  const row = json?.quoteResponse?.result?.find(x => x.symbol === symbol) || json?.quoteResponse?.result?.[0];
  if (!row) return { value: null, changePct: null, status: 'unavailable', source: 'Yahoo Finance' };
  return {
    value: round(row.regularMarketPrice, 2),
    changePct: round(row.regularMarketChangePercent, 2),
    status: typeof row.regularMarketPrice === 'number' ? 'live' : 'unavailable',
    source: 'Yahoo Finance'
  };
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 's-maxage=30, stale-while-revalidate=60');

  const assets = [];
  const now = new Date().toISOString();

  try {
    const fx = await fetchJson('https://open.er-api.com/v6/latest/USD');
    const rates = fx?.rates || {};
    const usdTry = rates.TRY;
    const eurTry = usdTry && rates.EUR ? usdTry / rates.EUR : null;
    const gbpTry = usdTry && rates.GBP ? usdTry / rates.GBP : null;
    const eurUsd = rates.EUR ? 1 / rates.EUR : null;
    const gbpUsd = rates.GBP ? 1 / rates.GBP : null;

    assets.push(
      { symbol: 'USDTRY', title: 'USD / TRY', value: round(usdTry, 4), unit: '₺', changePct: null, category: 'Döviz', status: usdTry ? 'live' : 'unavailable', source: 'open.er-api.com' },
      { symbol: 'EURTRY', title: 'EUR / TRY', value: round(eurTry, 4), unit: '₺', changePct: null, category: 'Döviz', status: eurTry ? 'live' : 'unavailable', source: 'open.er-api.com' },
      { symbol: 'GBPTRY', title: 'GBP / TRY', value: round(gbpTry, 4), unit: '₺', changePct: null, category: 'Döviz', status: gbpTry ? 'live' : 'unavailable', source: 'open.er-api.com' },
      { symbol: 'EURUSD', title: 'EUR / USD', value: round(eurUsd, 4), unit: '', changePct: null, category: 'Parite', status: eurUsd ? 'live' : 'unavailable', source: 'open.er-api.com' },
      { symbol: 'GBPUSD', title: 'GBP / USD', value: round(gbpUsd, 4), unit: '', changePct: null, category: 'Parite', status: gbpUsd ? 'live' : 'unavailable', source: 'open.er-api.com' }
    );
  } catch (e) {
    ['USD / TRY','EUR / TRY','GBP / TRY','EUR / USD','GBP / USD'].forEach((title, i) => assets.push({ symbol: ['USDTRY','EURTRY','GBPTRY','EURUSD','GBPUSD'][i], title, value: null, unit: title.includes('TRY') ? '₺' : '', changePct: null, category: title.includes('TRY') ? 'Döviz' : 'Parite', status: 'unavailable', source: 'open.er-api.com' }));
  }

  const yahooSymbols = ['GC=F','SI=F','XU100.IS','XU050.IS','XU030.IS'];
  try {
    const y = await fetchJson('https://query1.finance.yahoo.com/v7/finance/quote?symbols=' + encodeURIComponent(yahooSymbols.join(',')));
    const map = {
      'GC=F': ['GOLD', 'Altın Ons', '$', 'Kıymetli Maden'],
      'SI=F': ['SILVER', 'Gümüş Ons', '$', 'Kıymetli Maden'],
      'XU100.IS': ['XU100', 'BIST 100', '', 'Endeks'],
      'XU050.IS': ['XU50', 'BIST 50', '', 'Endeks'],
      'XU030.IS': ['XU30', 'BIST 30', '', 'Endeks']
    };
    for (const s of yahooSymbols) {
      const q = parseYahooQuote(y, s);
      const [symbol, title, unit, category] = map[s];
      assets.push({ symbol, title, value: q.value, unit, changePct: q.changePct, category, status: q.status, source: q.source });
    }
  } catch (e) {
    [
      ['GOLD', 'Altın Ons', '$', 'Kıymetli Maden'],
      ['SILVER', 'Gümüş Ons', '$', 'Kıymetli Maden'],
      ['XU100', 'BIST 100', '', 'Endeks'],
      ['XU50', 'BIST 50', '', 'Endeks'],
      ['XU30', 'BIST 30', '', 'Endeks']
    ].forEach(([symbol,title,unit,category]) => assets.push({ symbol, title, value: null, unit, changePct: null, category, status: 'unavailable', source: 'Yahoo Finance' }));
  }

  ['PBR','PHE','TLY'].forEach(symbol => assets.push({
    symbol,
    title: symbol,
    value: null,
    unit: '',
    changePct: null,
    category: 'TEFAS Fon',
    status: 'not_connected',
    source: 'TEFAS bağlantısı yok'
  }));

  res.status(200).json({ updatedAt: now, assets });
}
