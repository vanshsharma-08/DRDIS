import React from "react";

const DEFAULT_REQUESTS = [
  "50 people trapped need rescue",
  "food shortage in shelter",
  "elderly person needs medical help",
];

function InputPanel({ requests, onChange, onAnalyze, loading, winningIndex }) {
  return (
    <div style={styles.card}>
      <h2 style={styles.title}>Disaster Requests</h2>
      <p style={styles.subtitle}>Enter up to 3 disaster relief requests below.</p>

      {requests.map((req, index) => {
        const isWinning = winningIndex === index;
        return (
          <div 
            key={index} 
            style={{
              ...styles.fieldGroup,
              ...(isWinning && styles.fieldGroupWinning)
            }}
          >
            <div style={styles.labelRow}>
              <label style={styles.label}>Request {index + 1}</label>
              {isWinning && (
                <span style={styles.winningBadge}>
                  <span style={styles.winningBadgeIcon}>✓</span>
                  Selected
                </span>
              )}
            </div>
            <textarea
              style={{
                ...styles.textarea,
                ...(isWinning && styles.textareaWinning)
              }}
              value={req}
              onChange={(e) => onChange(index, e.target.value)}
              rows={3}
              placeholder={`Enter request ${index + 1}...`}
            />
          </div>
        );
      })}

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
    borderRadius: "16px",
    padding: "28px",
    boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
    border: "1px solid #e2e8f0",
    flex: 1,
    minWidth: "300px",
  },
  title: {
    margin: "0 0 6px 0",
    fontSize: "20px",
    fontWeight: "700",
    color: "#1e293b",
  },
  subtitle: {
    margin: "0 0 20px 0",
    fontSize: "13px",
    color: "#64748b",
  },
  fieldGroup: {
    marginBottom: "16px",
    padding: "12px",
    borderRadius: "10px",
    background: "#f8fafc",
    border: "2px solid transparent",
    transition: "all 0.2s",
  },
  fieldGroupWinning: {
    background: "#ecfdf5",
    border: "2px solid #10b981",
    boxShadow: "0 0 0 3px rgba(16, 185, 129, 0.1)",
  },
  labelRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "6px",
  },
  label: {
    display: "block",
    fontSize: "13px",
    fontWeight: "600",
    color: "#475569",
  },
  winningBadge: {
    display: "inline-flex",
    alignItems: "center",
    gap: "4px",
    fontSize: "11px",
    fontWeight: "600",
    color: "#065f46",
    background: "#d1fae5",
    padding: "2px 8px",
    borderRadius: "12px",
  },
  winningBadgeIcon: {
    fontSize: "10px",
  },
  textarea: {
    width: "100%",
    boxSizing: "border-box",
    padding: "10px 12px",
    fontSize: "14px",
    border: "1px solid #cbd5e1",
    borderRadius: "8px",
    resize: "vertical",
    fontFamily: "inherit",
    color: "#334155",
    outline: "none",
    lineHeight: "1.5",
    transition: "border-color 0.2s, box-shadow 0.2s",
    background: "#ffffff",
  },
  textareaWinning: {
    borderColor: "#10b981",
    boxShadow: "0 0 0 3px rgba(16, 185, 129, 0.1)",
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