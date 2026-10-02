import express from 'express';
import path from 'path';
import crypto from 'crypto';
import dotenv from 'dotenv';
import {
  BedrockRuntimeClient,
  InvokeModelCommand,
} from '@aws-sdk/client-bedrock-runtime';
import {
  DynamoDBClient,
  PutItemCommand,
  GetItemCommand,
  ScanCommand,
} from '@aws-sdk/client-dynamodb';
import { marshall, unmarshall } from '@aws-sdk/util-dynamodb';

dotenv.config();

const app = express();
app.use(express.json());

// ── AWS clients ──────────────────────────────────────────────────────────────
const AWS_REGION = process.env.AWS_REGION || 'ap-southeast-2';
const BEDROCK_MODEL_ID = process.env.BEDROCK_MODEL_ID || 'apac.amazon.nova-lite-v1:0';

const bedrockClient = new BedrockRuntimeClient({ region: AWS_REGION });
const dynamoClient  = new DynamoDBClient({ region: AWS_REGION });

const TABLE_NAME = process.env.DYNAMO_TABLE || 'wardvoice-issues';

// ── Types ────────────────────────────────────────────────────────────────────
export interface IssueReport {
  text: string;
  ts: number;
}

export interface Issue {
  id: string;
  category: string;
  location: string;
  urgency: string;
  dept: string;
  channel: string;
  confidence: number;
  reason: string;
  reports: IssueReport[];
  first_ts: number;
  letter_en: string;
  letter_ta: string;
  official_no: string;
  admin_closed: boolean;
  votes: Record<string, number>;
  verified: boolean;
}

// ── Static data ───────────────────────────────────────────────────────────────
export const DEPT: Record<string, [string, string]> = {
  flooding:     ['GCC Storm Water Drain Department', 'GCC 1913 or the GCC online grievance portal'],
  sewage:       ['CMWSSB (Metro Water) - sewerage', 'Metro Water complaint channel (verify current number)'],
  water_supply: ['CMWSSB (Metro Water) - supply', 'Metro Water complaint channel (verify current number)'],
  streetlight:  ['GCC Electrical Department', 'GCC 1913 or the GCC online grievance portal'],
  garbage:      ['GCC Solid Waste Management', 'GCC 1913 or the Swachhata app'],
  road:         ['GCC Bus Route Roads Department', 'GCC 1913 or Tamil Nadu 1100'],
};

const CATEGORY_TA: Record<string, string> = {
  flooding:     'மழைநீர் தேக்கம் / வெள்ளம்',
  sewage:       'கழிவுநீர் வெளியேற்றம் / சாக்கடை அடைப்பு',
  water_supply: 'குடிநீர் விநியோகத் தடை',
  streetlight:  'தெருவிளக்கு பழுது',
  garbage:      'குப்பை அகற்றப்படாத நிலை',
  road:         'சாலை பள்ளம் / சேதம்',
};

const KW: Record<string, string[]> = {
  streetlight:  ['விளக்கு', 'மின்விளக்கு', 'light', 'vilakku', 'lamp', 'dark', 'irutu', 'bulb', 'velicham', 'eriyala', 'post'],
  flooding:     ['வெள்ளம்', 'தேங்கி', 'மழை நீர்', 'flood', 'standing', 'stagnant', 'rain', 'mazhai', 'thanni nikk', 'waterlog', 'drain', 'waterlogging'],
  sewage:       ['சாக்கடை', 'கழிவுநீர்', 'துர்நாற்றம்', 'sewage', 'kazhivu', 'stink', 'smell', 'overflow', 'manhole', 'drainage', 'saakadi'],
  water_supply: ['குடிநீர்', 'குழாய்', 'no water', 'tap', 'supply', 'lorry', 'thanni varala', 'drinking water', 'metro water', 'kudineer'],
  garbage:      ['குப்பை', 'garbage', 'kuppai', 'waste', 'trash', 'dump', 'bin', 'cleared', 'alukku', 'thottil'],
  road:         ['குழி', 'சாலை', 'pothole', 'pallam', 'road damage', 'broken road', 'road', 'tar', 'bitumen'],
};

// ── DynamoDB helpers ──────────────────────────────────────────────────────────
async function dbPut(item: Issue): Promise<void> {
  await dynamoClient.send(new PutItemCommand({
    TableName: TABLE_NAME,
    Item: marshall(item, { removeUndefinedValues: true }),
  }));
}

