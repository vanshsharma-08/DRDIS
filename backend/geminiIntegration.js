/**
 * DRDIS — Gemini Integration with Fallback
 * 
 * CORE LOGIC - DO NOT MODIFY
 * This module contains stable integration logic that must not be changed
 * without comprehensive test validation.
 * 
 * Rules:
 * - Rule-based parsing is primary
 * - Call Gemini ONLY if confidence < 0.7
 * - Max 1 Gemini call per request
 * - Trim input to 150 chars before sending
 * - Cache repeated inputs
 * - If Gemini fails → return rule-based result
 */

const { fallbackParse } = require('./fallbackParse');

// ─── Constants ────────────────────────────────────────────────────────────────

const CONFIDENCE_THRESHOLD = 0.7;
const MAX_INPUT_LENGTH = 300; // Increased to 300 chars
const CACHE_SIZE = 100;
const GEMINI_TIMEOUT_MS = 2000; // 2 seconds max
const RATE_LIMIT_WINDOW_MS = 60000; // 1 minute window
const RATE_LIMIT_MAX_REQUESTS = 30; // 30 requests per minute

// ─── Metrics Tracking ──────────────────────────────────────────────────────────

const metrics = {
  totalRequests: 0,
  geminiCalls: 0,
  cacheHits: 0,
  fallbackUsage: 0,
  rateLimitTriggers: 0
};

/**
 * Get current metrics snapshot
 * @returns {object} - Metrics object
 */
function getMetrics() {
  return { ...metrics };
}

/**
 * Reset all metrics to zero
 */
function resetMetrics() {
  metrics.totalRequests = 0;
  metrics.geminiCalls = 0;
  metrics.cacheHits = 0;
  metrics.fallbackUsage = 0;
  metrics.rateLimitTriggers = 0;
}

/**
 * Increment total requests counter
 */
function incrementTotalRequests() {
  metrics.totalRequests++;
}

/**
 * Increment fallback usage counter
 */
function incrementFallbackUsage() {
  metrics.fallbackUsage++;
}

// ─── Rate Limiting Implementation ──────────────────────────────────────────────

const requestCounts = new Map();

function getClientIP(req) {
  // In production, this would come from request object
  // For now, use a default or fallback
  return req?.ip || 'default';
}

function isRateLimited(ip) {
  const now = Date.now();
  const clientRequests = requestCounts.get(ip) || [];
  
  // Filter requests within the time window
  const recentRequests = clientRequests.filter(
    timestamp => now - timestamp < RATE_LIMIT_WINDOW_MS
  );
  
  if (recentRequests.length >= RATE_LIMIT_MAX_REQUESTS) {
    return true;
  }
  
  // Add current request
  recentRequests.push(now);
  requestCounts.set(ip, recentRequests);
  
  return false;
}

// ─── Cache Implementation ──────────────────────────────────────────────────────

const inputCache = new Map();

function getCacheKey(text) {
  return text.trim().toLowerCase();
}

function getCachedResult(key) {
  return inputCache.get(key);
}

function setCachedResult(key, result) {
  if (inputCache.size >= CACHE_SIZE) {
    // Remove oldest entry (first item in Map)
    const firstKey = inputCache.keys().next().value;
    inputCache.delete(firstKey);
  }
  inputCache.set(key, result);
}

// ─── Confidence Calculation ────────────────────────────────────────────────────

/**
 * Calculates confidence score based on keyword presence and text quality
 * @param {string} text - Input text
 * @returns {number} - Confidence score (0-1)
 */
