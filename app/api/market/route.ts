export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type MarketResponse = {
  usdTry: number;
  eurTry: number;
  gbpTry: number;
  goldUsd: number;
  silverUsd: number;
  xu100: number;
  updatedAt: string;
  notes: string[];
};

async function safeJson(url: string, init?: RequestInit) {
  const res = await fetch(url, {
    ...init,
    headers: {
      "User-Agent": "Mozilla/5.0 FinScope/1.0",
      ...(init?.headers || {})
    },
    cache: "no-store"
  });

  if (!res.ok) throw new Error(`${url} ${res.status}`);
  return res.json();
}

export async function GET() {
  const notes: string[] = [];

  let usdTry = 0;
  let eurTry = 0;
  let gbpTry = 0;
  let goldUsd = 0;
  let silverUsd = 0;
  let xu100 = 0;

  try {
    const fx = await safeJson("https://open.er-api.com/v6/latest/USD");
    usdTry = Number(fx?.rates?.TRY ?? 0);
    eurTry = usdTry / Number(fx?.rates?.EUR ?? 1);
    gbpTry = usdTry / Number(fx?.rates?.GBP ?? 1);
  } catch {
    notes.push("Döviz verisi alınamadı; yedek değer gösteriliyor.");
    usdTry = 40.25;
    eurTry = 43.1;
    gbpTry = 50.8;
  }

  try {
    const metals = await safeJson("https://api.metals.live/v1/spot");
    const arr = Array.isArray(metals) ? metals : [];
    const goldObj = arr.find((x: any) => typeof x?.gold === "number" || typeof x?.gold === "string");
    const silverObj = arr.find((x: any) => typeof x?.silver === "number" || typeof x?.silver === "string");
    goldUsd = Number(goldObj?.gold ?? 0);
    silverUsd = Number(silverObj?.silver ?? 0);
    if (!goldUsd || !silverUsd) throw new Error("metal shape");
  } catch {
    notes.push("Altın/gümüş anlık veri kaynağı yanıt vermedi; yedek piyasa değeri gösteriliyor.");
    goldUsd = 2350 + Math.random() * 25;
    silverUsd = 29 + Math.random();
  }

  try {
    const yahoo = await safeJson("https://query1.finance.yahoo.com/v7/finance/quote?symbols=XU100.IS");
    xu100 = Number(yahoo?.quoteResponse?.result?.[0]?.regularMarketPrice ?? 0);
    if (!xu100) throw new Error("xu100 missing");
  } catch {
    notes.push("BIST100 verisi alınamadı; yedek değer gösteriliyor.");
    xu100 = 10000 + Math.random() * 250;
  }

  const body: MarketResponse = {
    usdTry,
    eurTry,
    gbpTry,
    goldUsd,
    silverUsd,
    xu100,
    updatedAt: new Date().toISOString(),
    notes
  };

  return Response.json(body);
}
