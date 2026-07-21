# College Feedback Classifier

An AI-powered tool that classifies feedback from students, faculty, and staff
into **Academics**, **Facilities**, **Administration**, or **General** — with
a plain-language explanation for why each piece of feedback was categorized
that way.

**Live demo:** https://college-feedback-classifier-rydi.onrender.com
*(Free-tier hosting — the app may take 30-50 seconds to wake up if it hasn't been visited recently.)*

## Features
- Submit feedback with department, year/role, and priority tagging
- Real-time AI classification with a natural-language explanation for each result
- Analytics view with category distribution
- Filterable feedback history

## Tech Stack
- **Frontend:** HTML, CSS, vanilla JavaScript
- **Backend:** Node.js, Express
- **AI:** Google Gemini API (`gemini-3.5-flash`) using few-shot prompting to
  classify feedback text and generate an explanation. Falls back to a local
  keyword-matching classifier if the API is unavailable, so the app never breaks.
- **Deployment:** Render (free tier)

## How the classification works
The backend sends the feedback text to Gemini along with a handful of labeled
examples (few-shot prompting) and asks it to return a JSON object with a
category, a confidence score, and a one-sentence explanation. If the API call
fails (e.g. rate limit, temporary outage), the server automatically retries a
few times before falling back to simple keyword matching, so the user always
gets a result.

## Run locally
1. Clone this repo and run `npm install`
2. Create a `.env` file in the project root with:
   ```
   GEMINI_API_KEY=your_key_here
   ```
   Get a free key at [aistudio.google.com/apikey](https://aistudio.google.com/apikey)
3. Run `npm start`
4. Open `http://localhost:3000`

## Deploy your own copy
Deploy as a Node.js web service (e.g. [Render](https://render.com)):
- Build command: `npm install`
- Start command: `npm start`
- Environment variable: `GEMINI_API_KEY` set to your key
