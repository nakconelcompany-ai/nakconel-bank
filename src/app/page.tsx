export default function HomePage() {
  return (
    <main style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <h1 style={{ color: "#d4a017", marginBottom: 8 }}>Nakconel Bank</h1>
      <p style={{ opacity: 0.8, marginBottom: 24 }}>Phase 1 API is live</p>
      <a
        href="/api/v1/health"
        style={{ color: "#0a0505", background: "#d4a017", padding: "10px 20px", borderRadius: 8, textDecoration: "none", fontWeight: 600 }}
      >
        Check API Health
      </a>
    </main>
  );
}
