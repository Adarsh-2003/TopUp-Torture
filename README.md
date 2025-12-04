# TopUp-Torture

**No brain needed — just your week timestamps. Let the app think; you just paste.**

A minimal web app that calculates daily work hours and computes exact top-up time windows needed to reach the required 10-hour shift length.

## Problem It Solves

When tracking weekly work hours, you need to:
- Calculate worked hours per day from login/logout timestamps
- Determine if you're short of the 10-hour requirement
- Calculate exact top-up time windows to fill the gap

This app automates all of that. Just paste your weekly timestamps and get instant results.

## Features

- **Automatic parsing** of weekly timestamps (supports 12-hour and 24-hour formats)
- **Multi-session support** - handles multiple login/logout pairs per day
- **Midnight crossing** - correctly calculates shifts that cross midnight
- **Top-up calculation** - computes exact time windows to reach 10 hours
- **Weekly summary** - shows total top-up needed and days requiring top-up
- **Copy functionality** - one-click copy for top-up timestamps
- **Export all** - copy all top-up windows for the week at once
- **Missing data handling** - gracefully handles incomplete or missing timestamps

## UI

- **Dark theme** - sleek minimal dark UI with electric teal accents
- **Monospace fonts** - timestamps displayed in monospace for clarity
- **Responsive design** - works on mobile and desktop
- **Per-day cards** - clean card layout showing worked hours and top-up windows
- **Custom scrollbar** - themed scrollbar matching the dark aesthetic

## How It Works

1. Paste your weekly timestamps into the textarea
2. Click "Paste & Compute — lemme do the math"
3. Review per-day results showing:
   - Login/logout times
   - Worked duration
   - Top-up window (if needed) or status message
4. Copy individual top-up windows or export all at once

## Supported Input Formats

- **Day headers**: `Mon, 27 Oct` or `Tue, 01 Dec`
- **Planned shifts**: `Planned Shift : 11:00-21:00`
- **Time formats**:
  - 12-hour: `09:59 AM`, `08:08 PM`
  - 24-hour: `08:05`, `20:30`
- **Multiple sessions**: Multiple login/logout pairs per day are summed
- **Missing data**: Handles `-- h -- m` and `Data porting` placeholders

## Calculation Rules

- **Required shift**: 10 hours (600 minutes)
- **Top-up start**: Last logout time + 1 minute
- **Top-up length**: Required hours - worked hours
- **Top-up end**: Top-up start + top-up length
- **Midnight crossing**: Automatically handles shifts crossing midnight
- **Worked hours**: Simple logout time - login time (no complex logic)

## Tech Stack

- Pure HTML, CSS, and JavaScript
- No frameworks or dependencies
- Client-side only - all processing happens in your browser
- Single-page application

## Files

- `index.html` - Main HTML structure
- `styles.css` - All styling and dark theme
- `script.js` - Parsing logic and calculations

## Usage

Just open `index.html` in your browser. No installation or setup required.

Use the sample data buttons to test with example timestamps.

## Made by

[Adarsh Gupta](https://adarshgupta.works)

