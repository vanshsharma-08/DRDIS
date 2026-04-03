/**
 * DRDIS — Input Validator
 * Entry gate for all incoming requests.
 * No exceptions. No crashes. Always returns { valid, errors }.
 */

const MIN_REQUESTS = 1;
const MAX_REQUESTS = 10;
const MIN_TEXT_LENGTH = 1;
const MAX_TEXT_LENGTH = 300;

/**
 * Validates an array of disaster response requests.
 *
 * @param {any} requests - The input to validate (expected: array of objects with `text`)
 * @returns {{ valid: boolean, errors: string[], data: Array<{ text: string }> | null }}
 *   - valid: true only if all checks pass
 *   - errors: list of human-readable error messages (empty if valid)
 *   - data: cleaned/trimmed request array if valid, null otherwise
 */
function validateInput(requests) {
  const errors = [];

  // Guard: must be an array
  if (!Array.isArray(requests)) {
    return {
      valid: false,
      errors: ['Input must be an array of requests.'],
      data: null,
    };
  }

  // Guard: array length 1–10
  if (requests.length < MIN_REQUESTS || requests.length > MAX_REQUESTS) {
    return {
      valid: false,
      errors: [
        `Array must contain between ${MIN_REQUESTS} and ${MAX_REQUESTS} requests. Received: ${requests.length}.`,
      ],
      data: null,
    };
  }

  const cleanedRequests = [];

  for (let i = 0; i < requests.length; i++) {
    const item = requests[i];
    const index = i + 1; // 1-based for user-facing messages

    // Each item must be a non-null object
    if (item === null || typeof item !== 'object' || Array.isArray(item)) {
      errors.push(`Request #${index}: must be a non-null object.`);
      cleanedRequests.push(null);
      continue;
    }

    // `text` field must exist
    if (!Object.prototype.hasOwnProperty.call(item, 'text')) {
      errors.push(`Request #${index}: missing required field "text".`);
      cleanedRequests.push(null);
      continue;
    }

    // `text` must be a string
    if (typeof item.text !== 'string') {
      errors.push(`Request #${index}: field "text" must be a string. Received type: ${typeof item.text}.`);
      cleanedRequests.push(null);
      continue;
    }

    // Trim whitespace
    const trimmedText = item.text.trim();

    // Validate trimmed length: 1–300 chars
    if (trimmedText.length < MIN_TEXT_LENGTH) {
      errors.push(`Request #${index}: "text" must not be empty after trimming whitespace.`);
      cleanedRequests.push(null);
      continue;
    }

    if (trimmedText.length > MAX_TEXT_LENGTH) {
      errors.push(
        `Request #${index}: "text" exceeds maximum length of ${MAX_TEXT_LENGTH} characters (got ${trimmedText.length}).`
      );
      cleanedRequests.push(null);
      continue;
    }

    cleanedRequests.push({ text: trimmedText });
  }

  if (errors.length > 0) {
    return {
      valid: false,
      errors,
      data: null,
    };
  }

  return {
    valid: true,
    errors: [],
    data: cleanedRequests,
  };
}

module.exports = { validateInput };
