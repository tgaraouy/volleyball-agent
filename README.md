# Volleyball Program Management

A comprehensive web application for managing volleyball programs, including player rosters, development plans, tryouts, drills, fundraising, parent communications, and newsletters.

## Getting Started

### Prerequisites

- Python 3.x (for running the local server)
- A modern web browser (Chrome, Firefox, Edge, etc.)
- A Supabase account with a project set up

### Running the Application

1. Clone or download this repository to your local machine
2. Open PowerShell in the project directory
3. Run the start-server script:

```powershell
.\start-server.ps1
```

4. Open your web browser and navigate to http://localhost:3000

### Setting Up the Database

Before using the application, you need to set up the database tables in Supabase:

1. Start the application and navigate to http://localhost:3000
2. Click "Show Details" in the Debug Panel
3. Click "Database Setup Guide"
4. Follow the instructions on the setup page to create the necessary tables in your Supabase project

## Features

- **Player Management**: Track player information, contact details, and physical attributes
- **Player Development**: Create and monitor development plans for individual players
- **Tryouts**: Schedule and manage tryout sessions, evaluate players
- **Drills Library**: Maintain a collection of volleyball drills and training exercises
- **Fundraising**: Organize and track fundraising campaigns
- **Parent Portal**: Manage parent communications and volunteer opportunities
- **Newsletter**: Handle newsletter subscriptions and communications

## Troubleshooting

If you encounter issues with the application:

1. Check the Debug Panel by clicking "Show Details" at the top of the page
2. Visit the Debug Page at http://localhost:3000/debug.html
3. Make sure your Supabase database tables are properly set up
4. Check the browser console for any JavaScript errors

## Technologies Used

- Vue.js 2.6 (Frontend framework)
- Vue Router (Client-side routing)
- Bootstrap 5 (UI framework)
- Supabase (Backend as a Service)
- Python HTTP Server (Local development server) 