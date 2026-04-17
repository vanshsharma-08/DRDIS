import React from 'react';

function OutputPanel({ results, loading, error }) {
  if (loading) {
    return (
      <div style={styles.loadingContainer}>
        <div style={styles.loadingSpinner}></div>
        <h2 style={styles.loadingTitle}>Analyzing Field Reports...</h2>
        <p style={styles.loadingSubtitle}>Evaluating priorities and matching resources</p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={styles.errorContainer}>
        <div style={styles.errorIcon}>⚠️</div>
        <div style={styles.errorContent}>
          <h3 style={styles.errorTitle}>Connection Error</h3>
          <p style={styles.errorText}>{error}</p>
        </div>
      </div>
    );
  }

  if (!results) {
    return (
      <div style={styles.emptyContainer}>
        <div style={styles.emptyIcon}>🚨</div>
        <h2 style={styles.emptyTitle}>Final Decision Dashboard</h2>
        <p style={styles.emptySubtitle}>Enter field reports and click Analyze to see results</p>
      </div>
    );
  }

    const { selected_request, assigned_volunteer, decision_score, other_requests, source, reasons } = results || {};
    const data = selected_request || {};
    const team = assigned_volunteer || {};
    
    // Calculate progress bar percentage (max score assumed to be 200)
    const maxScore = 200;
    const progressPercentage = Math.min((decision_score || 0) / maxScore * 100, 100);

  // Handle reasons array or fallback to data.reasons
  const reasonsList = reasons || data.reasons || [];

  // Get source display config
  const getSourceDisplay = (src) => {
    if (src === 'gemini') {
      return { 
        label: '🤖 AI Fallback (Vague Input)', 
        bgColor: '#f3e8ff',
        textColor: '#6b21a8',
        borderColor: '#e9d5ff'
      };
    }
    if (src === 'rule') {
      return { 
        label: '⚡ Rule Engine Assessed', 
        bgColor: '#d1fae5',
        textColor: '#065f46',
        borderColor: '#a7f3d0'
      };
    }
    return { 
      label: 'Unknown Source', 
      bgColor: '#f3f4f6',
      textColor: '#4b5563',
      borderColor: '#e5e7eb'
    };
  };

  const sourceConfig = getSourceDisplay(source);

  // Get urgency config based on decision_score
  const getUrgencyConfig = (score) => {
    if (score >= 100) {
      return { 
        color: '#dc2626', 
        bgColor: '#fef2f2',
        label: 'HIGH PRIORITY', 
        icon: '🔴' 
      };
    } else if (score >= 50) {
      return { 
        color: '#d97706', 
        bgColor: '#fffbeb',
        label: 'MEDIUM PRIORITY', 
        icon: '🟠' 
      };
    } else {
      return { 
        color: '#059669', 
        bgColor: '#ecfdf5',
        label: 'LOW PRIORITY', 
        icon: '🟢' 
      };
    }
  };

  const urgencyConfig = getUrgencyConfig(decision_score);

  // Get reason icons
  const getReasonIcon = (reasonText) => {
    const lower = reasonText.toLowerCase();
    if (lower.includes('score') || lower.includes('priority')) return '📊';
    if (lower.includes('urgency') || lower.includes('critical')) return '🚨';
    if (lower.includes('team') || lower.includes('assigned')) return '👨‍🚒';
    if (lower.includes('people') || lower.includes('affected')) return '👥';
    if (lower.includes('need') || lower.includes('require')) return '📦';
    return '✓';
  };

  return (
    <div style={styles.dashboard}>
      {/* Selected Emergency Callout */}
      <div style={styles.selectedEmergencyCard}>
        <div style={styles.selectedHeader}>
          <span style={styles.selectedLabel}>Prioritized Community Need</span>
          <span style={{
            ...styles.selectedSource,
            backgroundColor: sourceConfig.bgColor,
            color: sourceConfig.textColor,
            borderColor: sourceConfig.borderColor
          }}>
            {sourceConfig.label}
          </span>
        </div>
        <div style={styles.selectedContent}>
            <p 
              style={styles.selectedText}
              title={data?.text || 'No text available'}
            >
              {data?.text || 'No community need selected'}
            </p>
        </div>
      </div>

      {/* Main Decision Card */}
      <div style={styles.decisionCard}>
        <div style={styles.decisionHeader}>
          <h2 style={styles.decisionTitle}>Final Decision</h2>
        </div>

        {/* Score and Progress Bar Group */}
        <div style={styles.scoreGaugeContainer}>
          <div style={styles.scoreGaugeHeader}>
            <span style={styles.scoreLabel}>Decision Score</span>
          </div>
          <div style={styles.scoreGaugeValueContainer}>
            <span style={styles.scoreValue}>{decision_score?.toFixed(2) || '0.00'}</span>
          </div>
          <div style={styles.progressBarContainer}>
            <div style={{
              ...styles.progressBarFill,
              width: `${progressPercentage}%`
            }}></div>
          </div>
          <div style={styles.scoreMicroCopy}>
            Proprietary Severity Index (Max: 200)
          </div>
        </div>

        {/* Urgency Display */}
        <div style={{
          ...styles.urgencyBlock,
          backgroundColor: urgencyConfig.bgColor
        }}>
          <span style={styles.urgencyIcon}>{urgencyConfig.icon}</span>
          <span style={{
            ...styles.urgencyText,
            color: urgencyConfig.color
          }}>
            {urgencyConfig.label}
          </span>
        </div>

        {/* Key Info Grid */}
        <div style={styles.infoGrid}>
          <div style={styles.infoItem}>
            <div style={styles.infoIconWrapper}>
              <span style={styles.infoIcon}>👥</span>
            </div>
            <div style={styles.infoContent}>
              <span style={styles.infoLabel}>People Affected</span>
              <span style={styles.infoValue}>
                {data?.people_count > 0 ? data.people_count : 'Unknown'}
              </span>
            </div>
          </div>

          <div style={styles.infoItem}>
            <div style={styles.infoIconWrapper}>
              <span style={styles.infoIcon}>📦</span>
            </div>
            <div style={styles.infoContent}>
              <span style={styles.infoLabel}>Critical Need</span>
              <span style={styles.infoValue}>
                {data?.needs?.[0] ? data.needs[0].toUpperCase() : 'UNKNOWN'}
              </span>
            </div>
          </div>

          <div style={styles.infoItem}>
            <div style={styles.infoIconWrapper}>
              <span style={styles.infoIcon}>📍</span>
            </div>
            <div style={styles.infoContent}>
              <span style={styles.infoLabel}>Location</span>
              <span style={styles.infoValue}>
                {data?.location_tag || 'Unknown Area'}
              </span>
            </div>
          </div>

          <div style={styles.infoItem}>
            <div style={styles.infoIconWrapper}>
              <span style={styles.infoIcon}>👨‍🚒</span>
            </div>
            <div style={styles.infoContent}>
              <span style={styles.infoLabel}>Assigned Team</span>
              <span style={styles.infoValue}>
                {team.name || 'Emergency Response Team'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Decision Logic Chain */}
      <div style={styles.logicChainCard}>
        <h3 style={styles.sectionTitle}>Decision Logic Chain</h3>
        <div style={styles.logicChain}>
          {reasonsList && reasonsList.length > 0 ? (
            reasonsList.map((reason, idx) => (
              <div key={idx} style={styles.logicItem}>
                <div style={styles.logicIconWrapper}>
                  <span style={styles.logicIcon}>{getReasonIcon(reason)}</span>
                </div>
                <div style={styles.logicContent}>
                  <span style={styles.logicText}>{reason}</span>
                </div>
                {idx < reasonsList.length - 1 && <div style={styles.logicConnector} />}
              </div>
            ))
          ) : (
            <div style={styles.fallbackReasons}>
              <div style={styles.logicItem}>
                <div style={styles.logicIconWrapper}>
                  <span style={styles.logicIcon}>✓</span>
                </div>
                <div style={styles.logicContent}>
                  <span style={styles.logicText}>Standard triage protocols applied.</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Other Requests Comparison */}
      {other_requests?.length > 0 && (
        <div style={styles.comparisonCard}>
          <h3 style={styles.sectionTitle}>Other Requests Considered</h3>
          <div style={styles.comparisonList}>
            {other_requests.map((req, idx) => (
              <div key={idx} style={styles.comparisonItem}>
                <div style={styles.comparisonHeader}>
                  <span style={styles.comparisonType}>
                    {req.needs?.[0] || 'Request'} #{idx + 1}
                  </span>
                  <span style={{
                    ...styles.comparisonUrgency,
                    color: req.urgency === 'HIGH' ? '#dc2626' : 
                           req.urgency === 'MEDIUM' ? '#d97706' : '#059669'
                  }}>
                    {req.urgency || 'Unknown'}
                  </span>
                </div>
                <div style={styles.comparisonReason}>
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
    gap: '24px',
    fontFamily: 'system-ui, -apple-system, sans-serif',
  },

  // Selected Emergency Card
  selectedEmergencyCard: {
    background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
    borderRadius: '16px',
    padding: '24px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
    border: '1px solid #e2e8f0',
  },
  selectedHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '16px',
  },
  selectedLabel: {
    fontSize: '12px',
    fontWeight: '600',
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },
  selectedSource: {
    fontSize: '11px',
    fontWeight: '600',
    padding: '4px 10px',
    borderRadius: '12px',
    border: '1px solid',
  },
  selectedContent: {
    display: 'flex',
    alignItems: 'flex-start',
  },
  selectedText: {
    fontSize: '18px',
    fontWeight: '500',
    color: '#1e293b',
    lineHeight: '1.4',
    margin: 0,
    flex: 1,
    wordBreak: 'break-word',
    whiteSpace: 'normal',
    overflowWrap: 'anywhere',
  },

  // Decision Card
  decisionCard: {
    background: '#ffffff',
    borderRadius: '16px',
    padding: '24px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
    border: '1px solid #e2e8f0',
  },
  decisionHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '20px',
  },
  decisionTitle: {
    fontSize: '20px',
    fontWeight: '700',
    color: '#1e293b',
    margin: 0,
  },
  scoreBadge: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-end',
    gap: '2px',
  },
  scoreLabel: {
    fontSize: '10px',
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },
  scoreValue: {
    fontSize: '18px',
    fontWeight: '700',
    color: '#1e293b',
  },
  progressBarContainer: {
    height: '6px',
    background: '#e2e8f0',
    borderRadius: '3px',
    overflow: 'hidden',
    marginBottom: '8px',
  },
  progressBarFill: {
    height: '100%',
    background: 'linear-gradient(90deg, #3b82f6, #2563eb)',
    borderRadius: '3px',
    transition: 'width 0.5s ease',
  },
  scoreGaugeContainer: {
    marginBottom: '20px',
  },
  scoreGaugeHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '4px',
  },
  scoreGaugeValueContainer: {
    textAlign: 'center',
    marginBottom: '8px',
  },
  scoreMicroCopy: {
    fontSize: '11px',
    color: '#64748b',
    textAlign: 'center',
    marginTop: '8px',
    letterSpacing: '0.3px',
  },
  urgencyBlock: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '12px',
    padding: '16px',
    borderRadius: '12px',
    marginBottom: '20px',
  },
  urgencyIcon: {
    fontSize: '24px',
  },
  urgencyText: {
    fontSize: '20px',
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: '1px',
  },
  infoGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gap: '16px',
  },
  infoItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '12px',
    background: '#f8fafc',
    borderRadius: '10px',
  },
  infoIconWrapper: {
    width: '36px',
    height: '36px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: '#ffffff',
    borderRadius: '8px',
    boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
  },
  infoIcon: {
    fontSize: '18px',
  },
  infoContent: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
  },
  infoLabel: {
    fontSize: '11px',
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: '0.3px',
  },
  infoValue: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#1e293b',
  },

  // Decision Logic Chain
  logicChainCard: {
    background: '#ffffff',
    borderRadius: '16px',
    padding: '24px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
    border: '1px solid #e2e8f0',
  },
  sectionTitle: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#475569',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    marginBottom: '16px',
  },
  logicChain: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0',
  },
  logicItem: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '12px',
    padding: '12px',
    background: '#f8fafc',
    borderRadius: '8px',
    position: 'relative',
  },
  logicIconWrapper: {
    width: '32px',
    height: '32px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: '#ffffff',
    borderRadius: '6px',
    boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
    flexShrink: 0,
  },
  logicIcon: {
    fontSize: '14px',
  },
  logicContent: {
    flex: 1,
    paddingTop: '2px',
  },
  logicText: {
    fontSize: '13px',
    color: '#1e293b',
    lineHeight: '1.4',
    fontWeight: '500',
    wordBreak: 'break-word',
    whiteSpace: 'normal',
    overflowWrap: 'anywhere',
  },
  logicConnector: {
    position: 'absolute',
    left: '27px',
    top: '44px',
    bottom: '-8px',
    width: '2px',
    background: '#e2e8f0',
  },
  fallbackReasons: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0',
  },

  // Comparison Card
  comparisonCard: {
    background: '#ffffff',
    borderRadius: '16px',
    padding: '24px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
    border: '1px solid #e2e8f0',
  },
  comparisonList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  comparisonItem: {
    padding: '14px',
    background: '#f8fafc',
    borderRadius: '10px',
    borderLeft: '3px solid #cbd5e1',
  },
  comparisonHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '6px',
  },
  comparisonType: {
    fontSize: '13px',
    fontWeight: '600',
    color: '#475569',
  },
  comparisonUrgency: {
    fontSize: '11px',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: '0.3px',
  },
  comparisonReason: {
    fontSize: '12px',
    color: '#64748b',
  },

  // Loading State
  loadingContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '60px 24px',
    background: '#ffffff',
    borderRadius: '16px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
    border: '1px solid #e2e8f0',
  },
  loadingSpinner: {
    width: '48px',
    height: '48px',
    border: '3px solid #e2e8f0',
    borderTop: '3px solid #3b82f6',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
    marginBottom: '20px',
  },
  loadingTitle: {
    fontSize: '18px',
    fontWeight: '600',
    color: '#1e293b',
    margin: '0 0 8px 0',
  },
  loadingSubtitle: {
    fontSize: '14px',
    color: '#64748b',
    margin: 0,
  },

  // Error State
  errorContainer: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
    padding: '20px',
    background: '#fef2f2',
    borderRadius: '12px',
    border: '1px solid #fecaca',
  },
  errorIcon: {
    fontSize: '24px',
  },
  errorContent: {
    flex: 1,
  },
  errorTitle: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#991b1b',
    margin: '0 0 4px 0',
  },
  errorText: {
    fontSize: '13px',
    color: '#b91c1c',
    margin: 0,
  },

  // Empty State
  emptyContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '60px 24px',
    background: '#ffffff',
    borderRadius: '16px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
    border: '1px solid #e2e8f0',
  },
  emptyIcon: {
    fontSize: '48px',
    marginBottom: '16px',
  },
  emptyTitle: {
    fontSize: '18px',
    fontWeight: '600',
    color: '#1e293b',
    margin: '0 0 8px 0',
  },
  emptySubtitle: {
    fontSize: '14px',
    color: '#64748b',
    margin: 0,
    textAlign: 'center',
  },
};

export default OutputPanel;