export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

type Asset = {
  symbol: string;
  name: string;
  category: string;
  value: number | null;
  display: string;
  change: number | null;
  source: string;
  status: 'canli' | 'gecikmeli' | 'baglanti_yok';
  note: string;
};

function fmt(value: number | null, digits = 2, suffix = '') {
  if (value === null || Number.isNaN(value)) return '—';
  return new Intl.NumberFormat('tr-TR', { minimumFractionDigits: digits, maximumFractionDigits: digits }).format(value) + suffix;
}

async function getFx() {
  try {
    const r = await fetch('https://open.er-api.com/v6/latest/USD', { cache: 'no-store' });
    if (!r.ok) throw new Error('FX response failed');
    const j = await r.json();
    const rates = j?.rates || {};
    return {
      usdTry: Number(rates.TRY),
      eurTry: rates.TRY && rates.EUR ? Number(rates.TRY) / Number(rates.EUR) : null,
      gbpTry: rates.TRY && rates.GBP ? Number(rates.TRY) / Number(rates.GBP) : null,
      eurUsd: rates.EUR ? 1 / Number(rates.EUR) : null,
      gbpUsd: rates.GBP ? 1 / Number(rates.GBP) : null,
      ok: true
    };
  } catch {
    return { usdTry: null, eurTry: null, gbpTry: null, eurUsd: null, gbpUsd: null, ok: false };
  }
}

async function yahoo(symbol: string) {
  try {
    const r = await fetch(`https://query1.finance.yahoo.com/v7/finance/quote?symbols=${encodeURIComponent(symbol)}`, { cache: 'no-store' });
    if (!r.ok) throw new Error('Yahoo response failed');
    const j = await r.json();
    const q = j?.quoteResponse?.result?.[0];
    const price = q?.regularMarketPrice;
    return typeof price === 'number' ? price : null;
  } catch {
    return null;
  }
}

export async function GET() {
  const fx = await getFx();
  const gold = await yahoo('GC=F');
  const silver = await yahoo('SI=F');
  const xu100 = await yahoo('XU100.IS');
  const xu50 = await yahoo('XU050.IS');
  const xu30 = await yahoo('XU030.IS');

  const assets: Asset[] = [
    { symbol: 'USDTRY', name: 'USD / TRY', category: 'Döviz', value: fx.usdTry, display: fmt(fx.usdTry, 2, ' ₺'), change: null, source: 'open.er-api.com', status: fx.usdTry ? 'canli' : 'baglanti_yok', note: 'USD/TRY canlı kur verisi.' },
    { symbol: 'EURTRY', name: 'EUR / TRY', category: 'Döviz', value: fx.eurTry, display: fmt(fx.eurTry, 2, ' ₺'), change: null, source: 'open.er-api.com', status: fx.eurTry ? 'canli' : 'baglanti_yok', note: 'EUR/TRY canlı kur verisi.' },
    { symbol: 'GBPTRY', name: 'GBP / TRY', category: 'Döviz', value: fx.gbpTry, display: fmt(fx.gbpTry, 2, ' ₺'), change: null, source: 'open.er-api.com', status: fx.gbpTry ? 'canli' : 'baglanti_yok', note: 'GBP/TRY canlı kur verisi.' },
    { symbol: 'EURUSD', name: 'EUR / USD', category: 'Parite', value: fx.eurUsd, display: fmt(fx.eurUsd, 4, ''), change: null, source: 'open.er-api.com', status: fx.eurUsd ? 'canli' : 'baglanti_yok', note: 'EUR/USD parite verisi.' },
    { symbol: 'GBPUSD', name: 'GBP / USD', category: 'Parite', value: fx.gbpUsd, display: fmt(fx.gbpUsd, 4, ''), change: null, source: 'open.er-api.com', status: fx.gbpUsd ? 'canli' : 'baglanti_yok', note: 'GBP/USD parite verisi.' },
    { symbol: 'GOLD', name: 'Altın Ons', category: 'Kıymetli maden', value: gold, display: fmt(gold, 2, ' $'), change: null, source: 'Yahoo Finance GC=F', status: gold ? 'gecikmeli' : 'baglanti_yok', note: gold ? 'Gecikmeli ons altın verisi.' : 'Altın verisi alınamadı; yanlış/yedek değer gösterilmiyor.' },
    { symbol: 'SILVER', name: 'Gümüş Ons', category: 'Kıymetli maden', value: silver, display: fmt(silver, 2, ' $'), change: null, source: 'Yahoo Finance SI=F', status: silver ? 'gecikmeli' : 'baglanti_yok', note: silver ? 'Gecikmeli ons gümüş verisi.' : 'Gümüş verisi alınamadı; yanlış/yedek değer gösterilmiyor.' },
    { symbol: 'XU100', name: 'BIST 100', category: 'BIST', value: xu100, display: xu100 ? new Intl.NumberFormat('tr-TR', { maximumFractionDigits: 0 }).format(xu100) : '—', change: null, source: 'Yahoo Finance XU100.IS', status: xu100 ? 'gecikmeli' : 'baglanti_yok', note: xu100 ? 'Gecikmeli BIST 100 verisi.' : 'BIST 100 verisi alınamadı; yanlış/yedek değer gösterilmiyor.' },
    { symbol: 'XU50', name: 'BIST 50', category: 'BIST', value: xu50, display: xu50 ? new Intl.NumberFormat('tr-TR', { maximumFractionDigits: 0 }).format(xu50) : '—', change: null, source: 'Yahoo Finance XU050.IS', status: xu50 ? 'gecikmeli' : 'baglanti_yok', note: xu50 ? 'Gecikmeli BIST 50 verisi.' : 'BIST 50 verisi alınamadı; yanlış/yedek değer gösterilmiyor.' },
    { symbol: 'XU30', name: 'BIST 30', category: 'BIST', value: xu30, display: xu30 ? new Intl.NumberFormat('tr-TR', { maximumFractionDigits: 0 }).format(xu30) : '—', change: null, source: 'Yahoo Finance XU030.IS', status: xu30 ? 'gecikmeli' : 'baglanti_yok', note: xu30 ? 'Gecikmeli BIST 30 verisi.' : 'BIST 30 verisi alınamadı; yanlış/yedek değer gösterilmiyor.' },
    { symbol: 'PBR', name: 'PBR', category: 'TEFAS fonu', value: null, display: '—', change: null, source: 'TEFAS bağlantısı yok', status: 'baglanti_yok', note: 'TEFAS entegrasyonu henüz bağlı değil; yanlış fon fiyatı gösterilmiyor.' },
    { symbol: 'PHE', name: 'PHE', category: 'TEFAS fonu', value: null, display: '—', change: null, source: 'TEFAS bağlantısı yok', status: 'baglanti_yok', note: 'TEFAS entegrasyonu henüz bağlı değil; yanlış fon fiyatı gösterilmiyor.' },
    { symbol: 'TLY', name: 'TLY', category: 'TEFAS fonu', value: null, display: '—', change: null, source: 'TEFAS bağlantısı yok', status: 'baglanti_yok', note: 'TEFAS entegrasyonu henüz bağlı değil; yanlış fon fiyatı gösterilmiyor.' }
  ];

  const liveCount = assets.filter(a => a.status === 'canli' || a.status === 'gecikmeli').length;
  return Response.json({ updatedAt: new Date().toISOString(), liveCount, total: assets.length, assets });
}