function calculateConfidence(text) {
  if (!text || typeof text !== 'string') {
    return 0;
  }

  const normalized = text.toLowerCase();
  let confidence = 0.5; // Base confidence

  // High-confidence keywords
  const highConfidenceKeywords = [
    'critical', 'urgent', 'emergency', 'trapped', 'fire', 'flood',
    'medical', 'doctor', 'hospital', 'ambulance', 'injured', 'bleeding',
    'food', 'water', 'rescue', 'evacuate'
  ];

  // Medium-confidence keywords
  const mediumConfidenceKeywords = [
    'people', 'persons', 'survivors', 'victims', 'families',
    'children', 'elderly', 'pregnant', 'baby', 'infant',
    'at', 'in', 'near', 'from', 'around'
  ];

  // Check for high-confidence keywords
  for (const keyword of highConfidenceKeywords) {
    if (normalized.includes(keyword)) {
      confidence += 0.05;
    }
  }

  // Check for medium-confidence keywords
  for (const keyword of mediumConfidenceKeywords) {
    if (normalized.includes(keyword)) {
      confidence += 0.02;
    }
  }

  // Check for number patterns (people count)
  if (/\d+\s*(?:people|persons?|survivors?|victims?)/i.test(text)) {
    confidence += 0.1;
  }

  // Check for location patterns
  if (/(?:at|in|near|from|around)\s+[a-z]{3,}/i.test(text)) {
    confidence += 0.05;
  }

  // Cap at 1.0
  return Math.min(confidence, 1.0);
}

// ─── Input Trimming ────────────────────────────────────────────────────────────

/**
 * Trims input to maximum length while preserving words
 * @param {string} text - Input text
 * @returns {string} - Trimmed text
 */
function trimInput(text) {
  if (!text || typeof text !== 'string') {
    return '';
  }

  if (text.length <= MAX_INPUT_LENGTH) {
    return text;
  }

  // Trim to max length
  let trimmed = text.substring(0, MAX_INPUT_LENGTH);

  // Find last space to avoid cutting words
  const lastSpace = trimmed.lastIndexOf(' ');
  if (lastSpace > MAX_INPUT_LENGTH * 0.8) {
    trimmed = trimmed.substring(0, lastSpace);
  }

  return trimmed + '...';
}

// ─── Rule-Based Parser (Primary) ──────────────────────────────────────────────

/**
 * Rule-based parser that works independently of Gemini
 * @param {string} text - Input text
 * @returns {object} - Parsed result
 */
function ruleBasedParse(text) {
  return fallbackParse(text);
}

// ─── Gemini Call (Fallback) ───────────────────────────────────────────────────

/**
 * Calls Gemini API with trimmed input
 * @param {string} text - Input text (already trimmed)
 * @returns {Promise<object>} - Parsed result from Gemini
 */
async function callGemini(text) {
  // Simulate Gemini call (in real implementation, this would call actual API)
  // For now, use the existing simulateGeminiCall from safeGeminiCall
  const { safeGeminiCall } = require('./safeGeminiCall');
  
  try {
    // Use safeGeminiCall which already has timeout and error handling
    const result = await safeGeminiCall(text);
    return result;
  } catch (error) {
    // If Gemini fails, return null to trigger fallback
    return null;
  }
}

// ─── Response Validation ───────────────────────────────────────────────────────

/**
 * Validates Gemini response before using it
 * @param {object} response - Response from Gemini
 * @returns {boolean} - True if response is valid
 */
function validateResponse(response) {
  if (!response || typeof response !== 'object') {
    return false;
  }

  // Check required fields
  if (typeof response.urgency !== 'string') {
    return false;
  }

  if (!Array.isArray(response.needs)) {
    return false;
  }

  if (typeof response.people_count !== 'number' || !Number.isFinite(response.people_count)) {
    return false;
  }

  // Validate urgency value
  const validUrgencies = ['HIGH', 'MEDIUM', 'LOW'];
  if (!validUrgencies.includes(response.urgency)) {
    return false;
  }

  // Validate needs array
  if (!response.needs.every(n => typeof n === 'string')) {
    return false;
  }

  // Validate people_count is non-negative
  if (response.people_count < 0) {
    return false;
  }

  return true;
}

// ─── Global Error Handler ──────────────────────────────────────────────────────

/**
 * Global error handler that prevents crashes
 * @param {Error} error - Error object
 * @param {string} context - Context where error occurred
 * @returns {void}
 */