async function dbGet(id: string): Promise<Issue | null> {
  const res = await dynamoClient.send(new GetItemCommand({
    TableName: TABLE_NAME,
    Key: marshall({ id }),
  }));
  return res.Item ? (unmarshall(res.Item) as Issue) : null;
}

async function dbScan(): Promise<Issue[]> {
  const res = await dynamoClient.send(new ScanCommand({ TableName: TABLE_NAME }));
  return (res.Items || []).map(i => unmarshall(i) as Issue);
}

// ── NLP helpers ───────────────────────────────────────────────────────────────
function toks(s: string): Set<string> {
  const matches = (s.toLowerCase().match(/\w+/g) || []).filter(w => w.length > 2);
  return new Set(matches);
}

function findDup(rec: { category: string; location?: string }, issues: Issue[]) {
  let best: Issue | null = null;
  let highestScore = 0;

  for (const it of issues) {
    if (it.category !== rec.category || it.verified) continue;
    const a = toks(rec.location || '');
    const b = toks(it.location);
    if (a.size === 0 || b.size === 0) continue;

    let intersect = 0;
    for (const w of a) { if (b.has(w)) intersect++; }
    const union = new Set([...a, ...b]).size;
    const s = union > 0 ? intersect / union : 0;
    if (s > highestScore) { best = it; highestScore = s; }
  }

  if (best && highestScore >= 0.25) {
    return {
      id: best.id,
      location: best.location,
      reports: best.reports.length,
      score: Math.round(highestScore * 100) / 100,
    };
  }
  return null;
}

function heuristicExtract(text: string) {
  const t = text.toLowerCase();
  const scores: Record<string, number> = {};
  for (const [c, words] of Object.entries(KW)) {
    scores[c] = words.reduce((acc, k) => acc + (t.includes(k.toLowerCase()) ? 1 : 0), 0);
  }

  let bestCat   = 'road';
  let bestScore = -1;
  for (const [c, s] of Object.entries(scores)) {
    if (s > bestScore) { bestScore = s; bestCat = c; }
  }

  const match       = t.match(/(near|opposite|beside|at|in|behind)\s+([^.,\n]{3,50})/i);
  const loc         = match ? match[0].trim() : text.split(/\s+/).slice(0, 4).join(' ');
  const confidence  = bestScore > 1 ? 0.85 : bestScore === 1 ? 0.65 : 0.35;

  return {
    category: bestScore > 0 ? bestCat : 'road',
    urgency:  bestCat === 'flooding' || bestCat === 'sewage' ? 'high' : 'medium',
    location: loc || 'Chennai locality',
    duration: 'several days',
    risk:     bestCat === 'streetlight'
      ? 'dark road causing safety risk for pedestrians and vehicles'
      : 'public hygiene, health, and commute hazard',
    missing_information: ['exact door/pole number', 'ward number'],
    confidence,
    reason: `Identified civic pattern matching ${bestCat.replace('_', ' ')}`,
    source: 'fallback',
  };
}

// ── Amazon Bedrock (Nova Lite via APAC inference profile) ───────────────────
async function bedrockInvoke(prompt: string): Promise<string> {
  const body = JSON.stringify({
    messages: [{ role: 'user', content: [{ text: prompt }] }],
    inferenceConfig: {
      maxTokens: 1024,
      temperature: 0.1,
    },
  });

  const cmd = new InvokeModelCommand({
    modelId: BEDROCK_MODEL_ID,
    contentType: 'application/json',
    accept: 'application/json',
    body: Buffer.from(body),
  });

  const response = await bedrockClient.send(cmd);
  const text = Buffer.from(response.body).toString('utf-8');
  const parsed = JSON.parse(text);
  return parsed.output?.message?.content?.[0]?.text || '';
}

async function extractComplaint(text: string) {
  try {
    const prompt = `You triage civic complaints from Chennai residents. Input may be Tamil, English or Tanglish.
Return ONLY valid JSON with keys:
- category: exactly one of: flooding, sewage, water_supply, streetlight, garbage, road
- urgency: exactly one of: low, medium, high
- location: concise English place or street name (e.g. "near Velachery bus stop", "2nd Street, Adyar")
- duration: concise timeframe (e.g. "3 days", "since morning", "2 weeks")
- risk: public safety, health, accident or flooding hazard
- missing_information: array of strings of missing details (e.g. ["exact ward number", "landmark"])
- confidence: number between 0 and 1
- reason: one concise sentence explaining why this category

Complaint text:
${text.slice(0, 800)}`;

    const raw     = await bedrockInvoke(prompt);
    const jsonStr = raw.replace(/^```(?:json)?\n?/i, '').replace(/\n?```\s*$/i, '').trim();
    const parsed  = JSON.parse(jsonStr);

    if (parsed.category && DEPT[parsed.category]) {
      parsed.confidence = typeof parsed.confidence === 'number' ? parsed.confidence : 0.85;
      parsed.source = 'bedrock';
      return parsed;
    }
  } catch (e: any) {
    console.warn('Bedrock extraction failed, using heuristic fallback:', e?.message || e);
  }
  return heuristicExtract(text);
}

