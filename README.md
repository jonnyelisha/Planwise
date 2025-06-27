# 🧠 PlanWise – AI-Powered Weekly Plan Analyzer

PlanWise is a backend-driven tool that allows users to upload personal or professional plans (e.g., weekly goals and task lists) and receive AI-generated suggestions to improve clarity, structure, and logical consistency.

## Features

- 📄 Upload `.txt` files containing structured plans with a goal and tasks
- 🧠 Uses LLMs (OpenAI, Claude, Groq, or local models via Ollama) to provide personalized suggestions
- 🗃️ Stores uploaded plans and AI feedback in a PostgreSQL database
- ⚙️ Built with Go, GORM, and RESTful APIs, with a lightweight React frontend

## Tech Stack

- **Backend:** Go (Gin for HTTP routing, GORM for database interaction), RESTful API architecture for file uploads and analysis requests
- **Database:** PostgreSQL for structured plan storage and feedback history, accessed via GORM ORM
- **AI Integration:** OpenAI API (default), with optional support for Claude, Groq (Mixtral), or local models via Ollama for natural language feedback
- **Frontend:** React (minimal UI for uploading plans and viewing AI-generated suggestions)

## How to Run Locally

```bash
# Start the backend
go run main.go

# Start the frontend
cd frontend
npm install
npm run dev

📂 Example Plan File Formats
💼 Professional Example
text
Copy
Edit
Goal:
Launch a backend project in Go

Tasks:
1. Set up PostgreSQL and GORM models
2. Build file upload endpoint with Gin
3. Integrate OpenAI API for analysis
4. Store plan and suggestions in the database
🏠 Everyday Life Example
text
Copy
Edit
Goal:
Build a healthier daily routine

Tasks:
1. Wake up by 7:00 AM every day
2. Eat a nutritious breakfast
3. Go for a 30-minute walk after lunch
4. Limit social media use to 1 hour per day
5. Read for 20 minutes before bed
6. Go to sleep by 10:30 PM
🔁 How It Works
User uploads a .txt file containing a goal and tasks.

The backend sends the content to an LLM for evaluation.

The model returns suggestions to improve structure, clarity, or feasibility.

Suggestions are stored in the database and displayed in the UI under “Past Plans”.

