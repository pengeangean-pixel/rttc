# RTTC Kampong Cham Attendance Portal — OpenAI Version

This version uses an Express backend with the OpenAI API instead of Google Gemini.

## Important

Do not put your OpenAI API key inside React/frontend code. Keep it only in environment variables on the server host, for example Render or Railway.

## Local Run

Prerequisites: Node.js 20+

```bash
npm install
cp .env.example .env
# edit .env and add OPENAI_API_KEY
npm run dev
```

Open:

```text
http://localhost:3000
```

## Render Hosting

1. Upload this project to GitHub.
2. Go to Render → New → Web Service.
3. Connect your GitHub repository.
4. Use these settings:

Build Command:

```bash
npm install && npm run build
```

Start Command:

```bash
npm start
```

Environment Variables:

```env
OPENAI_API_KEY=your_openai_api_key_here
OPENAI_MODEL=gpt-4.1-mini
NODE_ENV=production
```

Render automatically provides `PORT`, so you do not need to add it.

## GitHub Pages

GitHub Pages is not suitable for this project because the app has a backend and requires a private API key.
Use GitHub only to store the code, then deploy with Render/Railway/Cloud Run.