// ── Bedrock Tamil Translation ────────────────────────────────────────────────
async function translateToTamilWithBedrock(englishText: string): Promise<string> {
  try {
    const prompt = `Translate the following formal civic complaint letter into natural, formal Tamil (in Tamil script). Return ONLY the Tamil translation text without any preamble, English explanations, or markdown code blocks:

${englishText}`;
    const tamilText = await bedrockInvoke(prompt);
    return tamilText.trim() || 'Tamil translation unavailable';
  } catch (e: any) {
    console.warn('Bedrock Tamil translation failed, falling back:', e?.message || e);
    return 'Tamil translation unavailable';
  }
}

function fallbackDraft(rec: any, n: number): [string, string] {
  const dept    = DEPT[rec.category]?.[0] || 'Greater Chennai Corporation';
  const loc     = rec.location || 'the specified location';
  const catNice = (rec.category || 'civic').replace('_', ' ');
  const risk    = rec.risk || 'public safety hazard';
  const dur     = rec.duration || 'several days';
  const catTa   = CATEGORY_TA[rec.category] || catNice;

  const en = `To: The Officer-in-Charge, ${dept}, Greater Chennai.

Sub: Urgent civic grievance - ${catNice} issue at ${loc} (Endorsed by ${n} resident${n === 1 ? '' : 's'}).

Respected Authority,
Residents of ${loc} bring to your urgent notice a persisting ${catNice} problem lasting for ${dur}.
This situation creates an immediate ${risk} for local residents, school children, and commuters.
This issue has been formally tracked and verified by ${n} resident(s) on WardVoice.

Kindly arrange an on-site technical inspection immediately and provide an official resolution timeline.

Yours sincerely,
[Name]
Ward Residents Collective`;

  const ta = `பெறுநர்: பொறுப்பு அதிகாரி, ${dept}, பெருநகர சென்னை.

பொருள்: உடனடி மக்கள் குறைதீர்ப்பு மனு - ${loc} பகுதியில் ${catTa} பிரச்சனை (${n} பகுதிவாசிகளின் கோரிக்கை).

மதிப்பிற்குரிய அதிகாரிகளுக்கு,
வணக்கம். ${loc} பகுதியில் கடந்த ${dur} காலமாக தீவிர ${catTa} பிரச்சனை நிலவி வருகிறது.
இதனால் இப்பகுதி மக்கள், பள்ளி மாணவர்கள் மற்றும் பாதசாரிகளுக்கு ${risk} ஏற்பட்டுள்ளது.
இப்பிரச்சனை வார்டுவாய்ச் (WardVoice) மூலம் ${n} பகுதிவாசிகளால் பதிவு செய்யப்பட்டு ஒருங்கிணைக்கப்பட்டுள்ளது.

தயவுசெய்து உடனடியாக கள ஆய்வு மேற்கொண்டு, உரிய தீர்வு காணுமாறு பணிவுடன் கேட்டுக்கொள்கிறோம்.

இப்படிக்கு,
[பெயர்]
இப்பகுதி வாழ் பொதுமக்கள்`;

  return [en, ta];
}

async function draftLetter(rec: any, n: number): Promise<[string, string]> {
  const dept = DEPT[rec.category]?.[0] || 'Greater Chennai Corporation';
  try {
    const prompt = `Write a formal civic complaint letter to ${dept}, Greater Chennai.
Issue details:
- Category: ${rec.category}
- Location: ${rec.location}
- Risk: ${rec.risk}
- Duration: ${rec.duration}
- Number of resident complaints endorsed: ${n}

Return ONLY valid JSON with one field:
"letter_en": Formal English letter (max 120 words) with salutation, body, request for inspection. Use [Name] as placeholder.`;

    const raw     = await bedrockInvoke(prompt);
    const jsonStr = raw.replace(/^```(?:json)?\n?/i, '').replace(/\n?```\s*$/i, '').trim();
    const parsed  = JSON.parse(jsonStr);

    if (parsed.letter_en) {
      const letter_en = parsed.letter_en.trim();
      const letter_ta = await translateToTamilWithBedrock(letter_en);
      return [letter_en, letter_ta || 'Tamil translation unavailable'];
    }
  } catch (e: any) {
    console.warn('Bedrock letter drafting failed, falling back:', e?.message || e);
  }
  return fallbackDraft(rec, n);
}

