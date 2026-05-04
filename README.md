# 📘 CertifyMe — Full Stack Intern Assessment

---

## 🚀 Getting Started

1. **Clone the provided repository**
   ```bash
   git clone https://github.com/Neerajvs32/Test1.git
   ```

2. **Create your own GitHub repository**
   - Push the cloned project to your own GitHub account.
   - Share your repository link after completing the task.

3. **Development Requirement**
   - Both Frontend and Backend must run together.
   - The UI must remain exactly the same.
   - ❌ Do NOT modify frontend design or components.
   - ✅ Build the backend required for the existing UI functionality.

---

## 🏢 Project Overview

This project is part of the **CertifyMe Full Stack Intern Assessment**. The repository already contains a complete Admin UI. Your responsibility is to **build the backend and connect it with the existing frontend**.

### Objectives
- Build backend APIs using Flask
- Connect frontend with backend
- Store and retrieve data from database
- Make the application fully functional

### 🔗 Original Repository
[https://github.com/Neerajvs32/Test1](https://github.com/Neerajvs32/Test1)

---

## ⚙️ Tech Stack

| Layer | Technology |
|---|---|
| Backend | Python |
| Framework | Flask |
| Database | SQLite / MySQL / PostgreSQL |
| Frontend | Pre-built Admin UI |

---

## 🧩 Features & User Stories

---

### ✅ Task 1 — Authentication *(Day 1)*

---

#### US-1.1 — Admin Sign Up

**Required Fields**
- Full Name
- Email
- Password
- Confirm Password

**Validations**
- All fields mandatory
- Email must be valid
- Password minimum 8 characters
- Passwords must match
- Email must be unique

**Expected Result**
- Save admin account
- Redirect to Login page

---

#### US-1.2 — Admin Login

**Fields**
- Email
- Password
- Remember Me checkbox

**Rules**
- Show generic error on failure:
  ```
  Invalid email or password
  ```

**Expected Result**
- Redirect to dashboard
- Load opportunities created by the admin

**Session Handling**

| Condition | Behaviour |
|---|---|
| Remember Me checked | Long-lived session |
| Remember Me unchecked | Session ends when browser closes |

---

#### US-1.3 — Forgot Password

**Requirements**
- Admin enters their email
- Always show the same success message (regardless of whether email exists)

**Behaviour**
- Generate reset link internally
- No email sending required

**Security**
- Reset link expires after **1 hour**
- Expired link shows an error

---

### ✅ Task 2 — Opportunity Management *(Day 2)*

> All opportunities must be stored in the database, linked to the logged-in admin, and must never use hardcoded data.

---

#### US-2.1 — View All Opportunities

**Each opportunity card must display:**
- Opportunity Name
- Category
- Duration
- Start Date
- Description

**Rules**
- Show only the logged-in admin's opportunities
- Remove all demo / hardcoded cards
- Show an empty state if no opportunities exist

---

#### US-2.2 — Add New Opportunity

**Required Fields**
- Opportunity Name
- Duration
- Start Date
- Description
- Skills to Gain *(comma separated)*
- Category
- Future Opportunities

**Optional Field**
- Maximum Applicants

**Category Options**
- Technology
- Business
- Design
- Marketing
- Data Science
- Other

**Expected Result**
- Validate all required fields
- Save opportunity to database
- Link opportunity to logged-in admin
- Display immediately **without page refresh**

---

#### US-2.3 — Opportunities Persist After Login

- Opportunities must load after logout / login cycles
- Stored only in the database — **no local storage usage**
- Admins cannot access other admins' data

---

#### US-2.4 — View Opportunity Details

- Open a details modal
- Show all saved fields
- Close button available

---

#### US-2.5 — Edit Opportunity

- Edit button opens a pre-filled form
- Apply the same validations as during creation
- Update only the selected opportunity
- Reflect changes instantly **without page refresh**

---

#### US-2.6 — Delete Opportunity

- Show a confirmation dialog before deletion
- Delete permanently from the database
- Remove from UI immediately **without page refresh**
- Only the creator admin can delete their own opportunity

---

## ▶️ How to Run (Backend Implementation)

### Setup
```bash
python -m venv venv
venv\Scripts\activate          # (Windows)   or   source venv/bin/activate
pip install -r requirements.txt
python app.py
```

The server starts on **http://127.0.0.1:5000**. Open that URL — the original Admin UI loads and is fully wired to the Flask backend.

### Project Layout
```
qatar_foundation_admin/
├── app.py                # Flask entrypoint, blueprint registration, login manager
├── config.py             # SECRET_KEY, SQLite URI, allowed categories, session lifetime
├── models.py             # Admin, Opportunity, PasswordResetToken (SQLAlchemy)
├── auth_routes.py        # /api/signup, /api/login, /api/logout, /api/forgot-password, /api/session
├── opp_routes.py         # GET/POST/PUT/DELETE /api/opportunities[/:id]
├── requirements.txt
├── sky/                  # ORIGINAL upstream UI — unchanged (do not modify)
├── static/               # Flask-served copy of CSS + admin.js wired to backend
└── templates/            # Flask-served admin.html (uses url_for for static)
```

### API Endpoints
| Method | Path | Auth | Purpose |
|---|---|---|---|
| POST | `/api/signup` | – | Create admin (US-1.1) |
| POST | `/api/login` | – | Sign in, sets session cookie; `remember=true` extends lifetime (US-1.2) |
| POST | `/api/logout` | ✓ | End session |
| GET  | `/api/session` | – | Returns current logged-in admin (used to restore session on reload) |
| POST | `/api/forgot-password` | – | Always returns generic success; reset link printed to console (US-1.3) |
| GET / POST | `/api/reset-password/<token>` | – | Validate / consume a reset token (1-hour expiry) |
| GET  | `/api/opportunities` | ✓ | List opportunities owned by current admin (US-2.1) |
| POST | `/api/opportunities` | ✓ | Create new opportunity for current admin (US-2.2) |
| GET  | `/api/opportunities/<id>` | ✓ | View one (owner-checked) (US-2.4) |
| PUT  | `/api/opportunities/<id>` | ✓ | Edit (owner-checked) (US-2.5) |
| DELETE | `/api/opportunities/<id>` | ✓ | Delete (owner-checked) (US-2.6) |

### Notes
- Passwords are hashed with `werkzeug.security.generate_password_hash` (PBKDF2). Plain text is never stored.
- Session is managed by Flask-Login; the cookie is HTTP-only.
- Authorization on every opportunity endpoint filters by `admin_id == current_user.id`, so admins cannot access each other's data (returns 404 to avoid leaking existence).
- The original UI in `sky/` is preserved verbatim. The Flask-served copies in `static/`/`templates/` are visually identical — only `admin.js` was modified to call backend APIs and render opportunity cards from the database.
- DB defaults to SQLite at `qatar_admin.db`. Override via the `DATABASE_URL` env var to use PostgreSQL.
