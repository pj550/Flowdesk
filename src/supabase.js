import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
```

- Click **"Commit new file"**

---

### File 3: `src/App.js`

This one is large. Do this:
- Click **"Add file"** → **"Create new file"**
- Name: `src/App.js`
- Go back to this conversation, scroll up and find the file I presented earlier called **`project-manager.jsx`** — download it
- Open it in Notepad/TextEdit, copy ALL the content
- Paste it into the GitHub editor
- Click **"Commit new file"**

---

## After All 3 Files Are Added

Your repo should look like this:
```
Flowdesk/
├── public/
│   └── index.html   ✅ already there
├── src/
│   ├── App.js       ← adding now
│   ├── index.js     ← adding now
│   └── supabase.js  ← adding now
├── .env             ✅
├── package.json     ✅
└── supabase-schema.sql ✅
