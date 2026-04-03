/**
 * Checks if a topic is accessible to the learner based on parent controls and mastery status.
 * 
 * FIXED 2026-04-03: Now merges learning_objectives.subjects into allowed check.
 * Old behavior: only checked static allowed_topics list (stale seed data).
 * New behavior: if learning_objectives exists, use its non-locked subjects as primary whitelist.
 */

function normalizeTopicId(topicId) {
  const aliases = {
    matematika_fpb_kpk: ['matematika_fpb_kpk', 'kpk', 'fpb'],
    bahasa_ind_puisi: ['bahasa_ind_puisi'],
    sains_sda: ['sains_sda'],
    ppkn_hak_kewajiban: ['ppkn_hak_kewajiban'],
    bahasa_ing_jobs: ['bahasa_ing_jobs'],
    kpk: ['kpk'],
    fpb: ['fpb'],
    perkalian: ['perkalian'],
    pembagian: ['pembagian'],
    pecahan: ['pecahan'],
    geometri: ['geometri']
  };

  return aliases[topicId] || [topicId];
}

function checkTopicAllowed(topicId, context) {
  const { parentControls, topicMastery } = context;
  const candidates = normalizeTopicId(topicId);

  // 1. Check parent controls for explicit locks
  if (parentControls.locked_topics && candidates.some(t => parentControls.locked_topics.includes(t))) {
    return {
      allowed: false,
      reason: `Topic '${topicId}' dikunci oleh orang tua.`
    };
  }

  // 2. Check learning_objectives locks (subjects marked locked: true)
  const objectives = parentControls.learning_objectives;
  if (objectives && objectives.subjects) {
    const lockedByObjective = objectives.subjects
      .filter(s => s.locked)
      .map(s => s.id);
    if (candidates.some(t => lockedByObjective.includes(t))) {
      return {
        allowed: false,
        reason: `Topic '${topicId}' dikunci di kurikulum minggu ini.`
      };
    }
  }

  // 3. Check mastery status — BUT only block if topic is explicitly locked in mastery
  //    Topics NOT in mastery table are allowed (they might be new subjects from objectives)
  const lockedByMastery = candidates.some(t => topicMastery[t] && topicMastery[t].status === 'locked');
  if (lockedByMastery) {
    // Exception: if the topic is enabled in learning_objectives, objectives override mastery lock
    if (objectives && objectives.subjects) {
      const enabledInObjectives = objectives.subjects
        .filter(s => !s.locked)
        .map(s => s.id);
      const overridden = candidates.some(t => enabledInObjectives.includes(t));
      if (overridden) {
        // Parent explicitly enabled this topic in objectives — allow it
        return { allowed: true, reason: 'Topic allowed by learning objectives (overrides mastery lock).' };
      }
    }
    return {
      allowed: false,
      reason: `Topic '${topicId}' belum terbuka di jalur belajarmu.`
    };
  }

  // 4. Whitelist check — use learning_objectives as PRIMARY source if available
  if (objectives && objectives.subjects && objectives.subjects.length > 0) {
    const objectiveIds = objectives.subjects
      .filter(s => !s.locked)
      .map(s => s.id);
    
    // Merge with static allowed_topics for backward compat
    const allAllowed = new Set([
      ...objectiveIds,
      ...(parentControls.allowed_topics || [])
    ]);

    const allowed = candidates.some(t => allAllowed.has(t));
    if (!allowed) {
      return {
        allowed: false,
        reason: `Topic '${topicId}' tidak ada di kurikulum saat ini.`
      };
    }
  } else if (parentControls.allowed_topics && parentControls.allowed_topics.length > 0) {
    // Fallback: no objectives, use static allowed_topics
    const allowed = candidates.some(t => parentControls.allowed_topics.includes(t));
    if (!allowed) {
      return {
        allowed: false,
        reason: `Topic '${topicId}' tidak ada dalam daftar yang diizinkan.`
      };
    }
  }

  return { allowed: true, reason: 'Topic is allowed.' };
}

module.exports = { checkTopicAllowed, normalizeTopicId };
