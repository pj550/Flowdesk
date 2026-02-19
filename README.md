# ⚡ FlowDesk – Team Project Manager

A full-featured project management app for your whole org. Free to host, free database.

---

## 🚀 Setup in 4 Steps (~15 minutes total)

---

### STEP 1 — Create Free Supabase Database

1. Go to **https://supabase.com** → Sign up free
2. Click **"New Project"**
   - Give it a name: `flowdesk`
   - Set a database password (save it!)
   - Choose the region closest to your team
3. Wait ~2 minutes for it to spin up
4. Go to **SQL Editor** (left sidebar)
5. Paste the entire contents of **`supabase-schema.sql`** and click **Run**
   - This creates all your tables and permissions
6. Go to **Settings → API** and copy:
   - **Project URL** (looks like: `https://xxxx.supabase.co`)
   - **anon public key** (long string starting with `eyJ...`)

---

### STEP 2 — Configure the App

1. In the `flowdesk` folder, copy `.env.example` to `.env`:
   ```
   cp .env.example .env
   ```
2. Open `.env` and fill in your values:
   ```
   REACT_APP_SUPABASE_URL=https://your-project-id.supabase.co
   REACT_APP_SUPABASE_ANON_KEY=eyJhbGci...your-key-here
   ```

---

### STEP 3 — Deploy Free with Vercel (get your live URL)

**Option A: Deploy via Vercel website (easiest, no coding)**

1. Go to **https://github.com** → Sign up free
2. Create a new repository called `flowdesk`
3. Upload all the files from this folder to that repo
4. Go to **https://vercel.com** → Sign up free (use your GitHub)
5. Click **"Add New Project"** → Import your `flowdesk` repo
6. In **Environment Variables**, add:
   - `REACT_APP_SUPABASE_URL` = your Supabase URL
   - `REACT_APP_SUPABASE_ANON_KEY` = your Supabase anon key
7. Click **Deploy**
8. You get a URL like: `https://flowdesk-yourname.vercel.app` 🎉

**Option B: Deploy via command line (if you have Node.js installed)**

```bash
# Install dependencies
npm install

# Test locally first
npm start

# Install Vercel CLI and deploy
npm install -g vercel
vercel
# Follow prompts, add env vars when asked
```

---

### STEP 4 — Share with your Team

Send your Vercel URL to everyone in the org. That's it!

- All data is **shared in real-time** across all users
- Changes appear instantly for everyone (no refresh needed)
- The database is hosted on Supabase's free tier

---

## 💰 What's Free

| Service | Free Tier |
|---------|-----------|
| **Supabase** | 500MB DB, 50k requests/month, unlimited users |
| **Vercel** | Unlimited deployments, custom domain support |
| **Total cost** | **$0/month** for most small-medium orgs |

---

## ✨ Features

- 🏢 **Departments** — Create, edit, delete, with icons and colors
- 🗂 **Sub-Departments** — Unlimited nesting under any department
- ✅ **Tasks** — Full CRUD with title, description, status, priority
- 👤 **Assignees** — Assign tasks to team members
- 📅 **Due Dates** — With overdue highlighting
- 🔄 **Recurrence** — Daily, Weekly, Monthly, etc.
- 🏷 **Tags** — Organize and filter tasks
- ✔ **Subtasks** — Break tasks into smaller steps
- 💬 **Comments** — Team discussion on each task
- 📋 **List View** — Spreadsheet-style with inline status editing
- 🗂 **Board View** — Kanban columns by status
- 📅 **Timeline View** — Visual date-based chart
- 🔍 **Search & Filters** — By status, priority, or text
- ⚡ **Real-time** — Changes sync instantly for all users
- 👥 **Team Members** — Add/remove members from sidebar

---

## 🛠 Editing Departments

In the sidebar, hover over any department to reveal:
- **+** — Add a sub-department
- **✏️** — Edit name, color, or icon
- **✕** — Delete (also removes all tasks in that dept)

---

## 📁 File Structure

```
flowdesk/
├── public/
│   └── index.html
├── src/
│   ├── App.js          ← Main app (all components)
│   ├── supabase.js     ← Database connection
│   └── index.js        ← Entry point
├── supabase-schema.sql ← Run this in Supabase SQL Editor
├── .env.example        ← Copy to .env and fill in values
├── .env                ← Your credentials (never commit this!)
├── package.json
└── README.md
```

---

## 🔒 Security Note

The app uses Supabase's `anon` key with Row Level Security (RLS) policies that allow all reads/writes. This means anyone with the URL can use the app — perfect for internal org tools. If you need login/authentication, that can be added as a next step.

---

## ❓ Need Help?

Common issues:
- **"Could not connect to database"** → Check your `.env` values are correct with no extra spaces
- **Tables don't exist** → Make sure you ran the full `supabase-schema.sql` in Supabase SQL Editor
- **Deploy fails** → Make sure env vars are added in Vercel project settings
