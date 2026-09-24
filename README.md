# Campus Brief Agent

Upload a campus PDF or paste a WhatsApp-style note. The app returns a structured brief: deadlines, action items, risks, and citations back to the source text.

Built for Build Fast with AI 2026. The sample circular is fictional.

## Live demo

Anonymous Vercel deployment (no project token was available in this environment):

https://temporary-rushing-agate-bu12491.vercel.app

It was created with `vercel deploy --temporary` and expires about 60 minutes after 05:04 UTC on 24 Sep 2026 unless it is claimed:

https://vercel.com/claim-deployment?code=eee026cb-4c19-47f8-b741-ab55735418ff

A signed-in Vercel project is still required for a URL that lasts through the build window. Those steps are below.

## How it works

1. PDF text is extracted with `unpdf` (one string per page). Pasted text is used as-is.
2. Text is split into paragraph chunks of about 460 characters.
3. Chunks and the optional focus question are embedded. With `OPENAI_API_KEY`, embeddings come from an OpenAI-compatible `/embeddings` endpoint. Without a key, the app uses a local hashed unigram/bigram embedding.
4. Chunks are ranked by cosine similarity. A focus question keeps the top three chunks; an empty question uses the whole notice.
5. A local parser turns the retrieved text into dates, obligations, and consequences. If `OPENAI_API_KEY` is set, a chat completion rewrites that brief as JSON and must cite the provided chunk ids. If the model call fails, the local brief is returned.

No API key is required to run the demo.

## Run locally

```bash
npm install
npm run generate:sample   # optional; public/samples/campus-circular.pdf is already committed
npm test
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Use **Sample PDF** or **Sample chat**, or upload your own text-based PDF.

### Environment

Copy `.env.example` to `.env.local`:

```bash
cp .env.example .env.local
```

| Variable | Required | Purpose |
| --- | --- | --- |
| `OPENAI_API_KEY` | No | Chat completions and embeddings. Blank uses the local parser. |
| `OPENAI_BASE_URL` | No | OpenAI-compatible base URL. Default `https://api.openai.com/v1`. |
| `OPENAI_MODEL` | No | Chat model. Default `gpt-4o-mini`. |
| `OPENAI_EMBEDDING_MODEL` | No | Embedding model. Default `text-embedding-3-small`. |

Never commit the key. `.env*` is gitignored except `.env.example`.

## Tests

```bash
npm test
```

Vitest covers circular dates, WhatsApp shorthand (including ignoring the chat timestamp), risk severity, chunk retrieval for a hostel question, and text extraction from the sample PDF.

## Production build

```bash
npm run build
npm start
```

## Deploy on Vercel

This environment had no Vercel token. `npm run build` passes, and an anonymous temporary deployment was published (see Live demo). A durable project deploy is:

1. Push this repository to GitHub.
2. In the [Vercel dashboard](https://vercel.com/new), import the repo. Framework preset: **Next.js**. Root directory: repository root.
3. Add environment variables before the first production deploy:
   - `OPENAI_API_KEY` (optional; leave unset for the local parser)
   - `OPENAI_BASE_URL`, `OPENAI_MODEL`, `OPENAI_EMBEDDING_MODEL` only if you are not using OpenAI defaults
4. Deploy.

CLI equivalent:

```bash
npx vercel login
npx vercel link
npx vercel env add OPENAI_API_KEY production
npx vercel --prod
```

`vercel.json` is unnecessary. The brief route sets `runtime = "nodejs"` because PDF parsing uses `unpdf`.

## Project map

| Path | Role |
| --- | --- |
| `src/app/page.tsx` | Demo UI |
| `src/app/api/brief/route.ts` | Upload / paste endpoint |
| `src/lib/parse.ts` | Dates, actions, risks |
| `src/lib/chunk.ts`, `src/lib/embed.ts`, `src/lib/retrieve.ts` | Chunk + embed RAG |
| `src/lib/llm.ts` | OpenAI-compatible brief writer |
| `public/samples/campus-circular.pdf` | Fictional multi-page circular |
| `public/samples/whatsapp.txt` | Fictional class-chat paste |
| `DEMO_NOTES.md` | 3-minute demo script |
| `PPT_OUTLINE.md` | 10-slide outline |
| `AI_TOOLS_DISCLOSURE.md` | Tools used to build and run this |

## Regenerate the sample PDF

Edit `samples/campus-circular.txt` (`---PAGE---` starts a new page), then:

```bash
npm run generate:sample
```
