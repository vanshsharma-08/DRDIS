import React from 'react';

function OutputPanel({ results, loading, error }) {
  console.log("RESULT SOURCE:", results?.source);
  
  if (loading) {
    return (
      <div style={styles.loadingCard}>
        <div style={styles.loadingSpinner}></div>
        <h2>Analyzing...</h2>
        <p>Evaluating requests...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={styles.errorContainer}>
        <span style={styles.errorIcon}>⚠️</span>
        <span style={styles.errorText}>{error}</span>
      </div>
    );
  }

  if (!results) {
    return (
      <div style={styles.emptyCard}>
        <h2>🚨 FINAL DECISION</h2>
        <p>Enter requests and click Analyze.</p>
      </div>
    );
  }

  const { selected_request, assigned_volunteer, decision_score, other_requests, source } = results;
  const data = selected_request || {};
  const team = assigned_volunteer || {};

  // Fix source mapping
  const sourceValue = (source || "").trim().toLowerCase();
  
  const getSourceDisplay = (src) => {
    if (src === 'gemini') {
      return { label: 'AI (Gemini)', color: '#7c3aed' };
    }
    if (src === 'rule') {
      return { label: 'Rule-Based', color: '#059669' };
    }
    return { label: 'Unknown', color: '#6b7280' };
  };
  
  const src = getSourceDisplay(sourceValue);

  const getUrgencyConfig = (urgency) => {
    switch (urgency) {
      case 'HIGH': return { color: '#dc2626', label: 'HIGH PRIORITY', icon: '🔴' };
      case 'MEDIUM': return { color: '#ea580c', label: 'MEDIUM PRIORITY', icon: '🟠' };
      case 'LOW': return { color: '#16a34a', label: 'LOW PRIORITY', icon: '🟢' };
      default: return { color: '#6b7280', label: 'UNKNOWN', icon: '⚪' };
    }
  };

  const urgencyConfig = getUrgencyConfig(data.urgency);

  return (
    <div style={styles.dashboard}>
      {/* Hero Decision Block */}
      <div style={styles.heroCard}>
        <div style={styles.heroHeader}>
          <h2 style={styles.heroTitle}>🚨 FINAL DECISION</h2>
          <div style={styles.sourceBadge}>
            <span style={{
              backgroundColor: src.color,
              color: 'white',
              padding: '4px 12px',
              borderRadius: '12px',
              fontSize: '0.75rem',
              fontWeight: 600
            }}>
              ● {src.label}
            </span>
          </div>
        </div>

        <div style={styles.heroContent}>
          {/* Urgency - Very Large */}
          <div style={styles.urgencyBlock}>
            <span style={styles.urgencyIcon}>{urgencyConfig.icon}</span>
            <span style={{ ...styles.urgencyText, color: urgencyConfig.color }}>
              {urgencyConfig.label}
            </span>
          </div>

          {/* Key Info Grid */}
          <div style={styles.infoGrid}>
            <div style={styles.infoItem}>
              <span style={styles.infoIcon}>👥</span>
              <span style={styles.infoText}>
                {data.people_count > 0 ? `${data.people_count} People` : 'Unknown'}
              </span>
            </div>
            <div style={styles.infoItem}>
              <span style={styles.infoIcon}>📦</span>
              <span style={styles.infoText}>
                {data.needs?.[0] ? data.needs[0].toUpperCase() : 'UNKNOWN'}
              </span>
            </div>
            <div style={styles.infoItem}>
              <span style={styles.infoIcon}>👨‍🚒</span>
              <span style={styles.infoText}>
                {team.name || 'Unknown Team'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Why Section */}
      <div style={styles.whyCard}>
        <h3 style={styles.sectionTitle}>Why This Was Selected</h3>
        <ul style={styles.bulletList}>
          {data.urgency === 'HIGH' && (
            <li style={styles.bulletItem}>
              <span style={styles.check}>✔</span> Highest urgency detected
            </li>
          )}
          {data.people_count > 0 && (
            <li style={styles.bulletItem}>
              <span style={styles.check}>✔</span> {data.people_count} people affected
            </li>
          )}
          {data.needs?.[0] && (
            <li style={styles.bulletItem}>
              <span style={styles.check}>✔</span> Critical need: {data.needs[0]}
            </li>
          )}
          {data.severity_reason && (
            <li style={styles.bulletItem}>
              <span style={styles.check}>✔</span> {data.severity_reason}
            </li>
          )}
        </ul>
      </div>

      {/* Comparison Section */}
      {other_requests?.length > 0 && (
        <div style={styles.comparisonCard}>
          <h3 style={styles.sectionTitle}>Other Requests</h3>
          <div style={styles.comparisonList}>
            {other_requests.map((req, idx) => (
              <div key={idx} style={styles.comparisonItem}>
                <div style={styles.compRow}>
                  <span style={styles.compType}>
                    {req.needs?.[0] || 'Request'}
                  </span>
                  <span style={styles.compUrgency}>
                    {req.urgency || 'Unknown'}
                  </span>
                </div>
                <div style={styles.compReason}>
                  {req.reason || 'Not selected'}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

const styles = {
  dashboard: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
  },
  
  // Hero Card
  heroCard: {
    background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
    borderRadius: '16px',
    padding: '24px',
    boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1)',
    border: '1px solid #e2e8f0',
  },
  
  heroHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '20px',
  },
  
  heroTitle: {
    margin: 0,
    fontSize: '24px',
    fontWeight: '800',
    color: '#1a1a2e',
  },
  
  sourceBadge: {
    display: 'flex',
    alignItems: 'center',
  },
  
  aiBadge: {
    background: '#fef3c7',
    color: '#92400e',
    padding: '6px 12px',
    borderRadius: '20px',
    fontSize: '13px',
    fontWeight: '700',
  },
  
  ruleBadge: {
    background: '#d1fae5',
    color: '#065f46',
    padding: '6px 12px',
    borderRadius: '20px',
    fontSize: '13px',
    fontWeight: '700',
  },

  heroContent: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
  },
  
  urgencyBlock: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '12px',
    padding: '16px',
    background: '#f8fafc',
    borderRadius: '12px',
  },
  
  urgencyIcon: {
    fontSize: '28px',
  },
  
  urgencyText: {
    fontSize: '28px',
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  
  infoGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '12px',
  },
  
  infoItem: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '6px',
    padding: '12px',
    background: '#f8fafc',
    borderRadius: '10px',
  },
  
  infoIcon: {
    fontSize: '24px',
  },
  
  infoText: {
    fontSize: '16px',
    fontWeight: '700',
    color: '#1a1a2e',
    textAlign: 'center',
  },

  // Why Card
  whyCard: {
    background: '#ffffff',
    borderRadius: '16px',
    padding: '20px',
    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
  },
  
  sectionTitle: {
    margin: '0 0 12px 0',
    fontSize: '16px',
    fontWeight: '700',
    color: '#1a1a2e',
  },
  
  bulletList: {
    margin: 0,
    paddingLeft: '18px',
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  
  bulletItem: {
    fontSize: '14px',
    color: '#4b5563',
  },
  
  check: {
    color: '#2563eb',
    fontWeight: 'bold',
    marginRight: '8px',
  },

  // Comparison Card
  comparisonCard: {
    background: '#ffffff',
    borderRadius: '16px',
    padding: '20px',
    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
  },
  
  comparisonList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
  },
  
  comparisonItem: {
    padding: '12px',
    background: '#f8fafc',
    borderRadius: '8px',
    borderLeft: '3px solid #e2e8f0',
  },
  
  compRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '4px',
  },
  
  compType: {
    fontSize: '13px',
    fontWeight: '600',
    color: '#374151',
    textTransform: 'capitalize',
  },
  
  compUrgency: {
    fontSize: '11px',
    fontWeight: '600',
    color: '#6b7280',
    textTransform: 'uppercase',
  },
  
  compReason: {
    fontSize: '12px',
    color: '#6b7280',
  },

  // Loading & Empty
  loadingCard: {
    background: '#ffffff',
    borderRadius: '16px',
    padding: '40px 24px',
    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
    textAlign: 'center',
  },
  
  emptyCard: {
    background: '#ffffff',
    borderRadius: '16px',
    padding: '40px 24px',
    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
    textAlign: 'center',
  },
  
  // Inline Error
  errorContainer: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '12px 16px',
    background: '#fef2f2',
    border: '1px solid #fecaca',
    borderRadius: '8px',
    fontSize: '14px',
  },
  
  errorIcon: {
    fontSize: '16px',
  },
  
  errorText: {
    color: '#991b1b',
  },

  // Loading Spinner
  loadingSpinner: {
    width: '40px',
    height: '40px',
    border: '3px solid #e5e7eb',
    borderTop: '3px solid #2563eb',
    borderRadius: '50%',
    margin: '0 auto 16px',
    animation: 'spin 1s linear infinite',
  },
};

export default OutputPanel;