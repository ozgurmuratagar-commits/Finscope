module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 'no-store');
  const out = { updatedAt: new Date().toISOString(), usdTry: null, eurTry: null, gbpTry: null, eurUsd: null, gbpUsd: null, gold: null, silver: null, xu100: null, xu50: null, xu30: null };
  try {
    const fx = await fetch('https://open.er-api.com/v6/latest/USD').then(r => r.json());
    if (fx && fx.rates && fx.rates.TRY && fx.rates.EUR && fx.rates.GBP) {
      out.usdTry = fx.rates.TRY;
      out.eurTry = fx.rates.TRY / fx.rates.EUR;
      out.gbpTry = fx.rates.TRY / fx.rates.GBP;
      out.eurUsd = 1 / fx.rates.EUR;
      out.gbpUsd = 1 / fx.rates.GBP;
    }
  } catch(e) {}
  async function yf(symbol){
    try{const j=await fetch('https://query1.finance.yahoo.com/v8/finance/chart/'+encodeURIComponent(symbol)+'?range=1d&interval=1d',{headers:{'User-Agent':'Mozilla/5.0'}}).then(r=>r.json());return j?.chart?.result?.[0]?.meta?.regularMarketPrice ?? null;}catch(e){return null;}
  }
  out.gold = await yf('GC=F');
  out.silver = await yf('SI=F');
  out.xu100 = await yf('XU100.IS');
  out.xu50 = await yf('XU050.IS');
  out.xu30 = await yf('XU030.IS');
  res.status(200).json(out);
}
