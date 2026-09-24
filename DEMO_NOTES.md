# 3-minute demo script

Audience: Build Fast with AI judges. Product: Campus Brief Agent. Have the app open on the home screen before the timer starts. No API key is required.

## 0:00–0:25 — The problem

Say: "Campus notices arrive as PDFs and midnight class-chat dumps. Deadlines, fines, and 'you will be debarred' are buried in the prose. Campus Brief turns that into a one-screen brief with a citation for every claim."

Point at the two inputs: PDF drop zone and paste box. Mention the fictional Indira Institute circular is already in the repo.

## 0:25–1:05 — Class chat

Click **Sample chat**. Wait for the brief.

Walk the result:

- The WhatsApp timestamp `21/09/26` is not a deadline. The earliest real item is the CS301 viva on 27 Sept.
- Exam form `2 oct 5pm`, fee `30 sept`, hostel `1 oct`.
- Risks: `no hall ticket` and `room gone` are high; `500/day` is medium.
- Click **Source** on the hall-ticket risk and show the matching chunk.

## 1:05–2:05 — PDF circular

Click **Sample PDF**. This posts `public/samples/campus-circular.pdf` through the same upload path.

Show:

- Issue date 18 September is not listed as a deadline.
- Earliest obligation is hostel re-allotment opening 25 September.
- Exam form 2 October, 5:00 PM, and the Rs 500/day late window.
- Debarment and hall-ticket withholding as high risks.
- The undated action "upload an abstract" owned by the team.
- Page labels on the source cards (the PDF is three pages).

## 2:05–2:40 — Focused retrieval

Paste or keep the PDF, type the focus chip **What do I need to do for hostel allotment?**, and click **Build brief**.

Say: "Chunks are embedded and ranked. The brief is built from the top matches, so scholarship and exam-form lines drop out, and the hostel close plus the vacated-room risk stay, still cited."

Point at retrieval scores. Used chunks are marked `used`.

## 2:40–3:00 — Stack and close

Say: "Next.js App Router, Tailwind, and one route handler. RAG is chunk plus embed: OpenAI-compatible embeddings and chat when `OPENAI_API_KEY` is set, and a local parser plus hashed embeddings when it is not. Nothing is hardcoded. Tests cover the circular, the chat dump, retrieval, and the sample PDF."

Click **Copy markdown** if there is a spare second, then stop on the hostel brief.
