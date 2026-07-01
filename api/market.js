const headers = {
  'content-type': 'application/json; charset=utf-8',
  'cache-control': 's-maxage=60, stale-while-revalidate=300',
  'access-control-allow-origin': '*'
};

async function safeJson(url) {
  try {
    const res = await fetch(url, {
      headers: { 'user-agent': 'Mozilla/5.0 FinScope/0.9' }
    });
    if (!res.ok) return null;
    return await res.json();
  } catch (_) {
    return null;
  }
}

function n(v) {
  const x = Number(v);
  return Number.isFinite(x) ? x : null;
}

async function yahoo(symbol) {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?range=1d&interval=1d`;
  const j = await safeJson(url);
  const r = j?.chart?.result?.[0];
  const meta = r?.meta || {};
  return {
    price: n(meta.regularMarketPrice ?? meta.previousClose),
    currency: meta.currency || '',
    source: 'Yahoo Finance',
    rawSymbol: symbol
  };
}

module.exports = async function handler(req, res) {
  try {
    const fx = await safeJson('https://open.er-api.com/v6/latest/USD');
    const rates = fx?.rates || {};
    const tryRate = n(rates.TRY);
    const eurRate = n(rates.EUR);
    const gbpRate = n(rates.GBP);

    const [gold, silver, xu100, xu50, xu30] = await Promise.all([
      yahoo('GC=F'),
      yahoo('SI=F'),
      yahoo('XU100.IS'),
      yahoo('XU050.IS'),
      yahoo('XU030.IS')
    ]);

    const now = new Date().toISOString();
    const assets = [
      { id:'usdtry', title:'USD / TRY', category:'Döviz', value: tryRate, suffix:'₺', status: tryRate ? 'canlı' : 'veri yok', source:'open.er-api.com' },
      { id:'eurtry', title:'EUR / TRY', category:'Döviz', value: (tryRate && eurRate) ? tryRate / eurRate : null, suffix:'₺', status: (tryRate && eurRate) ? 'canlı' : 'veri yok', source:'open.er-api.com' },
      { id:'gbptry', title:'GBP / TRY', category:'Döviz', value: (tryRate && gbpRate) ? tryRate / gbpRate : null, suffix:'₺', status: (tryRate && gbpRate) ? 'canlı' : 'veri yok', source:'open.er-api.com' },
      { id:'eurusd', title:'EUR / USD', category:'Parite', value: eurRate ? 1 / eurRate : null, suffix:'', status: eurRate ? 'canlı' : 'veri yok', source:'open.er-api.com' },
      { id:'gbpusd', title:'GBP / USD', category:'Parite', value: gbpRate ? 1 / gbpRate : null, suffix:'', status: gbpRate ? 'canlı' : 'veri yok', source:'open.er-api.com' },
      { id:'gold', title:'Altın Ons', category:'Kıymetli maden', value: gold.price, suffix:'$', status: gold.price ? 'canlı/gecikmeli' : 'veri yok', source: gold.source, symbol: gold.rawSymbol },
      { id:'silver', title:'Gümüş Ons', category:'Kıymetli maden', value: silver.price, suffix:'$', status: silver.price ? 'canlı/gecikmeli' : 'veri yok', source: silver.source, symbol: silver.rawSymbol },
      { id:'xu100', title:'BIST 100', category:'BIST', value: xu100.price, suffix:'', status: xu100.price ? 'canlı/gecikmeli' : 'veri yok', source: xu100.source, symbol: xu100.rawSymbol },
      { id:'xu50', title:'BIST 50', category:'BIST', value: xu50.price, suffix:'', status: xu50.price ? 'canlı/gecikmeli' : 'veri yok', source: xu50.source, symbol: xu50.rawSymbol },
      { id:'xu30', title:'BIST 30', category:'BIST', value: xu30.price, suffix:'', status: xu30.price ? 'canlı/gecikmeli' : 'veri yok', source: xu30.source, symbol: xu30.rawSymbol },
      { id:'pbr', title:'PBR', category:'TEFAS fonu', value:null, suffix:'', status:'TEFAS bağlantısı yok', source:'TEFAS motoru sonraki sürüm' },
      { id:'phe', title:'PHE', category:'TEFAS fonu', value:null, suffix:'', status:'TEFAS bağlantısı yok', source:'TEFAS motoru sonraki sürüm' },
      { id:'tly', title:'TLY', category:'TEFAS fonu', value:null, suffix:'', status:'TEFAS bağlantısı yok', source:'TEFAS motoru sonraki sürüm' }
    ];

    res.writeHead(200, headers);
    res.end(JSON.stringify({ ok:true, updatedAt: now, assets }));
  } catch (e) {
    res.writeHead(200, headers);
    res.end(JSON.stringify({ ok:false, updatedAt: new Date().toISOString(), error:'Market API hatası', assets: [] }));
  }
};
