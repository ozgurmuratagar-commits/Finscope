'use client';

import { useEffect, useMemo, useState } from 'react';

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

type ApiData = { updatedAt: string; liveCount: number; total: number; assets: Asset[] };

const fallback: ApiData = { updatedAt: new Date().toISOString(), liveCount: 0, total: 0, assets: [] };

export default function Home() {
  const [data, setData] = useState<ApiData>(fallback);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Asset | null>(null);
  const [error, setError] = useState('');

  async function load() {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/market', { cache: 'no-store' });
      if (!res.ok) throw new Error('API yanıt vermedi');
      const json = await res.json();
      setData(json);
    } catch {
      setError('Veriler alınamadı. Yanlış/yedek veri gösterilmiyor.');
      setData(fallback);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  const radar = useMemo(() => {
    if (!data.assets.length) return 'Veri bağlantısı bekleniyor.';
    const live = data.assets.filter(a => a.status === 'canli').length;
    const delayed = data.assets.filter(a => a.status === 'gecikmeli').length;
    const missing = data.assets.filter(a => a.status === 'baglanti_yok').length;
    return `${live} canlı, ${delayed} gecikmeli, ${missing} bağlantısız kalem var. Yanlış/yedek değerler gizlendi.`;
  }, [data]);

  const insight = useMemo(() => {
    const usd = data.assets.find(a => a.symbol === 'USDTRY');
    const gold = data.assets.find(a => a.symbol === 'GOLD');
    const bist = data.assets.find(a => a.symbol === 'XU100');
    return [usd?.value ? `USD/TRY ${usd.display} seviyesinde.` : 'USD/TRY verisi alınamadı.', gold?.value ? `Altın ons ${gold.display} seviyesinde.` : 'Altın verisi alınamadı.', bist?.value ? `BIST 100 ${bist.display} seviyesinde.` : 'BIST 100 verisi alınamadı.'].join(' ');
  }, [data]);

  return (
    <main className="page">
      <header className="header">
        <div>
          <h1>FinScope</h1>
          <p>Piyasa paneli — canlı/gecikmeli veri; hatalı yedek değer yok.</p>
        </div>
        <div className="topRight">
          <button onClick={load} disabled={loading}>{loading ? 'Yükleniyor' : 'Yenile'}</button>
          <span>Son güncelleme: {new Date(data.updatedAt).toLocaleString('tr-TR')}</span>
          <span>Canlı/gecikmeli kalem: {data.liveCount}/{data.total}</span>
        </div>
      </header>

      {error && <div className="error">{error}</div>}

      <section className="grid">
        {data.assets.map(asset => <Card key={asset.symbol} asset={asset} onClick={() => setSelected(asset)} />)}
      </section>

      <section className="panels">
        <div className="panel"><h2>AI Analist</h2><p>{insight}</p></div>
        <div className="panel"><h2>Piyasa Radarı</h2><p>{radar}</p></div>
      </section>

      {selected && <Modal asset={selected} onClose={() => setSelected(null)} />}

      <style jsx global>{`
        *{box-sizing:border-box} body{margin:0;background:radial-gradient(circle at 70% 0%,#2e736b 0,#102d36 35%,#0c1d2c 100%);color:#fff;font-family:Arial,system-ui,sans-serif} .page{max-width:1180px;margin:0 auto;padding:42px 22px 80px}.header{display:flex;justify-content:space-between;gap:24px;align-items:flex-start;margin-bottom:28px}h1{font-size:42px;margin:0 0 8px;font-weight:800}p{line-height:1.5}.header p{margin:0;color:#d8e8ea;font-weight:700}.topRight{display:flex;flex-direction:column;align-items:flex-end;gap:8px;font-weight:700;color:#e3f7f2}.topRight button{border:0;border-radius:14px;padding:14px 24px;font-weight:800;color:#fff;background:linear-gradient(180deg,#9bf2ff,#55a8ff);box-shadow:0 8px 28px rgba(76,178,255,.35);cursor:pointer}.grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:18px}.card{min-height:160px;border:1px solid rgba(255,255,255,.28);border-radius:22px;background:rgba(255,255,255,.11);box-shadow:0 18px 60px rgba(0,0,0,.15);padding:18px;cursor:pointer;transition:.15s}.card:hover{transform:translateY(-3px);background:rgba(255,255,255,.16)}.card h3{margin:0 0 12px;font-size:16px}.value{font-size:34px;font-weight:900;margin-bottom:10px}.status{font-size:13px;font-weight:800}.canli{color:#85ffd2}.gecikmeli{color:#ffe08a}.baglanti_yok{color:#ff9aa8}.spark{height:36px;border-radius:10px;margin-top:18px;background:linear-gradient(100deg,rgba(112,255,223,.25),rgba(255,255,255,.08));position:relative;overflow:hidden}.spark:after{content:"";position:absolute;left:8px;right:8px;bottom:11px;height:4px;border-radius:999px;background:linear-gradient(90deg,#d4feff,#b9ff9b);transform:skewY(-4deg)}.panels{display:grid;grid-template-columns:1fr 1fr;gap:18px;margin-top:24px}.panel,.error{border:1px solid rgba(255,255,255,.25);border-radius:22px;background:rgba(255,255,255,.1);padding:22px}.panel h2{margin:0 0 10px}.modalBackdrop{position:fixed;inset:0;background:rgba(0,0,0,.55);display:flex;align-items:center;justify-content:center;padding:22px;z-index:50}.modal{width:min(640px,100%);border:1px solid rgba(255,255,255,.28);border-radius:24px;background:#132b34;box-shadow:0 30px 120px rgba(0,0,0,.45);padding:26px}.modalHeader{display:flex;justify-content:space-between;align-items:center;gap:18px}.modal h2{font-size:32px;margin:0}.close{border:1px solid rgba(255,255,255,.25);background:rgba(255,255,255,.1);color:#fff;border-radius:12px;padding:10px 14px;cursor:pointer}.meta{display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-top:22px}.meta div{border:1px solid rgba(255,255,255,.16);border-radius:14px;padding:14px;background:rgba(255,255,255,.06)}.label{font-size:12px;color:#bcd4d8}.big{font-size:24px;font-weight:900;margin-top:4px}.note{margin-top:20px;color:#e9f7f4;font-weight:700}.error{color:#ffced6;margin-bottom:18px}@media(max-width:850px){.header{flex-direction:column}.topRight{align-items:flex-start}.grid,.panels,.meta{grid-template-columns:1fr}h1{font-size:34px}}
      `}</style>
    </main>
  );
}

function Card({ asset, onClick }: { asset: Asset; onClick: () => void }) {
  return <button className="card" onClick={onClick}><h3>{asset.name}</h3><div className="value">{asset.display}</div><div className={`status ${asset.status}`}>{asset.status === 'canli' ? 'canlı' : asset.status === 'gecikmeli' ? 'gecikmeli' : 'veri alınamadı'} • {asset.source}</div><div className="spark" /></button>;
}

function Modal({ asset, onClose }: { asset: Asset; onClose: () => void }) {
  return <div className="modalBackdrop" onClick={onClose}><div className="modal" onClick={(e) => e.stopPropagation()}><div className="modalHeader"><h2>{asset.name}</h2><button className="close" onClick={onClose}>Kapat</button></div><div className="meta"><div><span className="label">Kategori</span><div className="big">{asset.category}</div></div><div><span className="label">Son değer</span><div className="big">{asset.display}</div></div><div><span className="label">Durum</span><div className={`big ${asset.status}`}>{asset.status === 'canli' ? 'Canlı' : asset.status === 'gecikmeli' ? 'Gecikmeli' : 'Veri alınamadı'}</div></div><div><span className="label">Kaynak</span><div className="big">{asset.source}</div></div></div><p className="note">{asset.note}</p></div></div>;
}
