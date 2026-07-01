function round(n, digits = 2) {
  if (typeof n !== 'number' || !isFinite(n)) return null;
  return Number(n.toFixed(digits));
}

async function safeJson(url, timeoutMs = 8000) {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { 'User-Agent': 'FinScope/0.4' }
    });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    return await res.json();
  } finally {
    clearTimeout(t);
  }
}

async function yahooQuote(symbol) {
  try {
    const url = `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${encodeURIComponent(symbol)}`;
    const json = await safeJson(url);
    const q = json?.quoteResponse?.result?.[0];
    if (!q) return null;
    return {
      price: q.regularMarketPrice ?? q.postMarketPrice ?? q.preMarketPrice ?? null,
      changePercent: q.regularMarketChangePercent ?? null,
      time: q.regularMarketTime ? new Date(q.regularMarketTime * 1000).toISOString() : null
    };
  } catch (e) {
    return null;
  }
}

async function metals() {
  try {
    const g = await safeJson('https://api.metals.live/v1/spot');
    // metals.live commonly returns [{gold:...},{silver:...},...]
    let gold = null, silver = null;
    if (Array.isArray(g)) {
      for (const item of g) {
        if (item.gold && !gold) gold = Number(item.gold);
        if (item.silver && !silver) silver = Number(item.silver);
      }
    }
    return { gold, silver, source: 'metals.live' };
  } catch (e) {
    return { gold: null, silver: null, source: 'yedek' };
  }
}

module.exports = async function handler(req, res) {
  res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=300');
  res.setHeader('Access-Control-Allow-Origin', '*');

  const now = new Date();
  let fxSource = 'open.er-api.com';
  let rates = null;
  try {
    const fx = await safeJson('https://open.er-api.com/v6/latest/USD');
    rates = fx?.rates || null;
  } catch (e) {
    fxSource = 'yedek';
  }

  const TRY = rates?.TRY || 39.5;
  const EUR = rates?.EUR || 0.92;
  const GBP = rates?.GBP || 0.78;

  const usdTry = TRY;
  const eurTry = TRY / EUR;
  const gbpTry = TRY / GBP;
  const eurUsd = 1 / EUR;
  const gbpUsd = 1 / GBP;

  const [x100, x50, x30, m] = await Promise.all([
    yahooQuote('XU100.IS'),
    yahooQuote('XU050.IS'),
    yahooQuote('XU030.IS'),
    metals()
  ]);

  const assets = [
    { symbol: 'USDTRY', label: 'USD / TRY', category: 'Döviz', value: round(usdTry, 2), unit: '₺', change: 0, source: fxSource, status: fxSource === 'yedek' ? 'yedek' : 'canlı' },
    { symbol: 'EURTRY', label: 'EUR / TRY', category: 'Döviz', value: round(eurTry, 2), unit: '₺', change: 0, source: fxSource, status: fxSource === 'yedek' ? 'yedek' : 'canlı' },
    { symbol: 'GBPTRY', label: 'GBP / TRY', category: 'Döviz', value: round(gbpTry, 2), unit: '₺', change: 0, source: fxSource, status: fxSource === 'yedek' ? 'yedek' : 'canlı' },
    { symbol: 'EURUSD', label: 'EUR / USD', category: 'Parite', value: round(eurUsd, 4), unit: '', change: 0, source: fxSource, status: fxSource === 'yedek' ? 'yedek' : 'canlı' },
    { symbol: 'GBPUSD', label: 'GBP / USD', category: 'Parite', value: round(gbpUsd, 4), unit: '', change: 0, source: fxSource, status: fxSource === 'yedek' ? 'yedek' : 'canlı' },
    { symbol: 'XAUUSD', label: 'Altın Ons', category: 'Kıymetli Maden', value: round(m.gold || 2456.12, 2), unit: '$', change: 0, source: m.source, status: m.gold ? 'canlı/harici' : 'yedek' },
    { symbol: 'XAGUSD', label: 'Gümüş Ons', category: 'Kıymetli Maden', value: round(m.silver || 31.06, 2), unit: '$', change: 0, source: m.source, status: m.silver ? 'canlı/harici' : 'yedek' },
    { symbol: 'XU100', label: 'BIST 100', category: 'Endeks', value: round(x100?.price || 10450, 2), unit: '', change: round(x100?.changePercent || 0, 2), source: 'Yahoo Finance', status: x100?.price ? 'gecikmeli' : 'yedek' },
    { symbol: 'XU050', label: 'BIST 50', category: 'Endeks', value: round(x50?.price || 9350, 2), unit: '', change: round(x50?.changePercent || 0, 2), source: 'Yahoo Finance', status: x50?.price ? 'gecikmeli' : 'yedek' },
    { symbol: 'XU030', label: 'BIST 30', category: 'Endeks', value: round(x30?.price || 11420, 2), unit: '', change: round(x30?.changePercent || 0, 2), source: 'Yahoo Finance', status: x30?.price ? 'gecikmeli' : 'yedek' },
    { symbol: 'PBR', label: 'PBR', category: 'TEFAS Fon', value: 1.92, unit: '', change: 0, source: 'TEFAS bağlantısı sonraki sürüm', status: 'demo' },
    { symbol: 'PHE', label: 'PHE', category: 'TEFAS Fon', value: 3.14, unit: '', change: 0, source: 'TEFAS bağlantısı sonraki sürüm', status: 'demo' },
    { symbol: 'TLY', label: 'TLY', category: 'TEFAS Fon', value: 2.88, unit: '', change: 0, source: 'TEFAS bağlantısı sonraki sürüm', status: 'demo' }
  ];

  const liveCount = assets.filter(a => a.status.includes('canlı') || a.status === 'gecikmeli').length;
  res.status(200).json({
    updatedAt: now.toISOString(),
    dateLabel: now.toLocaleString('tr-TR', { timeZone: 'Europe/Istanbul' }),
    liveCount,
    assets,
    notes: [
      'Döviz verileri open.er-api.com üzerinden alınır.',
      'BIST verisi Yahoo Finance üzerinden gecikmeli gelebilir.',
      'TEFAS fonları bu sürümde demo değerle gösterilir.'
    ]
  });
};
