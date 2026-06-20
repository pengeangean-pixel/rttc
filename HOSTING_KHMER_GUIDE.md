# របៀប Hosting Project នេះដោយប្រើ GitHub + Render + OpenAI API

Project នេះប្រើ React + Express Backend + OpenAI API។ ដូច្នេះ GitHub Pages មិនសមទេ ព្រោះវាមិនអាចលាក់ API Key និងមិនដំណើរការ Backend Server។

## រចនាសម្ព័ន្ធត្រឹមត្រូវ

- GitHub = ផ្ទុក Source Code
- Render = Host Website + Backend Server
- OpenAI API Key = ដាក់ក្នុង Render Environment Variables

## 1) Upload Code ទៅ GitHub

1. ចូល GitHub
2. Create New Repository
3. Upload files ទាំងអស់ក្នុង project នេះ
4. Commit changes

កុំ upload file `.env` ពិតប្រាកដ។ File `.env.example` អាច upload បាន។

## 2) Deploy លើ Render

1. ចូល Render
2. New +
3. Web Service
4. Connect GitHub repository
5. ដាក់ settings ខាងក្រោម៖

Build Command:

```bash
npm install && npm run build
```

Start Command:

```bash
npm start
```

## 3) Environment Variables ក្នុង Render

ដាក់៖

```env
OPENAI_API_KEY=sk-your-real-openai-key
OPENAI_MODEL=gpt-4.1-mini
NODE_ENV=production
```

ចំណាំ៖ Render នឹងដាក់ `PORT` ឱ្យដោយស្វ័យប្រវត្តិ។

## 4) ចុច Deploy

បន្ទាប់ពី Deploy រួច Render នឹងផ្តល់ link ប្រហែល៖

```text
https://your-project-name.onrender.com
```

## សំខាន់ណាស់

- កុំដាក់ OpenAI API Key ក្នុង `src/App.tsx`
- កុំដាក់ API Key ក្នុង GitHub
- API Key ត្រូវនៅក្នុង Render Environment Variables ប៉ុណ្ណោះ
- GitHub Pages មិនអាចប្រើសម្រាប់ project នេះបានទេ
