# Volleyball Program Management System

A comprehensive web application for managing volleyball program activities, including player registrations, tryout evaluations, and program analytics.

## Features

- **Dashboard Overview**: Real-time statistics and program metrics
- **Interest Form Management**: Track and manage player registration interest
- **Tryout Evaluation System**: Structured player evaluation process
- **Event Management**: Schedule and track upcoming tryouts and events

## Tech Stack

- **Frontend**: React.js with Tailwind CSS
- **Backend**: Node.js with Express
- **Database**: Supabase
- **AI Integration**: OpenAI for player development plans
- **Authentication**: Supabase Auth

## Getting Started

1. Clone the repository:
   ```bash
   git clone [repository-url]
   ```

2. Install dependencies:
   ```bash
   # Install server dependencies
   cd server
   npm install

   # Install client dependencies
   cd ../client
   npm install
   ```

3. Set up environment variables:
   - Create `.env` file in the server directory
   - Add required environment variables (see `.env.example`)

4. Start the development servers:
   ```bash
   # Start the backend server (from server directory)
   npm start

   # Start the frontend development server (from client directory)
   npm start
   ```

## Environment Variables

Required environment variables:
- `PORT`: Server port (default: 3001)
- `SUPABASE_URL`: Your Supabase project URL
- `SUPABASE_ANON_KEY`: Your Supabase anonymous key
- `OPENAI_API_KEY`: Your OpenAI API key

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details. 