# AI tools disclosure

Project: Campus Brief Agent, for Build Fast with AI 2026.

## Tools used to build the repository

- Cursor Cloud Agent, model Grok 4.7, wrote the application, tests, sample notice, demo script, slide outline, and this disclosure.
- The sample PDF was generated in-repo with `pdf-lib` from `samples/campus-circular.txt`. The institute, circular, email, and class chat are fictional. No student data was uploaded.

## Tools the product calls at runtime

- If `OPENAI_API_KEY` is set, the server calls an OpenAI-compatible `POST /chat/completions` and `POST /embeddings`. Defaults are `gpt-4o-mini` and `text-embedding-3-small`. `OPENAI_BASE_URL` can point at another compatible host. The key is read from the environment only.
- If the key is absent, or a model request fails, the brief is produced by the local parser in `src/lib/parse.ts`. Retrieval then uses the hashed n-gram embedding in `src/lib/embed.ts`. No external model is contacted.

## What was not used

- No API key is committed.
- No private campus documents were scraped or included.
- The demo does not depend on a hidden hosted model.
