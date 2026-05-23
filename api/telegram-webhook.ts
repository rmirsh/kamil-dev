import type { VercelRequest, VercelResponse } from '@vercel/node';

const REPO = 'rmirsh/kamil-dev';
const BRANCH = 'master';

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim()
    .slice(0, 50);
}

function parseMessage(text: string): {
  title: string;
  blurb: string;
  body: string;
  tags: string[];
} {
  const hashtagRegex = /#(\w+)/g;
  const allHashtags = [...text.matchAll(hashtagRegex)].map((m) => m[1]);
  const tags = allHashtags.filter((t) => t !== 'site');

  const cleanText = text
    .replace(/#\w+/g, '')
    .replace(/[ \t]+/g, ' ')
    .split('\n')
    .map((l) => l.trim())
    .join('\n')
    .trim();

  const lines = cleanText.split('\n').filter(Boolean);
  const title = lines[0] || 'untitled';
  const bodyLines = lines.slice(1).join('\n\n').trim();
  const body = bodyLines || title;
  const blurb = bodyLines.slice(0, 160) || title.slice(0, 160);

  return { title, blurb, body, tags };
}

async function commitFile(path: string, content: string, token: string): Promise<void> {
  const encoded = Buffer.from(content).toString('base64');

  const res = await fetch(`https://api.github.com/repos/${REPO}/contents/${path}`, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
    },
    body: JSON.stringify({
      message: `post: ${path}`,
      content: encoded,
      branch: BRANCH,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`GitHub ${res.status}: ${err}`);
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'method not allowed' });
  }

  const secret = process.env.TELEGRAM_WEBHOOK_SECRET;
  if (secret && req.headers['x-telegram-bot-api-secret-token'] !== secret) {
    return res.status(401).json({ error: 'unauthorized' });
  }

  const update = req.body;
  const message = update?.channel_post || update?.message;

  if (!message?.text || !message.text.includes('#site')) {
    return res.status(200).json({ ok: true, skipped: true });
  }

  const githubToken = process.env.GITHUB_TOKEN;
  if (!githubToken) {
    return res.status(500).json({ error: 'GITHUB_TOKEN not set' });
  }

  const { title, blurb, body, tags } = parseMessage(message.text);
  const date = new Date(message.date * 1000);
  const dateStr = date.toISOString().split('T')[0];
  const slug = slugify(title);
  const filename = `${dateStr}-${slug}`;

  const tagsLine = tags.length ? `\ntags: [${tags.join(', ')}]` : '';
  const mdx = `---\ntitle: ${title}\ndate: ${dateStr}\nblurb: ${blurb}${tagsLine}\n---\n\n${body}\n`;
  const path = `src/content/blog/${filename}.mdx`;

  try {
    await commitFile(path, mdx, githubToken);
    return res.status(200).json({ ok: true, path });
  } catch (err) {
    console.error('webhook error:', err);
    return res.status(500).json({ error: String(err) });
  }
}
