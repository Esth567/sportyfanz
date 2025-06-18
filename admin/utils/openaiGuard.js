// utils/openaiGuard.js

let errorCount = 0;
let cooldownUntil = null;

const MAX_ERRORS = 5;
const COOLDOWN_DURATION_MS = 1000 * 60 * 5; // 5 minutes

function isOnCooldown() {
  return cooldownUntil && Date.now() < cooldownUntil;
}

function recordOpenAIError(error) {
  if (error?.status === 429 || error?.code === 'rate_limit_exceeded') {
    errorCount++;
    console.warn(`⚠️ OpenAI 429 detected (${errorCount}/${MAX_ERRORS})`);

    if (errorCount >= MAX_ERRORS) {
      cooldownUntil = Date.now() + COOLDOWN_DURATION_MS;
      console.error(`🚫 Too many 429s. OpenAI is now in cooldown until ${new Date(cooldownUntil).toLocaleTimeString()}`);
    }
  } else {
    // Reset counter on non-rate-limit errors
    errorCount = 0;
    cooldownUntil = null;
  }
}

module.exports = {
  isOnCooldown,
  recordOpenAIError
};
