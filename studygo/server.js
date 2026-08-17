require('dotenv').config();
const express = require('express');
const multer = require('multer');
const path = require('path');
const Anthropic = require('@anthropic-ai/sdk');

const app = express();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 15 * 1024 * 1024 } });

app.use(express.json());
app.use(express.static(path.join(__dirname)));

const EXTRACTION_PROMPT = `You are looking at a screenshot of a student's homework/assignments page from a school platform (Canvas, Google Classroom, PowerSchool, Schoology, etc).

Read every assignment visible in the image and return ONLY a JSON array (no prose, no markdown fences) where each item has this shape:
{
  "title": string,            // assignment name
  "subject": string,          // class/course name if visible, else ""
  "dueDate": string,          // ISO date "YYYY-MM-DD" if a due date is visible, else ""
  "notes": string             // any short extra detail visible (instructions snippet, points, etc), else ""
}

Only include real assignments/tasks. Skip navigation chrome, announcements, and grades-only rows. If you can't confidently read an assignment, leave it out rather than guessing.`;

app.post('/api/extract', upload.single('screenshot'), async (req, res) => {
  if (!process.env.ANTHROPIC_API_KEY) {
    return res.status(503).json({
      error: 'Screenshot reading is not configured on this server. Add ANTHROPIC_API_KEY to studygo/.env, or just add assignments manually below.',
    });
  }
  if (!req.file) {
    return res.status(400).json({ error: 'No screenshot uploaded.' });
  }

  try {
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const base64 = req.file.buffer.toString('base64');

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-5',
      max_tokens: 2048,
      messages: [
        {
          role: 'user',
          content: [
            { type: 'image', source: { type: 'base64', media_type: req.file.mimetype, data: base64 } },
            { type: 'text', text: EXTRACTION_PROMPT },
          ],
        },
      ],
    });

    const textBlock = message.content.find(b => b.type === 'text');
    const raw = textBlock ? textBlock.text.trim() : '[]';
    const jsonMatch = raw.match(/\[[\s\S]*\]/);
    const assignments = JSON.parse(jsonMatch ? jsonMatch[0] : raw);

    res.json({ assignments });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Could not read that screenshot. Try a clearer image, or add assignments manually.' });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`StudyGO listening on ${PORT}`));
