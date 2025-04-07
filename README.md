# TagForm Backend

A Node.js backend project using Express.js and Supabase for data storage.

## Prerequisites

- Node.js (v14 or higher)
- npm (Node Package Manager)
- Supabase account and project

## Setup

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Create a `.env` file in the root directory and add your Supabase credentials:
   ```
   SUPABASE_URL=your_supabase_project_url
   SUPABASE_ANON_KEY=your_supabase_anon_key
   PORT=3000
   ```

## Running the Application

Development mode:
```bash
npm run dev
```

Production mode:
```bash
npm start
```

## Project Structure

```
tagform/
├── src/
│   └── server.js
├── .env
├── package.json
└── README.md
```

## API Endpoints

- GET `/`: Welcome message
- More endpoints will be added as needed

## Technologies Used

- Express.js
- Supabase
- Node.js
- CORS
- dotenv # tagform-backend