function handleError(error, context) {
  // Log error without sensitive data
  const errorMessage = error?.message || 'Unknown error';
  const safeContext = context?.substring(0, 50) || 'unknown';
  
  // In production, this would log to a monitoring service
  // For now, we just suppress the error to prevent crashes
  console.error(`[Gemini Integration] Error in ${safeContext}: ${errorMessage}`);
}

// ─── Main Integration Function ────────────────────────────────────────────────

/**
 * Main Gemini integration function with fallback rules
 * 
 * Rules:
 * - Rule-based is primary
 * - Call Gemini ONLY if confidence < 0.7
 * - Max 1 Gemini call per request
 * - Trim input to 150 chars before sending
 * - Cache repeated inputs
 * - If Gemini fails → return rule-based result
 * 
 * @param {string} text - Input text to parse
 * @param {object} req - Request object (for rate limiting)
 * @returns {Promise<object>} - Parsed result
 */
async function parseWithGemini(text, req = null) {
  try {
    // Track total requests
    metrics.totalRequests++;

    // Validate input
    if (!text || typeof text !== 'string') {
      metrics.fallbackUsage++;
      return ruleBasedParse(text);
    }

    // Check input length (reject if exceeded)
    if (text.length > MAX_INPUT_LENGTH) {
      console.warn(`[Gemini Integration] Input too long: ${text.length} chars`);
      metrics.fallbackUsage++;
      return ruleBasedParse(text.substring(0, MAX_INPUT_LENGTH));
    }

    // Rate limiting check
    const ip = getClientIP(req);
    if (isRateLimited(ip)) {
      console.warn(`[Gemini Integration] Rate limit exceeded for IP: ${ip}`);
      metrics.rateLimitTriggers++;
      metrics.fallbackUsage++;
      return ruleBasedParse(text);
    }

    // Trim input
    const trimmedText = trimInput(text);

    // Check cache
    const cacheKey = getCacheKey(trimmedText);
    const cachedResult = getCachedResult(cacheKey);
    if (cachedResult) {
      metrics.cacheHits++;
      return cachedResult;
    }

    // Calculate confidence
    const confidence = calculateConfidence(trimmedText);

    // Rule-based parsing (primary)
    const ruleBasedResult = ruleBasedParse(trimmedText);

    // Only call Gemini if confidence is low
    if (confidence < CONFIDENCE_THRESHOLD) {
      try {
        // Track Gemini call
        metrics.geminiCalls++;

        // Call Gemini with timeout (max 1 call per request)
        const geminiPromise = callGemini(trimmedText);
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error('Gemini timeout')), GEMINI_TIMEOUT_MS);
        });

        const geminiResult = await Promise.race([geminiPromise, timeoutPromise]);

        // Validate response before using
        if (geminiResult && validateResponse(geminiResult)) {
          // Gemini succeeded - use its result
          setCachedResult(cacheKey, geminiResult);
          return geminiResult;
        }
        // If Gemini fails or returns invalid response, fall through to rule-based result
        metrics.fallbackUsage++;
      } catch (error) {
        // Gemini failed - use rule-based result
        handleError(error, 'Gemini call');
        metrics.fallbackUsage++;
      }
    } else {
      // High confidence - using rule-based directly
      metrics.fallbackUsage++;
    }

    // Use rule-based result (either confidence was high, or Gemini failed)
    setCachedResult(cacheKey, ruleBasedResult);
    return ruleBasedResult;
  } catch (error) {
    // Global error handler - never crash
    handleError(error, 'parseWithGemini');
    metrics.fallbackUsage++;
    return ruleBasedParse(text || '');
  }
}

// ─── Exports ───────────────────────────────────────────────────────────────────

module.exports = { parseWithGemini, getMetrics, resetMetrics, incrementTotalRequests, incrementFallbackUsage };

// SAFEGUARD: Any changes to this file require:
// 1. All existing tests to pass
// 2. New test cases for any modified behavior
// 3. Review by senior engineer
// 4. Documentation of changes
