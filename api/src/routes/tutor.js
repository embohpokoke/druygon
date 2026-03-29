const express = require('express');
const router = express.Router();
const pool = require('../runtime/db');
const { startSession, chatTurn, endSession } = require('../runtime/session_engine');

/**
 * GET /api/tutor/subjects
 * Returns dynamic learning objectives for the UI.
 */
router.get('/subjects', async (req, res) => {
  try {
    const { learner_id } = req.query;
    if (!learner_id) {
      return res.status(400).json({ error: 'learner_id is required' });
    }

    const result = await pool.query(
      'SELECT overrides FROM druygon.parent_controls WHERE learner_id = $1',
      [learner_id]
    );

    const overrides = result.rows[0]?.overrides || {};
    const objectives = overrides.learning_objectives || { subjects: [], period: 'Umum' };

    res.json({
      subjects: objectives.subjects,
      period: objectives.period
    });
  } catch (error) {
    console.error('Fetch Subjects Error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/tutor/parent/objectives
 * Fetches full objective details for the parent dashboard.
 */
router.get('/parent/objectives', async (req, res) => {
  try {
    const { learner_id } = req.query;
    if (!learner_id) return res.status(400).json({ error: 'learner_id is required' });

    const result = await pool.query(
      'SELECT overrides FROM druygon.parent_controls WHERE learner_id = $1',
      [learner_id]
    );

    const overrides = result.rows[0]?.overrides || {};
    res.json(overrides.learning_objectives || { subjects: [], period: '', draco_note: '' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * PATCH /api/tutor/parent/objectives
 * Updates the learning objectives in parent_controls.
 */
router.patch('/parent/objectives', async (req, res) => {
  try {
    const { learner_id, subjects, period, draco_note } = req.body;
    if (!learner_id) return res.status(400).json({ error: 'learner_id is required' });

    const result = await pool.query(
      'SELECT overrides FROM druygon.parent_controls WHERE learner_id = $1',
      [learner_id]
    );
    
    let overrides = result.rows[0]?.overrides || {};
    
    overrides.learning_objectives = {
      week: new Date().toISOString().split('T')[0],
      period: period,
      subjects: subjects,
      draco_note: draco_note
    };

    await pool.query(
      `UPDATE druygon.parent_controls 
       SET overrides = $2::jsonb,
           last_updated_at = NOW()
       WHERE learner_id = $1`,
      [learner_id, JSON.stringify(overrides)]
    );

    res.json({ success: true, message: 'Kurikulum berhasil diperbarui! ✨' });
  } catch (error) {
    console.error('Update Objectives Error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/tutor/start
 * Initializes a new learning session for a learner.
 */
router.post('/start', async (req, res) => {
  try {
    const { learner_id } = req.body;
    if (!learner_id) {
      return res.status(400).json({ error: 'learner_id is required' });
    }

    const { sessionId, context, soulPrompt } = await startSession(learner_id);
    
    res.json({
      session_id: sessionId,
      learner_name: context.learner.name,
      soul_prompt_preview: soulPrompt ? soulPrompt.substring(0, 80) + '...' : ''
    });
  } catch (error) {
    console.error('Tutor Start Error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/tutor/chat
 * Handles a chat turn with Draco.
 */
router.post('/chat', async (req, res) => {
  try {
    const { session_id, learner_id, message, topic, history } = req.body;
    
    if (!session_id || !learner_id || !message || !topic) {
      return res.status(400).json({ error: 'Missing required fields (session_id, learner_id, message, topic)' });
    }

    const result = await chatTurn(session_id, learner_id, message, topic, history || []);
    res.json(result);
  } catch (error) {
    console.error('Tutor Chat Error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/tutor/end
 * Ends the session and saves progress/summaries.
 */
router.post('/end', async (req, res) => {
  try {
    const { session_id, learner_id, topics_played } = req.body;
    
    if (!session_id || !learner_id) {
      return res.status(400).json({ error: 'Missing session_id or learner_id' });
    }

    const result = await endSession(session_id, learner_id, topics_played || []);
    res.json(result);
  } catch (error) {
    console.error('Tutor End Error:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
