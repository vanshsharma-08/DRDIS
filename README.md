# 🚨 DRDIS: Disaster Relief Decision Intelligence System

**🏆 Hackathon MVP — Live Links**
* 🌍 **Live Web App (Frontend):** [https://drdis.netlify.app](https://drdis.netlify.app)
* ⚙️ **Cloud API (Backend):** [https://drdis.onrender.com](https://drdis.onrender.com)

> **Note to Judges:** The backend API is hosted on Render's Free Tier. It may take ~50 seconds to spin up on the very first request. Once awake, the deterministic rule-engine processes disaster reports in milliseconds.

---
**Turning chaotic field reports into actionable, prioritized intelligence in milliseconds.**

## 📖 The Problem
In the critical hours following a natural disaster, first responders are flooded with chaotic, unstructured text messages from the field. Critical data (locations, casualty counts, specific medical needs) is buried in panic. Dispatchers waste precious time manually reading, guessing priority, and routing teams.

## 💡 The Solution: DRDIS
DRDIS is a highly scalable, stateless decision engine that instantly ingests unstructured disaster reports and deterministically routes them. 

Instead of blindly passing raw text to an expensive, slow LLM, DRDIS uses a **Hardened Deterministic Rule Engine** as its primary layer. It safely extracts exact locations and human casualty numbers using non-greedy, intra-string heuristics, assigns a mathematically robust Severity Index score, and dispatches the exact right volunteer team.

### 🏗️ High-Level Architecture (HLD)
* **Frontend:** React.js (Component-driven UI for real-time triage monitoring).
* **Backend Pipeline:** Node.js & Express.
* **Layer 1: Deterministic Engine (Primary):** Bypasses standard regex greediness to perfectly isolate location tags and survivor counts without cross-segment mathematical corruption.
* **Layer 2: AI Fallback (Secondary):** Only triggered if a request is completely vague, utilizing Gemini AI for safe, baseline heuristic triage. 
* **Explainability:** Generates a real-time "Decision Logic Chain" so dispatchers know *exactly* why a request was scored HIGH urgency.

## ✨ Key Features
* **Zero-Latency Parsing:** Core engine processes text without waiting on external API calls.
* **Defensive Pipeline:** Strictly handles null arrays, malformed inputs, and comma-spliced sentences to prevent server crashes under high load.
* **Intelligent Skill Matching:** Automatically maps extracted situational needs to volunteer team skill sets (e.g., "medical", "first-aid").

---

## 🚀 How to Run Locally (Local Development Mode)

Currently, DRDIS is configured for local execution. You need to spin up the backend API and the frontend UI in two separate terminals.

### 1. Start the Backend (The Engine)
Open a terminal, navigate to the root directory, and run:

```bash
cd backend
npm install
npm start

### 2. Start the Frontend (The UI)
Open a **second** terminal, navigate to the root directory, and run:

```bash
cd frontend/frontend
npm install
npm start
