# React Calendar App with Weather & Local Storage

A simple and elegant calendar app built with **React + TypeScript + Zustand + Vite**.  
You can create, edit, and delete daily reminders - each reminder includes a city, and automatically fetches the weather for that location using **Open-Meteo API**.  
All data is saved in **localStorage**, so your reminders stay even after refreshing the page.

---

## Features

- Month-based calendar grid (fully responsive)
- Add, edit, and delete reminders
- Fetch real weather for each city and date using **Open-Meteo**
- Local persistence with `localStorage`
- Navigate between months
- Highlight today's date
- Mobile-friendly and responsive layout

---

## Tech Stack

- **React 19 + TypeScript**
- **Zustand** (state management)
- **Vite** (build tool)
- **date-fns** (date utilities)
- **Open-Meteo API** (weather data)
- **CSS3** (modern responsive design)

---

## Setup & Installation

```bash
# 1. Clone this repository
git clone https://github.com/YOUR_USERNAME/calendar-app.git
cd calendar-app

# 2. Install dependencies
npm install

# 3. Run locally
npm run dev

# 4. Running Tests
npm test

# 5. Build for Production
npm run build
npm run preview


# 6. Data Persistence
All reminders are stored in localStorage under the keys:
calendar-reminders
calendar-month-start

To reset the app, simply clear your browser's local storage.