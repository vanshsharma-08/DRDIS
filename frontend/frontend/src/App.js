import React, { useState } from "react";
import InputPanel, { DEFAULT_REQUESTS } from "./components/InputPanel";
import OutputPanel from "./components/OutputPanel";

const API_URL = "http://localhost:3001/analyze";

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
    const result = validateSingleRequest(trimmed);
    if (result.valid) {
      validRequests.push(result.text);
    } else {
      warnings.push(`"${trimmed.slice(0, 30)}..." — ${result.reason}`);
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
      // Skipped inputs warnings
    }

    // State Cleanup on Submit: Clear everything immediately
    setLoading(true);
    setError(null);
    setResults(null);
    setValidCount(null);

    const formattedRequests = requests
      .filter(r => r && r.trim() !== '')
      .map(r => ({ text: r }));
    
    const requestBody = { requests: formattedRequests };

    try {
      const response = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      });

      

      const contentType = response.headers.get("content-type") || "";
      if (!contentType.includes("application/json")) {
        throw new Error("Backend not connected or wrong endpoint");
      }

      const data = await response.json();
      

      if (!response.ok) {
        throw new Error(data.error || `Server error: ${response.status}`);
      }

      // Store the original requests array for mapping
      const originalRequests = formattedRequests.map(r => r.text);
      
      // Find winning text from the API response
      const selectedText = data?.selected_request?.text;
      
      // Fix AI Fallback Bug: Ensure selected_request has the correct text
      // If backend doesn't return text, use the first valid request
      let finalSelectedText = selectedText;
      if (!finalSelectedText || finalSelectedText === "No community need selected") {
        if (originalRequests.length > 0) {
          // Fallback: use the first valid request if no match found
          finalSelectedText = originalRequests[0];
          // Try to find a better match by looking for keywords
          const keywordMatch = originalRequests.find(req => 
            req.toLowerCase().includes('trapped') || 
            req.toLowerCase().includes('injured') || 
            req.toLowerCase().includes('emergency')
          );
          if (keywordMatch) finalSelectedText = keywordMatch;
        } else {
          finalSelectedText = 'No emergency selected';
        }
      }
      
      const enhancedData = {
        ...data,
        selected_request: {
          ...data?.selected_request,
          text: finalSelectedText
        },
        _validCount: validRequests.length
      };
      
      setResults(enhancedData);
      
      
    } catch (err) {
      // State Cleanup on Error: Clear results
      setResults(null);
      setValidCount(null);
      
      // Check if it's a network error
      if (err.message.includes('Failed to fetch') || err.message.includes('network')) {
        setError('Unable to reach Triage Server. Please check connection.');
      } else {
        setError(err.message || "Failed to connect to the server. Please try again.");
      }
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
              selectedText={results?.selected_request?.text}
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
    background: "#f8fafc",
    fontFamily: "system-ui, -apple-system, sans-serif",
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
    background: "#f8fafc",
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