# EvidenceLens AI

A multi-modal evidence review application for evaluating car, laptop and package damage claims.

## Overview

EvidenceLens AI provides a visual evidence review interface. It helps evaluate damage claims with explainable decisions and clear severity displays, ensuring safer and more consistent claim reviews.

## Technology Stack

- React
- TanStack Start & Router
- Vite
- Tailwind CSS
- Radix UI & shadcn/ui

## Installation

Ensure you have Node.js and npm installed.

```bash
npm install
```

## Local Development

Start the local development server:

```bash
npm run dev
```

## Production Build

To create a production build:

```bash
npm run build
```

## Folder Structure

- `src/`
  - `components/`: Reusable React components (UI elements, forms, charts).
  - `routes/`: Application pages and route definitions.
  - `lib/`: Utilities and helpers.
- `public/`: Static assets.

## Demo Mode

The application includes a demo mode scenario selector that simulates evidence review without needing a live backend.

## CSV Export

You can export the results of the claim reviews to a CSV file directly from the dashboard or review interface.

## Future Backend Integration

Currently, the application runs mostly with mock data and simulated reviews. In the future, this application can be easily integrated with a real backend API by replacing the simulated mock logic in the data fetching layers.
