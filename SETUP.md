# DAD Dashboard — Setup Guide

**Doctors At Door Operations Dashboard**  
Self-hosted Node.js + Express · Notion API · team.doctoratdoor.com

---

## Prerequisites

- Node.js 18+ installed
- A server or VPS (Ubuntu recommended)
- Notion workspace with all 21 databases (listed below)
- Gmail account for email notifications
- (Optional) CallMeBot account for WhatsApp alerts

---

## Step 1 — Create Notion Integration

1. Go to **https://www.notion.so/my-integrations**
2. Click **New integration**
3. Name it: `DAD Dashboard`
4. Select your Notion workspace
5. Under Capabilities, enable: **Read content**, **Insert content**, **Update content**
6. Click **Save**
7. Copy the **Internal Integration Token** (starts with `secret_…`)

---

## Step 2 — Share Databases with Integration

For EACH of the 21 databases below:
1. Open the database in Notion
2. Click the `…` menu (top right) → **Add connections**
3. Search for `DAD Dashboard` and click it

**All 21 databases to share:**

| # | Database Name | ID |
|---|---|---|
| 1 | Team Members | `3fdb5c22-2766-4e23-b170-165532353d60` |
| 2 | Attendance | `d1fff9e0-2f88-46a4-9295-58646e0072d3` |
| 3 | Bank Transactions | `ed3dc062-9555-4c2e-ae2b-f22a6eec5390` |
| 4 | Tools & Assets | `7190fe9b-594a-4dbe-9ed1-a5679726dfc1` |
| 5 | Salary Payments | `5eef7a57-aaac-4fd7-a14a-83e5b1889576` |
| 6 | Legal | `3b1fe672-33c9-4cd9-9b24-5d6db45b23e8` |
| 7 | Social Accounts | `0a31d412-7aea-4c28-aa54-36c292c8ae8b` |
| 8 | Monthly Calendar | `cd3a708c-77a7-4ffa-be01-5bddeecfb236` |
| 9 | Posting Calendar | `4cf28af3-2d3f-41bb-93b6-603de621ac00` |
| 10 | Daily Social Log | `cc99c7cc-c394-46ee-bc6f-125b8c0060fd` |
| 11 | Ads Campaigns | `73f877ed-8798-4d8c-8edb-83d93387276a` |
| 12 | Influencers | `a22472c5-0fdc-49cb-8ba1-d4ea746efa54` |
| 13 | Physical Marketing | `409381ee-f84a-4e2f-898b-ecc491e405ef` |
| 14 | Print Media | `a49b2254-2a3e-4c17-82c1-2d6c970a9820` |
| 15 | Applications | `4bfae4fd-3c6f-4b34-8d17-79e371740cd7` |
| 16 | Phase Tracker | `6a2e2494-1be2-4ee6-84e7-515aa960e90c` |
| 17 | App Tasks | `93dd7e4d-5a56-4e78-93a4-59a1d2fecbeb` |
| 18 | Changelog | `59f00c2b-32e6-413b-8540-f2578f0f8791` |
| 19 | Roadmap | `d388673e-7f87-4725-a14f-b0361285d7f5` |
| 20 | Master Tasks | `4e71dd3a-460f-4669-9ce6-882a344fb907` |
| 21 | Reminders | `5d0ced06-3bd4-4396-b485-d8a9e02ee88f` |

---

## Step 3 — Configure Environment

```bash
cp .env.example .env
nano .env   # or use any text editor
```

Fill in:
```
NOTION_TOKEN=secret_your_token_here
ADMIN_PASSWORD=choose_a_strong_password
SESSION_SECRET=random_64_character_string

# Optional — email reminders
EMAIL_FROM=your@gmail.com
EMAIL_PASSWORD=your_gmail_app_password  # Use App Password, not main password
EMAIL_TO=team@doctoratdoor.com

# Optional — WhatsApp reminders
CALLMEBOT_API_KEY=your_api_key
```

> **Gmail App Password:** Go to Google Account → Security → 2-Step Verification → App passwords → create one for "Mail".

---

## Step 4 — Install & Run

```bash
npm install
node server/index.js
```

Dashboard available at: **http://localhost:3000**

---

## Step 5 — Notion Database Property Names

The dashboard auto-detects common property name variations, but for best results your Notion databases should have these property names:

### Team Members DB
| Property | Type | Notes |
|---|---|---|
| `Name` | Title | Member's full name |
| `Role` | Select | Job title / role |
| `Status` | Select | `Active` or `Inactive` |
| `Email` | Email | |
| `Phone` | Phone | |
| `Department` | Select | |
| `Join Date` | Date | |

### Attendance DB
| Property | Type | Notes |
|---|---|---|
| `Name` | Title | Auto-filled: "Aman - 2026-01-15" |
| `Member` | Relation → Team | Link to team member |
| `Date` | Date | Date only (no time) |
| `Check In` | Date | Date + time |
| `Check Out` | Date | Date + time |
| `Total Hours` | Number | Calculated on check-out |
| `Status` | Select | `Present`, `Absent`, `Half Day`, `WFH` |

