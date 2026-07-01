async function fetchJson(url, timeoutMs = 8000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'FinScope/0.8',
        'Accept': 'application/json,text/plain,*/*'
      }
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } finally {
    clearTimeout(timer);
  }
}

async function yahooPrice(symbol) {
  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?range=1d&interval=1d`;
    const json = await fetchJson(url);
    const result = json?.chart?.result?.[0];
    const meta = result?.meta;
    const price = meta?.regularMarketPrice ?? meta?.previousClose ?? null;
    if (typeof price !== 'number') return null;
    return {
      value: price,
      source: 'Yahoo Finance',
      status: 'canlı/gecikmeli',
      updatedAt: meta?.regularMarketTime ? new Date(meta.regularMarketTime * 1000).toISOString() : new Date().toISOString()
    };
  } catch (_) {
    return null;
  }
}

function asset(label, category, value, currency, status, source, updatedAt, note) {
  return {
    label,
    category,
    value: typeof value === 'number' ? value : null,
    currency: currency || '',
    change: null,
    status: status || 'veri yok',
    source: source || 'bağlantı yok',
    updatedAt: updatedAt || new Date().toISOString(),
    note: note || ''
  };
}

module.exports = async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Access-Control-Allow-Origin', '*');

  const now = new Date().toISOString();
  const assets = [];

  let rates = null;
  try {
    const fx = await fetchJson('https://open.er-api.com/v6/latest/USD');
    if (fx?.result === 'success' && fx?.rates?.TRY && fx?.rates?.EUR && fx?.rates?.GBP) {
      rates = fx.rates;
      const updatedAt = fx.time_last_update_unix ? new Date(fx.time_last_update_unix * 1000).toISOString() : now;
      assets.push(asset('USD / TRY', 'Döviz', rates.TRY, '₺', 'canlı', 'open.er-api.com', updatedAt));
      assets.push(asset('EUR / TRY', 'Döviz', rates.TRY / rates.EUR, '₺', 'canlı', 'open.er-api.com', updatedAt));
      assets.push(asset('GBP / TRY', 'Döviz', rates.TRY / rates.GBP, '₺', 'canlı', 'open.er-api.com', updatedAt));
      assets.push(asset('EUR / USD', 'Parite', 1 / rates.EUR, '', 'canlı', 'open.er-api.com', updatedAt));
      assets.push(asset('GBP / USD', 'Parite', 1 / rates.GBP, '', 'canlı', 'open.er-api.com', updatedAt));
    }
  } catch (_) {}

  if (!rates) {
    assets.push(asset('USD / TRY', 'Döviz', null, '₺', 'veri alınamadı', 'open.er-api.com', now));
    assets.push(asset('EUR / TRY', 'Döviz', null, '₺', 'veri alınamadı', 'open.er-api.com', now));
    assets.push(asset('GBP / TRY', 'Döviz', null, '₺', 'veri alınamadı', 'open.er-api.com', now));
    assets.push(asset('EUR / USD', 'Parite', null, '', 'veri alınamadı', 'open.er-api.com', now));
    assets.push(asset('GBP / USD', 'Parite', null, '', 'veri alınamadı', 'open.er-api.com', now));
  }

  const gold = await yahooPrice('GC=F');
  assets.push(gold ? asset('Altın Ons', 'Kıymetli maden', gold.value, '$', gold.status, gold.source, gold.updatedAt) : asset('Altın Ons', 'Kıymetli maden', null, '$', 'veri alınamadı', 'Yahoo Finance', now));

  const silver = await yahooPrice('SI=F');
  assets.push(silver ? asset('Gümüş Ons', 'Kıymetli maden', silver.value, '$', silver.status, silver.source, silver.updatedAt) : asset('Gümüş Ons', 'Kıymetli maden', null, '$', 'veri alınamadı', 'Yahoo Finance', now));

  const xu100 = await yahooPrice('XU100.IS');
  assets.push(xu100 ? asset('BIST 100', 'BIST', xu100.value, '', xu100.status, xu100.source, xu100.updatedAt) : asset('BIST 100', 'BIST', null, '', 'veri alınamadı', 'Yahoo Finance', now));

  const xu50 = await yahooPrice('XU050.IS');
  assets.push(xu50 ? asset('BIST 50', 'BIST', xu50.value, '', xu50.status, xu50.source, xu50.updatedAt) : asset('BIST 50', 'BIST', null, '', 'veri alınamadı', 'Yahoo Finance', now));

  const xu30 = await yahooPrice('XU030.IS');
  assets.push(xu30 ? asset('BIST 30', 'BIST', xu30.value, '', xu30.status, xu30.source, xu30.updatedAt) : asset('BIST 30', 'BIST', null, '', 'veri alınamadı', 'Yahoo Finance', now));

  assets.push(asset('PBR', 'TEFAS Fon', null, '', 'TEFAS bağlantısı yok', 'TEFAS API sonraki sürüm', now, 'Gerçek TEFAS verisi bağlanmadan değer gösterilmeyecek.'));
  assets.push(asset('PHE', 'TEFAS Fon', null, '', 'TEFAS bağlantısı yok', 'TEFAS API sonraki sürüm', now, 'Gerçek TEFAS verisi bağlanmadan değer gösterilmeyecek.'));
  assets.push(asset('TLY', 'TEFAS Fon', null, '', 'TEFAS bağlantısı yok', 'TEFAS API sonraki sürüm', now, 'Gerçek TEFAS verisi bağlanmadan değer gösterilmeyecek.'));

  res.status(200).json({
    version: '0.8',
    updatedAt: now,
    assets,
    liveCount: assets.filter(a => a.value !== null).length,
    totalCount: assets.length
  });
};
