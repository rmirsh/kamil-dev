export const prerender = false;

import type { APIRoute } from 'astro';

const REPO = 'rmirsh/kamil-dev';
const BRANCH = 'master';

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

async function getFileSha(path: string, token: string): Promise<string | null> {
  const res = await fetch(`https://api.github.com/repos/${REPO}/contents/${path}?ref=${BRANCH}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
    },
  });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`GitHub ${res.status}: ${await res.text()}`);
  const data = await res.json() as { sha: string };
  return data.sha;
}

async function commitFile(
  path: string,
  content: string,
  token: string,
  sha: string | null,
): Promise<void> {
  const encoded = btoa(unescape(encodeURIComponent(content)));

  const res = await fetch(`https://api.github.com/repos/${REPO}/contents/${path}`, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
    },
    body: JSON.stringify({
      message: sha ? `post: update ${path}` : `post: ${path}`,
      content: encoded,
      branch: BRANCH,
      ...(sha ? { sha } : {}),
    }),
  });

  if (!res.ok) {
    throw new Error(`GitHub ${res.status}: ${await res.text()}`);
  }
}

export const POST: APIRoute = async ({ request }) => {
  const secret = import.meta.env.TELEGRAM_WEBHOOK_SECRET;
  if (secret && request.headers.get('x-telegram-bot-api-secret-token') !== secret) {
    return new Response(JSON.stringify({ error: 'unauthorized' }), { status: 401 });
  }

  const update = await request.json();
  const message = update?.channel_post || update?.edited_channel_post || update?.message;
  const isEdit = !!update?.edited_channel_post;

  if (!message?.text || !message.text.includes('#site')) {
    return new Response(JSON.stringify({ ok: true, skipped: true }), { status: 200 });
  }

  const githubToken = import.meta.env.GITHUB_TOKEN;
  if (!githubToken) {
    return new Response(JSON.stringify({ error: 'GITHUB_TOKEN not set' }), { status: 500 });
  }

  const { title, blurb, body, tags } = parseMessage(message.text);
  const date = new Date(message.date * 1000);
  const dateStr = date.toISOString().split('T')[0];
  const filename = `${dateStr}-tg${message.message_id}`;
  const path = `src/content/blog/${filename}.mdx`;

  const tagsLine = tags.length ? `\ntags: [${tags.join(', ')}]` : '';
  const mdx = `---\ntitle: ${title}\ndate: ${dateStr}\nblurb: ${blurb}${tagsLine}\n---\n\n${body}\n`;

  try {
    const sha = isEdit ? await getFileSha(path, githubToken) : null;
    await commitFile(path, mdx, githubToken, sha);
    return new Response(JSON.stringify({ ok: true, path, updated: isEdit }), { status: 200 });
  } catch (err) {
    console.error('webhook error:', err);
    return new Response(JSON.stringify({ error: String(err) }), { status: 500 });
  }
};
