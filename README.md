# High-Ticket Podcast Client Finder

A web application to find and rank podcast channels from rich markets that are financially capable of paying $1,500–$10,000/month for podcast editing and repurposing services.

## Features

- Search for podcast channels by niche keywords
- Filter by subscribers, region, and activity
- Score and rank channels based on various factors
- Export results to CSV
- Responsive design with a clean UI

## Prerequisites

- Node.js (v16 or later)
- Python 3.8 or later
- YouTube Data API v3 key

## Backend Setup

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```

2. Create a virtual environment and activate it:
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

3. Install the required packages:
   ```bash
   pip install -r requirements.txt
   ```

4. Create a `.env` file in the backend directory with your YouTube API key:
   ```env
   YOUTUBE_API_KEY=your_youtube_api_key_here
   ```

5. Start the backend server:
   ```bash
   uvicorn main:app --reload
   ```

## Frontend Setup

1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```

2. Install the required packages:
   ```bash
   npm install
   ```

3. Create a `.env` file in the frontend directory:
   ```env
   VITE_API_URL=http://localhost:8000
   ```

4. Start the development server:
   ```bash
   npm run dev
   ```

## Usage

1. Open your browser and navigate to `http://localhost:3000`
2. Enter your search criteria (keywords, regions, subscribers range, etc.)
3. Click "Find High-Ticket Podcasts" to start the search
4. View and sort the results in the table
5. Click on a row to see more details and outreach script
6. Export the results to CSV if needed

## Project Structure

```
high-ticket-podcast-finder/
├── backend/
│   ├── main.py              # FastAPI application
│   ├── requirements.txt      # Python dependencies
│   └── .env                 # Environment variables
├── frontend/
│   ├── public/              # Static files
│   ├── src/
│   │   ├── components/      # React components
│   │   ├── services/        # API services
│   │   ├── types/           # TypeScript types
│   │   ├── utils/           # Utility functions
│   │   ├── App.tsx          # Main App component
│   │   └── main.tsx         # Entry point
│   ├── .env                 # Frontend environment variables
│   └── package.json         # Node.js dependencies
└── README.md                # This file
```

## Environment Variables

### Backend

- `YOUTUBE_API_KEY`: Your YouTube Data API v3 key
- `BACKEND_HOST`: Host for the backend server (default: 0.0.0.0)
- `BACKEND_PORT`: Port for the backend server (default: 8000)

### Frontend

- `VITE_API_URL`: URL of the backend API (default: http://localhost:8000)

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
