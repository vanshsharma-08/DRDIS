import React, { useState } from "react";
import InputPanel, { DEFAULT_REQUESTS } from "./components/InputPanel";
import OutputPanel from "./components/OutputPanel";

const API_URL = "http://localhost:3001/api/analyze";

const MEANINGFUL_KEYWORDS = [
  "people", "person", "injured", "trapped", "need", "help", "rescue", "medical",
  "food", "water", "shelter", "elderly", "child", "sick", "urgent", "emergency",
  "shortage", "supply", "evacuate", "missing", "dead", "hurt", "hospital",
];

function extractPeopleCount(text) {
  const match = text.match(/(\d+)\s*(?:people|person|persons|individuals|trapped|injured|affected)/i);
  if (match) return parseInt(match[1], 10);
  const numMatch = text.match(/\b(\d+)\b/);
  if (numMatch) return parseInt(numMatch[1], 10);
  return null;
}

function detectUrgency(text) {
  const lower = text.toLowerCase();
  if (/critical|trapped|dying|immediate|life.?threatening|emergency/.test(lower)) return "HIGH";
  if (/urgent|serious|severe|injured|sick|hospital/.test(lower)) return "HIGH";
  if (/need|shortage|lack|require/.test(lower)) return "MEDIUM";
  return "LOW";
}

function detectNeed(text) {
  const lower = text.toLowerCase();
  if (/rescue|trapped|evacuate|missing|stranded/.test(lower)) return ["rescue"];
  if (/medical|injured|sick|hospital|health|ambulance/.test(lower)) return ["medical"];
  if (/food|water|hungry|thirst|starv/.test(lower)) return ["food"];
  if (/shelter|homeless|displaced|housing/.test(lower)) return ["shelter"];
  if (/supply|supplies|equipment/.test(lower)) return ["supply"];
  return [];
}

function splitMultiIntent(text) {
  const parts = text.split(/\b(?:and|&|\+)\b/i).map((s) => s.trim()).filter((s) => s.length > 0);
  if (parts.length > 1) return parts;
  const commaParts = text.split(",").map((s) => s.trim()).filter((s) => s.length > 3);
  if (commaParts.length > 1) return commaParts;
  return [text];
}

function validateSingleRequest(text) {
  const trimmed = text.trim();
  // Only reject if empty or too long
  if (trimmed.length === 0) return { valid: false, reason: "Empty input" };
  if (trimmed.length > 200) return { valid: false, reason: "Too long — please keep under 200 characters" };
  return { valid: true, text: trimmed };
}

function validateAndSplitRequests(rawRequests) {
  const validRequests = [];
  const warnings = [];
  for (const raw of rawRequests) {
    const trimmed = raw.trim();
    if (trimmed.length === 0) continue;
    const subParts = splitMultiIntent(trimmed);
    for (const part of subParts) {
      const result = validateSingleRequest(part);
      if (result.valid) {
        validRequests.push(result.text);
      } else {
        warnings.push(`"${part.slice(0, 30)}..." — ${result.reason}`);
      }
    }
  }
  return { validRequests, warnings };
}

