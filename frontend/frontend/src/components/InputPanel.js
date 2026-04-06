import React from "react";

const DEFAULT_REQUESTS = [
  "50 people trapped need rescue",
  "food shortage in shelter",
  "elderly person needs medical help",
];

function InputPanel({ requests, onChange, onAnalyze, loading }) {
  return (
    <div style={styles.card}>
      <h2 style={styles.title}>Disaster Requests</h2>
      <p style={styles.subtitle}>Enter up to 3 disaster relief requests below.</p>

      {requests.map((req, index) => (
        <div key={index} style={styles.fieldGroup}>
          <label style={styles.label}>Request {index + 1}</label>
          <textarea
            style={styles.textarea}
            value={req}
            onChange={(e) => onChange(index, e.target.value)}
            rows={3}
            placeholder={`Enter request ${index + 1}...`}
          />
        </div>
      ))}

      <button
        style={loading ? { ...styles.button, ...styles.buttonDisabled } : styles.button}
        onClick={onAnalyze}
        disabled={loading}
      >
        {loading ? "Analyzing..." : "Analyze"}
      </button>
    </div>
  );
}

const styles = {
  card: {
    background: "#ffffff",
    borderRadius: "10px",
    padding: "28px",
    boxShadow: "0 2px 12px rgba(0,0,0,0.08)",
    flex: 1,
    minWidth: "300px",
  },
  title: {
    margin: "0 0 6px 0",
    fontSize: "20px",
    fontWeight: "700",
    color: "#1a1a2e",
  },
  subtitle: {
    margin: "0 0 20px 0",
    fontSize: "13px",
    color: "#666",
  },
  fieldGroup: {
    marginBottom: "16px",
  },
  label: {
    display: "block",
    fontSize: "13px",
    fontWeight: "600",
    color: "#444",
    marginBottom: "6px",
  },
  textarea: {
    width: "100%",
    boxSizing: "border-box",
    padding: "10px 12px",
    fontSize: "14px",
    border: "1px solid #ddd",
    borderRadius: "6px",
    resize: "vertical",
    fontFamily: "inherit",
    color: "#222",
    outline: "none",
    lineHeight: "1.5",
    transition: "border-color 0.2s",
  },
  button: {
    marginTop: "8px",
    width: "100%",
    padding: "14px",
    fontSize: "15px",
    fontWeight: "700",
    background: "#2563eb",
    color: "#fff",
    border: "none",
    borderRadius: "8px",
    cursor: "pointer",
    letterSpacing: "0.5px",
    transition: "background 0.2s, transform 0.1s, box-shadow 0.2s",
    boxShadow: "0 2px 8px rgba(37, 99, 235, 0.3)",
  },
  buttonDisabled: {
    background: "#93b4f5",
    cursor: "not-allowed",
    boxShadow: "none",
  },
};

export { DEFAULT_REQUESTS };
export default InputPanel;
