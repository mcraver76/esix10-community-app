# ESix10 Community App

## Deploy to Vercel

### Step 1 — GitHub
1. Go to github.com and create a free account
2. Create a new repository called `esix10-community`
3. Upload all these files to the repository

### Step 2 — Vercel
1. Go to vercel.com and sign up with your GitHub account
2. Click "Add New Project"
3. Select your `esix10-community` repository
4. Click Deploy — Vercel detects Vite automatically
5. Your app is live at a vercel.app URL

### Step 3 — Custom Domain
1. In Vercel project settings → Domains
2. Add `community.esix10.com`
3. In GoDaddy DNS add a CNAME record:
   - Name: community
   - Value: cname.vercel-dns.com

### Step 4 — Supabase Setup
Run the SQL in the app's setup modal in your Supabase SQL Editor.

### Step 5 — Sign up as admin
Sign up with michael@esix10.com to get admin access.
