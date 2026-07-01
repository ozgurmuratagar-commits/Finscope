"use client";

import { useEffect, useMemo, useState } from "react";

type MarketData = {
  usdTry: number;
  eurTry: number;
  gbpTry: number;
  goldUsd: number;
  silverUsd: number;
  xu100: number;
  updatedAt: string;
  notes: string[];
};

function formatNumber(value: number, digits = 2) {
  return new Intl.NumberFormat("tr-TR", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits
  }).format(value || 0);
}

function generateAnalysis(data: MarketData) {
  const comments: string[] = [];

  if (data.usdTry >= 40) comments.push("USD/TL güçlü bölgede; kur tarafında baskı hissediliyor.");
  else comments.push("USD/TL görece sakin bölgede izleniyor.");

  if (data.goldUsd >= 2350) comments.push("Altın ons tarafında güçlü görünüm korunuyor.");
  else comments.push("Altın ons tarafında momentum zayıf görünüyor.");

  if (data.xu100 >= 10000) comments.push("BIST 100 psikolojik eşik üzerinde tutunuyor.");
  else comments.push("BIST 100 tarafında zayıf görünüm öne çıkıyor.");

  return comments.join(" ");
}

export default function Page() {
  const [data, setData] = useState<MarketData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadMarket() {
    try {
      setError("");
      const res = await fetch("/api/market", { cache: "no-store" });
      if (!res.ok) throw new Error("Veri alınamadı");
      const json = await res.json();
      setData(json);
    } catch {
      setError("Veriler alınırken sorun oluştu. Biraz sonra tekrar deneyin.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadMarket();
    const timer = setInterval(loadMarket, 15000);
    return () => clearInterval(timer);
  }, []);

  const analysis = useMemo(() => (data ? generateAnalysis(data) : ""), [data]);

  return (
    <main style={styles.page}>
      <section style={styles.hero}>
        <div>
          <div style={styles.badge}>Canlı Demo</div>
          <h1 style={styles.title}>FinScope</h1>
          <p style={styles.subtitle}>Döviz, kıymetli maden ve BIST verilerini tek ekranda izleyen sade piyasa paneli.</p>
        </div>
        <div style={styles.status}>{loading ? "Veri alınıyor..." : "15 sn’de bir güncellenir"}</div>
      </section>

      {error && <div style={styles.error}>{error}</div>}

      <section style={styles.grid}>
        <Card title="USD / TRY" value={data ? formatNumber(data.usdTry) : "..."} detail="Amerikan doları" tone="blue" />
        <Card title="EUR / TRY" value={data ? formatNumber(data.eurTry) : "..."} detail="Euro" tone="blue" />
        <Card title="GBP / TRY" value={data ? formatNumber(data.gbpTry) : "..."} detail="Sterlin" tone="blue" />
        <Card title="Altın Ons" value={data ? `$${formatNumber(data.goldUsd)}` : "..."} detail="USD bazlı" tone="gold" />
        <Card title="Gümüş Ons" value={data ? `$${formatNumber(data.silverUsd)}` : "..."} detail="USD bazlı" tone="silver" />
        <Card title="BIST 100" value={data ? formatNumber(data.xu100, 0) : "..."} detail="XU100" tone="green" />
      </section>

      <section style={styles.panel}>
        <div style={styles.panelTitle}>AI Analist</div>
        <p style={styles.analysis}>{data ? analysis : "Veri bekleniyor..."}</p>
        {data?.notes?.length ? (
          <div style={styles.notes}>
            {data.notes.map((n, i) => (
              <div key={i}>• {n}</div>
            ))}
          </div>
        ) : null}
      </section>

      <footer style={styles.footer}>
        Son güncelleme: {data ? new Date(data.updatedAt).toLocaleString("tr-TR") : "..."}
      </footer>
    </main>
  );
}

function Card({ title, value, detail, tone }: { title: string; value: string; detail: string; tone: "blue" | "gold" | "silver" | "green" }) {
  const accent = tone === "gold" ? "#F5C86A" : tone === "silver" ? "#CBD5E1" : tone === "green" ? "#2EE59D" : "#7AA2FF";

  return (
    <div style={styles.card}>
      <div style={styles.cardTop}>
        <span style={styles.cardTitle}>{title}</span>
        <span style={{ ...styles.dot, background: accent }} />
      </div>
      <div style={styles.value}>{value}</div>
      <div style={styles.detail}>{detail}</div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: "100vh",
    padding: 24,
    color: "#EAF0FF",
    fontFamily: "Arial, Helvetica, sans-serif",
    background: "radial-gradient(circle at top left, #16213A 0%, #0B1220 42%, #070B14 100%)"
  },
  hero: {
    display: "flex",
    justifyContent: "space-between",
    gap: 20,
    alignItems: "flex-end",
    maxWidth: 1040,
    margin: "0 auto 24px"
  },
  badge: {
    display: "inline-block",
    padding: "6px 10px",
    borderRadius: 999,
    background: "rgba(122,162,255,0.14)",
    color: "#9DB9FF",
    fontSize: 12,
    marginBottom: 10
  },
  title: { fontSize: 42, lineHeight: 1, margin: "0 0 8px", letterSpacing: -1.2 },
  subtitle: { color: "#9AA6B2", margin: 0, maxWidth: 560, fontSize: 15, lineHeight: 1.5 },
  status: { color: "#9AA6B2", fontSize: 13, whiteSpace: "nowrap" },
  grid: {
    maxWidth: 1040,
    margin: "0 auto",
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
    gap: 14
  },
  card: {
    padding: 18,
    borderRadius: 18,
    background: "rgba(255,255,255,0.055)",
    border: "1px solid rgba(255,255,255,0.1)",
    boxShadow: "0 20px 45px rgba(0,0,0,0.22)"
  },
  cardTop: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 },
  cardTitle: { color: "#A7B0C0", fontSize: 13 },
  dot: { width: 9, height: 9, borderRadius: 999, display: "inline-block" },
  value: { fontSize: 30, fontWeight: 600, letterSpacing: -0.8, marginBottom: 6 },
  detail: { color: "#6B768A", fontSize: 12 },
  panel: {
    maxWidth: 1040,
    margin: "16px auto 0",
    padding: 20,
    borderRadius: 18,
    background: "rgba(255,255,255,0.045)",
    border: "1px solid rgba(255,255,255,0.1)"
  },
  panelTitle: { color: "#7AA2FF", fontSize: 14, marginBottom: 8 },
  analysis: { color: "#DDE6FF", lineHeight: 1.65, margin: 0 },
  notes: { marginTop: 12, color: "#FFCF7A", fontSize: 12, lineHeight: 1.5 },
  error: {
    maxWidth: 1040,
    margin: "0 auto 14px",
    color: "#FF8A96",
    background: "rgba(255,90,106,0.08)",
    padding: 12,
    borderRadius: 12
  },
  footer: { maxWidth: 1040, margin: "16px auto 0", color: "#6B768A", fontSize: 12 }
};