async function createNewIssue(
  rec: any, text: string, en: string, ta: string, ts?: number,
): Promise<Issue> {
  const timestamp  = ts || Math.floor(Date.now() / 1000);
  const [dept, channel] = DEPT[rec.category] || ['Greater Chennai Corporation', 'GCC 1913'];
  const id = 'W-' + crypto.randomBytes(2).toString('hex').toUpperCase();

  const issue: Issue = {
    id,
    category:    rec.category,
    location:    rec.location || 'not stated',
    urgency:     rec.urgency  || 'medium',
    dept,
    channel,
    confidence:  rec.confidence ?? 0.7,
    reason:      rec.reason   || '',
    reports:     [{ text, ts: timestamp }],
    first_ts:    timestamp,
    letter_en:   en,
    letter_ta:   ta,
    official_no: '',
    admin_closed: false,
    votes:        {},
    verified:     false,
  };

  await dbPut(issue);
  return issue;
}

async function seedIssues() {
  const now = Math.floor(Date.now() / 1000);
  const day = 86400;

  const samples = [
    {
      text: 'Velachery Main Road near bus stop, water standing since 3 days, mosquito problem and severe stagnation',
      category: 'flooding', location: 'near Velachery bus stop', days: 6, extra: 3,
      official: 'GCC-2024-FL-8104',
      risk: 'public health, dengue mosquito breeding, traffic blockage', duration: '6 days',
      admin_closed: false, votes: { fixed: 1, not_fixed: 2 },
    },
    {
      text: 'street light work aagala near 2nd Street Adyar, night romba dark accidents happening',
      category: 'streetlight', location: '2nd Street Adyar', days: 4, extra: 2,
      official: '',
      risk: 'pedestrian safety hazard, dark blind spots at night', duration: '4 days',
      admin_closed: false, votes: {},
    },
    {
      text: 'kuppai not cleared for a week opposite Anna Nagar market, overflowing onto pedestrian walkway',
      category: 'garbage', location: 'Anna Nagar market', days: 9, extra: 4,
      official: 'SWACHH-TN-9921',
      risk: 'foul stench, stray animals, severe sanitation hazard', duration: '9 days',
      admin_closed: true, votes: { not_fixed: 3, temporary: 1 },
    },
    {
      text: 'Sewage overflow on Usman Road near Panagal Park, manhole bubbling foul water onto street',
      category: 'sewage', location: 'near Panagal Park, Usman Road', days: 2, extra: 1,
      official: 'MW-SEW-4392',
      risk: 'contamination of shop fronts, toxic stench', duration: '2 days',
      admin_closed: false, votes: {},
    },
    {
      text: 'Deep crater pothole on Luz Church Road Mylapore, two-wheelers skidding frequently',
      category: 'road', location: 'Luz Church Road, Mylapore', days: 12, extra: 5,
      official: 'GCC-RD-11029',
      risk: 'major vehicular damage, fatal road accidents for bikers', duration: '12 days',
      admin_closed: true, votes: { fixed: 2 },
    },
  ];

  for (const s of samples) {
    const rec = {
      category: s.category, location: s.location,
      risk: s.risk, duration: s.duration,
      confidence: 0.92, reason: 'Verified neighborhood sample data',
    };
    const [en, ta] = fallbackDraft(rec, 1 + s.extra);
    const issue    = await createNewIssue(rec, s.text, en, ta, now - s.days * day);
    issue.official_no  = s.official;
    issue.admin_closed = s.admin_closed;
    issue.votes        = { ...s.votes } as Record<string, number>;
    issue.verified     = ((s.votes as any).fixed || 0) >= 2;

    for (let i = 1; i <= s.extra; i++) {
      issue.reports.push({
        text: `Neighbor verification report #${i}: Issue still persisting at ${s.location}.`,
        ts:   now - (s.days - i) * day,
      });
    }
    await dbPut(issue);
  }
  console.log('Seed data written to DynamoDB.');
}

// ── API Endpoints ─────────────────────────────────────────────────────────────

