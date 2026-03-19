function extractJSON(text) {
  // Try to extract JSON from markdown code blocks or plain text
  const jsonMatch = text.match(/```(?:json)?\s*(\{[\s\S]*\})\s*```/) ||
                     text.match(/(\{[\s\S]*"questions"[\s\S]*\})/);

  if (jsonMatch) {
    return jsonMatch[1];
  }

  return text.trim();
}

function parse(text) {
  try {
    const jsonStr = extractJSON(text);
    const data = JSON.parse(jsonStr);

    if (!data.questions || !Array.isArray(data.questions)) {
      console.error('No questions array found in response');
      return [];
    }

    return data.questions;
  } catch (error) {
    console.error('JSON parse error:', error.message);
    return [];
  }
}

function isValidQuestion(q) {
  if (!q || typeof q !== 'object') return false;
  if (!q.text || typeof q.text !== 'string' || q.text.trim().length === 0) return false;
  if (!Array.isArray(q.options) || q.options.length !== 4) return false;
  if (typeof q.correct !== 'number' || q.correct < 0 || q.correct > 3) return false;
  if (!q.explanation || typeof q.explanation !== 'string') return false;

  // Check all options are non-empty strings
  for (let opt of q.options) {
    if (typeof opt !== 'string' || opt.trim().length === 0) return false;
  }

  return true;
}

function validate(questions, metadata = {}) {
  const valid = [];

  for (const q of questions) {
    if (!isValidQuestion(q)) {
      console.warn('Invalid question skipped:', q?.text || 'unknown');
      continue;
    }

    // Add metadata if provided
    const validated = {
      text: q.text.trim(),
      options: q.options.map(opt => String(opt).trim()),
      correct: q.correct,
      explanation: q.explanation.trim(),
      topic: q.topic || metadata.topic || 'unknown',
      difficulty: q.difficulty || metadata.difficulty || 'sedang'
    };

    valid.push(validated);
  }

  console.log(`Validated ${valid.length}/${questions.length} questions`);
  return valid;
}

module.exports = {
  parse,
  validate
};
