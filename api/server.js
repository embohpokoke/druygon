const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');
const session = require('express-session');

// Load .env FIRST before any other modules that read env vars
dotenv.config({ path: path.join(__dirname, '.env') });

// Now load modules that depend on env vars
const providerManager = require('./providers');
const rateLimiter = require('./middleware/rate-limiter');
const costTracker = require('./middleware/cost-tracker');
const questionValidator = require('./validators/question');
const authManager = require('./auth-manager');
const oauthRoutes = require('./routes/oauth');

const app = express();
const PORT = process.env.PORT || 3847;

// Middleware
app.use(cors({
  origin: ['https://druygon.my.id', 'http://localhost:3000'],
  credentials: true
}));
app.use(express.json());

// Session (for OAuth support)
if (process.env.OAUTH_ENABLED === 'true') {
  app.use(session({
    secret: process.env.SESSION_SECRET || 'druygon-secret-change-in-production',
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === 'production',
      httpOnly: true,
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    }
  }));
}

app.use(rateLimiter);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// AI Provider status
app.get('/api/ai/status', async (req, res) => {
  try {
    const status = await providerManager.getStatus();
    const costs = costTracker.getSummary();
    res.json({
      success: true,
      providers: status,
      costs: costs,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get AI config
app.get('/api/ai/config', (req, res) => {
  res.json({
    success: true,
    config: {
      fallbackOrder: (process.env.FALLBACK_ORDER || 'gemini,openai,anthropic').split(','),
      defaultProvider: process.env.DEFAULT_PROVIDER || 'gemini',
      maxRequestsPerDay: parseInt(process.env.MAX_REQUESTS_PER_DAY || '50'),
      budgetRemaining: costTracker.getRemainingBudget(),
      oauthEnabled: process.env.OAUTH_ENABLED === 'true',
      authStatus: authManager.getAuthStatus(req)
    }
  });
});

// OAuth routes (optional authentication)
app.use('/api/oauth', oauthRoutes);

// Generate questions
app.post('/api/ai/generate', async (req, res) => {
  try {
    const { subject = 'matematika', topic, difficulty = 'sedang', count = 5, grade = 5 } = req.body;

    const prompt = require('./prompts/question-gen').buildPrompt({
      subject,
      topic,
      difficulty,
      count,
      grade
    });

    const result = await providerManager.complete(prompt, {
      maxTokens: 800,
      temperature: 0.7
    });

    let questions = questionValidator.parse(result.text);
    questions = questionValidator.validate(questions, { topic, difficulty });

    if (questions.length === 0) {
      throw new Error('No valid questions generated');
    }

    // Track cost
    costTracker.recordRequest({
      provider: result.provider,
      inputTokens: result.inputTokens || 0,
      outputTokens: result.outputTokens || 0,
      endpoint: 'generate'
    });

    res.json({
      success: true,
      provider: result.provider,
      questions: questions.slice(0, count),
      metadata: {
        topic,
        difficulty,
        generatedAt: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Generate error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      fallback: 'local'
    });
  }
});

// AI Tutor chat
app.post('/api/ai/chat', async (req, res) => {
  try {
    const { message, context = {}, subject = 'matematika' } = req.body;

    if (!message || message.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Message is required'
      });
    }

    const prompt = require('./prompts/tutor-chat').buildPrompt({
      message,
      context,
      subject
    });

    const result = await providerManager.complete(prompt, {
      maxTokens: 300,
      temperature: 0.8
    });

    // Track cost
    costTracker.recordRequest({
      provider: result.provider,
      inputTokens: result.inputTokens || 0,
      outputTokens: result.outputTokens || 0,
      endpoint: 'chat'
    });

    res.json({
      success: true,
      provider: result.provider,
      message: result.text,
      metadata: {
        respondedAt: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Chat error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      message: 'Maaf, Draco sedang istirahat. Coba lagi nanti ya! 😴'
    });
  }
});

// Assessment
app.post('/api/ai/assess', async (req, res) => {
  try {
    const { subject = 'matematika', grade = 5, topics = [] } = req.body;

    const prompt = require('./prompts/assessment').buildPrompt({
      subject,
      grade,
      topics
    });

    const result = await providerManager.complete(prompt, {
      maxTokens: 1200,
      temperature: 0.6
    });

    let questions = questionValidator.parse(result.text);
    questions = questionValidator.validate(questions, { difficulty: 'mixed' });

    if (questions.length === 0) {
      throw new Error('No valid assessment questions generated');
    }

    // Track cost
    costTracker.recordRequest({
      provider: result.provider,
      inputTokens: result.inputTokens || 0,
      outputTokens: result.outputTokens || 0,
      endpoint: 'assess'
    });

    res.json({
      success: true,
      provider: result.provider,
      questions: questions.slice(0, 15),
      metadata: {
        subject,
        grade,
        generatedAt: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Assessment error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      fallback: 'local'
    });
  }
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found'
  });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({
    success: false,
    error: err.message || 'Internal server error'
  });
});

app.listen(PORT, () => {
  console.log(`🚀 Druygon AI API running on port ${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/api/health`);
  console.log(`🧠 AI Status: http://localhost:${PORT}/api/ai/status`);
});

module.exports = app;