### Bank Transactions DB
| Property | Type | Notes |
|---|---|---|
| `Name` | Title | Description |
| `Date` | Date | Transaction date |
| `Amount` | Number | |
| `Type` | Select | `Credit` or `Debit` |
| `Category` | Select | Salary, Rent, Marketing, etc. |

### Master Tasks DB
| Property | Type | Notes |
|---|---|---|
| `Name` | Title | Task name |
| `Status` | Select | Active, Pending, Blocked, Cancelled, Done |
| `Assigned To` | People or Relation | |
| `Due Date` | Date | |
| `Priority` | Select | High, Medium, Low |

### Ads Campaigns DB
| Property | Type | Notes |
|---|---|---|
| `Name` | Title | Campaign name |
| `Platform` | Select | Google, Facebook, Instagram, etc. |
| `Status` | Select | `Live`, `Paused`, `Ended` |
| `Budget` | Number | Total budget (₹) |
| `Spent` | Number | Amount spent (₹) |
| `Start Date` | Date | |
| `End Date` | Date | |

### Applications DB
| Property | Type | Notes |
|---|---|---|
| `Name` | Title | App name |
| `Type` | Select | Mobile, Web, etc. |
| `Status` | Select | In Development, Testing, Live, On Hold |
| `Current Phase` | Select | Phase name |
| `Launch Date` | Date | |
| `Dev Assigned` | Text or Relation | |

### Reminders DB
| Property | Type | Notes |
|---|---|---|
| `Name` | Title | Reminder title |
| `Date` | Date | Due date |
| `Type` | Select | Category |
| `Frequency` | Select | Once, Daily, Weekly, Monthly |
| `Notify Via` | Multi-select | `Email`, `WhatsApp` |
| `Status` | Select | `Active`, `Done` |
| `Phone` | Phone | WhatsApp number with country code |
| `Email` | Email | Override recipient email |

### Salary Payments DB
| Property | Type | Notes |
|---|---|---|
| `Name` | Title | Month label, e.g. "January 2026" |
| `Member` | Relation → Team | |
| `Amount` | Number | Salary amount (₹) |
| `Status` | Select | Paid, Pending |
| `Payment Date` | Date | |
| `Slip` | Files | Upload PDF slip |

---

## Step 6 — DNS & Domain Setup

Point your domain to your server's IP:

```
# DNS A Record
team.doctoratdoor.com  →  YOUR_SERVER_IP
```

---

## Step 7 — PM2 (Process Management — Recommended)

```bash
npm install -g pm2
pm2 start server/index.js --name dad-dashboard
pm2 save
pm2 startup   # follow the instructions shown
```

Commands:
```bash
pm2 logs dad-dashboard    # View logs
pm2 restart dad-dashboard # Restart
pm2 stop dad-dashboard    # Stop
```

---

## Step 8 — Nginx Reverse Proxy (Recommended for port 80/443)

```nginx
server {
    listen 80;
    server_name team.doctoratdoor.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_cache_bypass $http_upgrade;
    }
}
```

For SSL with Let's Encrypt:
```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d team.doctoratdoor.com
```

---

## Step 9 — WhatsApp Notifications via CallMeBot

1. Add **+34 644 59 79 39** to your WhatsApp contacts as "CallMeBot"
2. Send this message to that number on WhatsApp:
   ```
   I allow callmebot to send me messages
   ```
3. You'll receive an API key in reply (looks like a 7-digit number)
4. Add to `.env`:
   ```
   CALLMEBOT_API_KEY=1234567
   ```
5. In Reminders DB, add the WhatsApp number (with country code, no `+`) in the `Phone` field, e.g. `919876543210`
6. Set `Notify Via` multi-select to include `WhatsApp`

> One CallMeBot account per phone number. Each team member who wants WhatsApp reminders must activate it once on their own number.

---

## Member URLs

Each team member accesses their personal page via:

```
http://localhost:3000/aman
http://localhost:3000/prakhar
http://localhost:3000/ankit
```

The URL is matched to the **first name** (case-insensitive) in the Team Members database.  
Full-name URLs also work: `http://localhost:3000/aman-sharma`

No login required for member pages — they only show that member's own data.

---

## Quick Reference

| URL | Access | Description |
|---|---|---|
| `/login` | Public | Admin login |
| `/` | Admin only | Main dashboard |
| `/team` | Admin only | Team management |
| `/finance` | Admin only | Finance overview |
| `/marketing` | Admin only | Marketing & campaigns |
| `/apps` | Admin only | App development tracker |
| `/:name` | Public | Personal member page |

---

## Troubleshooting

**"Data unavailable" on all sections**
- Check `NOTION_TOKEN` in `.env` is correct
- Make sure ALL 21 databases are shared with the integration (Step 2)

**Check-in not saving**
- Verify the Attendance database has `Member` (Relation) and `Check In` (Date) properties
- Check server logs: `pm2 logs dad-dashboard`

**Charts not showing**
- Check browser console for JS errors
- Verify Chart.js CDN is loading (requires internet on client)

**Reminders not sending**
- Email: verify Gmail App Password (not regular password)
- WhatsApp: activate CallMeBot first (Step 9)
- Reminder `Status` must be `Active`
- Reminder `Notify Via` must include `Email` or `WhatsApp`

---

*DAD Dashboard v1.0 · Built for Doctors At Door*