function App() {
  const [requests, setRequests] = useState([...DEFAULT_REQUESTS]);
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [validCount, setValidCount] = useState(null);

  function handleChange(index, value) {
    setRequests((prev) => {
      const updated = [...prev];
      updated[index] = value;
      return updated;
    });
  }

  async function handleAnalyze() {
    const { validRequests, warnings } = validateAndSplitRequests(requests);

    if (validRequests.length === 0) {
      setError("Please enter a clear disaster request (e.g., '10 people injured need medical help')");
      return;
    }

    if (warnings.length > 0) {
      console.warn("[DRDIS] Skipped inputs:", warnings);
    }

    setLoading(true);
    setError(null);
    setResults(null);
    setValidCount(validRequests.length);

    const formattedRequests = requests
      .filter(r => r && r.trim() !== '')
      .map(r => ({ text: r }));
    console.log("FORMATTED REQUESTS:", formattedRequests);
    
    const requestBody = { requests: formattedRequests };
    console.log("Sending requests:", requests);
    console.log("[DRDIS] API URL:", API_URL);
    console.log("[DRDIS] Valid requests:", validRequests.length);
    console.log("[DRDIS] Request body:", JSON.stringify(requestBody));

    try {
      const response = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      });

      console.log("[DRDIS] Response status:", response.status, response.statusText);

      const contentType = response.headers.get("content-type") || "";
      if (!contentType.includes("application/json")) {
        throw new Error("Backend not connected or wrong endpoint");
      }

      const data = await response.json();
      console.log("API RAW RESPONSE:", response);
      console.log("API DATA:", data);

      if (!response.ok) {
        throw new Error(data.error || `Server error: ${response.status}`);
      }

      setResults({ ...data, _validCount: validRequests.length });
      
      console.log("STATE RESULT:", { ...data, _validCount: validRequests.length });
      console.log("STATE SOURCE:", data.source);
    } catch (err) {
      console.error("[DRDIS] Error:", err.message);
      setError(err.message || "Failed to connect to the server. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={styles.page}>
      <style>{spinnerKeyframes}</style>

      <header style={styles.header}>
        <div style={styles.headerInner}>
          <div style={styles.logo}>🚨</div>
          <div>
            <h1 style={styles.headerTitle}>DRDIS</h1>
            <p style={styles.headerSub}>Disaster Relief Decision Intelligence System</p>
          </div>
        </div>
      </header>

      <main style={styles.main}>
        <div style={styles.container}>
          <div style={styles.inputPanel}>
            <InputPanel
              requests={requests}
              onChange={handleChange}
              onAnalyze={handleAnalyze}
              loading={loading}
            />
          </div>
          <div style={styles.outputPanel}>
          <OutputPanel
            results={results}
            loading={loading}
            error={error}
          />
          </div>
        </div>
      </main>

      <footer style={styles.footer}>
        <p style={styles.footerText}>DRDIS © 2026 — Disaster Relief Decision Intelligence System</p>
      </footer>
    </div>
  );
}

const spinnerKeyframes = `
  @keyframes spin {
    0%   { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
`;

const styles = {
  page: {
    minHeight: "100vh",
    background: "#f0f4f8",
    fontFamily: "'Segoe UI', Arial, sans-serif",
    display: "flex",
    flexDirection: "column",
  },
  header: {
    background: "#1a1a2e",
    padding: "18px 32px",
    boxShadow: "0 2px 8px rgba(0,0,0,0.2)",
  },
  headerInner: {
    display: "flex",
    alignItems: "center",
    gap: "14px",
    maxWidth: "900px",
    margin: "0 auto",
  },
  logo: {
    fontSize: "32px",
    lineHeight: 1,
  },
  headerTitle: {
    margin: 0,
    fontSize: "22px",
    fontWeight: "800",
    color: "#ffffff",
    letterSpacing: "1px",
  },
  headerSub: {
    margin: "2px 0 0 0",
    fontSize: "12px",
    color: "#94a3b8",
    letterSpacing: "0.3px",
  },
  main: {
    flex: 1,
    padding: "32px 24px",
    maxWidth: "900px",
    width: "100%",
    margin: "0 auto",
    boxSizing: "border-box",
  },
  container: {
    display: "flex",
    flexDirection: "row",
    gap: "24px",
    alignItems: "flex-start",
  },
  inputPanel: {
    flex: "1",
  },
  outputPanel: {
    flex: "1.2",
    padding: "24px",
  },
  footer: {
    padding: "16px 24px",
    textAlign: "center",
    borderTop: "1px solid #e2e8f0",
    background: "#fff",
  },
  footerText: {
    margin: 0,
    fontSize: "12px",
    color: "#94a3b8",
  },
};

export default App;