/**
 * Checks if a topic is accessible to the learner based on parent controls and mastery status.
 * 
 * @param {string} topicId - The ID of the topic to check
 * @param {Object} context - The learner context
 * @returns {Object} { allowed: boolean, reason: string }
 */
function checkTopicAllowed(topicId, context) {
  const { parentControls, topicMastery } = context;

  // 1. Check parent controls for explicit locks
  if (parentControls.locked_topics && parentControls.locked_topics.includes(topicId)) {
    return {
      allowed: false,
      reason: `Topic '${topicId}' dikunci oleh orang tua.`
    };
  }

  // 2. Check mastery status for progression locks
  const mastery = topicMastery[topicId];
  if (mastery && mastery.status === 'locked') {
    return {
      allowed: false,
      reason: `Topic '${topicId}' belum terbuka di jalur belajarmu.`
    };
  }

  // 3. Strict check against allowed whitelist if provided
  if (parentControls.allowed_topics && parentControls.allowed_topics.length > 0) {
    if (!parentControls.allowed_topics.includes(topicId)) {
      return {
        allowed: false,
        reason: `Topic '${topicId}' tidak ada dalam daftar yang diizinkan.`
      };
    }
  }

  return { allowed: true, reason: 'Topic is allowed.' };
}

module.exports = { checkTopicAllowed };