app.post('/api/issues', async (_req, res) => {
  try {
    const issues = (await dbScan()).sort((a, b) => a.first_ts - b.first_ts);
    res.json(issues);
  } catch (err: any) {
    console.error('Error in /api/issues:', err);
    res.status(500).json({ error: 'Failed to load issues.' });
  }
});

app.post('/api/seed', async (_req, res) => {
  try {
    await seedIssues();
    res.json({ ok: true });
  } catch (err: any) {
    console.error('Error in /api/seed:', err);
    res.status(500).json({ error: 'Seed failed.' });
  }
});

app.post('/api/analyze', async (req, res) => {
  try {
    const text = String(req.body.text || '').trim().slice(0, 800);
    if (text.length < 8) {
      res.status(400).json({ error: 'Describe the problem in a few words.' });
      return;
    }

    const rec = await extractComplaint(text);
    const deptInfo = DEPT[rec.category] || DEPT.road;
    rec.department = deptInfo[0];
    rec.channel    = deptInfo[1];
    rec.clarify    = rec.confidence < 0.6 ? 'Is this on a GCC road, or inside a private layout?' : '';

    const issues    = await dbScan();
    const duplicate = findDup(rec, issues);
    res.json({ rec, duplicate });
  } catch (err: any) {
    console.error('Error in /api/analyze:', err);
    res.status(500).json({ error: 'Something went wrong. Try again.' });
  }
});

app.post('/api/submit', async (req, res) => {
  try {
    const { rec, text, join_id } = req.body;
    const cleanText = String(text || '').slice(0, 800);

    if (join_id) {
      const issue = await dbGet(join_id);
      if (!issue) { res.status(404).json({ error: 'issue not found' }); return; }
      issue.reports.push({ text: cleanText, ts: Math.floor(Date.now() / 1000) });
      const [en, ta] = await draftLetter(rec || issue, issue.reports.length);
      issue.letter_en = en;
      issue.letter_ta = ta;
      await dbPut(issue);
      res.json(issue);
      return;
    }

    const [en, ta] = await draftLetter(rec, 1);
    const newIssue = await createNewIssue(rec, cleanText, en, ta);
    res.json(newIssue);
  } catch (err: any) {
    console.error('Error in /api/submit:', err);
    res.status(500).json({ error: 'Something went wrong. Try again.' });
  }
});

app.post('/api/official', async (req, res) => {
  try {
    const { id, number, close } = req.body;
    const issue = await dbGet(id);
    if (!issue) { res.status(404).json({ error: 'issue not found' }); return; }
    if (number !== undefined) issue.official_no = String(number).trim().slice(0, 40);
    if (close) issue.admin_closed = true;
    await dbPut(issue);
    res.json(issue);
  } catch (err: any) {
    console.error('Error in /api/official:', err);
    res.status(500).json({ error: 'Something went wrong. Try again.' });
  }
});

app.post('/api/verify', async (req, res) => {
  try {
    const { id, result } = req.body;
    const validResults = ['fixed', 'partial', 'not_fixed', 'wrong_issue', 'temporary'];
    if (!validResults.includes(result)) { res.status(400).json({ error: 'bad result' }); return; }

    const issue = await dbGet(id);
    if (!issue) { res.status(404).json({ error: 'issue not found' }); return; }
    issue.votes[result] = (issue.votes[result] || 0) + 1;
    issue.verified = (issue.votes.fixed || 0) >= 2;
    await dbPut(issue);
    res.json(issue);
  } catch (err: any) {
    console.error('Error in /api/verify:', err);
    res.status(500).json({ error: 'Something went wrong. Try again.' });
  }
});

// ── Static files setup (called once before Lambda starts or server starts) ────
export function setupStaticServing() {
  app.use(express.static(path.join(process.cwd(), 'dist')));
  app.get('*', (_req, res) => {
    res.sendFile(path.resolve('dist', 'index.html'));
  });
}

// Export app for Lambda (serverless-express wraps it)
setupStaticServing(); // always mount static in production bundle
export { app };

// ── Direct server startup (dev / non-Lambda) ──────────────────────────────────
async function startServer() {
  const isProduction = process.env.NODE_ENV === 'production';

  if (!isProduction) {
    // In dev, mount Vite middleware instead of static files
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    // Insert Vite before static middleware — prepend at front
    app.use(vite.middlewares);
  }

  const PORT = Number(process.env.PORT || 3000);
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`WardVoice server running on http://0.0.0.0:${PORT}`);
  });
}

// Only start the HTTP server when run directly (not via Lambda)
if (!process.env.AWS_LAMBDA_FUNCTION_NAME) {
  startServer();
}

