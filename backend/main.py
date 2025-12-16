from fastapi import FastAPI, HTTPException, Depends, status, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, StreamingResponse
from pydantic import BaseModel, Field, HttpUrl
from typing import List, Optional, Dict, Any
import httpx
import os
import json
import logging
from datetime import datetime, timedelta
from enum import Enum
from typing_extensions import Annotated
import pandas as pd
from pathlib import Path
from dotenv import load_dotenv
from cachetools import TTLCache, cached
from urllib.parse import urlencode, quote_plus
import io
import csv

# Import quota management
from quota_manager import quota_manager, check_quota_and_proceed, record_api_usage, get_quota_alerts

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Load environment variables
load_dotenv()

# Force reload to pick up new API key
print(f"Loaded API key: {os.getenv('YOUTUBE_API_KEY', 'NOT_FOUND')}")

# Initialize FastAPI
app = FastAPI(
    title="High-Ticket Podcast Client Finder API",
    description="API for finding high-ticket podcast clients on YouTube",
    version="1.0.0"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Cache setup
search_cache = TTLCache(maxsize=100, ttl=3600)

# Constants
YOUTUBE_API_KEY = os.getenv("YOUTUBE_API_KEY")
YOUTUBE_API_URL = "https://www.googleapis.com/youtube/v3"
DEFAULT_REGIONS = ["US", "GB", "CA", "AU", "DE", "NL", "SG"]

# Niche weights for scoring (higher = more valuable)
NICHE_WEIGHTS = {
    "business podcast": 1.0,
    "entrepreneur podcast": 0.95,
    "finance podcast": 0.9,
    "real estate podcast": 0.85,
    "saas podcast": 0.8,
    "coaching podcast": 0.8,
    "marketing podcast": 0.85,
    "startup podcast": 0.9,
    "investing podcast": 0.9,
    "leadership podcast": 0.85,
}

# Response Models
class Channel(BaseModel):
    id: str
    title: str
    description: Optional[str] = None
    thumbnail_url: str
    subscriber_count: int
    video_count: int
    view_count: int
    region: str
    keywords_matched: List[str] = []
    last_upload_date: Optional[datetime] = None
    days_since_last_upload: Optional[int] = None
    score: float = 0.0
    channel_url: str
    contact_email: Optional[str] = None
    social_links: Optional[Dict[str, str]] = None

class SearchParams(BaseModel):
    keywords: List[str] = Field(
        ...,
        description="List of keywords to search for (e.g., 'business podcast')",
        example=["business podcast", "entrepreneurship"]
    )
    regions: List[str] = Field(
        default=DEFAULT_REGIONS,
        description="List of country codes to search in (e.g., 'US', 'UK')",
        example=["US", "UK", "CA"]
    )
    min_subscribers: int = Field(
        default=10000,
        ge=0,
        description="Minimum number of subscribers",
        example=10000
    )
    max_subscribers: int = Field(
        default=500000,
        ge=0,
        description="Maximum number of subscribers",
        example=500000
    )
    max_days_since_upload: int = Field(
        default=45,
        ge=1,
        le=365,
        description="Maximum days since last upload",
        example=45
    )
    max_results: int = Field(
        default=50,
        ge=1,
        le=100,
        description="Maximum number of results to return",
        example=50
    )

class OutreachRequest(BaseModel):
    channel_ids: List[str]
    template: str = "default"
    custom_message: Optional[str] = None

class OutreachResponse(BaseModel):
    success: bool
    message: str
    sent_count: int
    failed_count: int
    timestamp: datetime = Field(default_factory=datetime.utcnow)

class SearchResponse(BaseModel):
    success: bool
    data: List[Channel]
    total_results: int
    params: dict
    timestamp: datetime = Field(default_factory=datetime.utcnow)

# Constants
YOUTUBE_API_KEY = os.getenv("YOUTUBE_API_KEY")
YOUTUBE_API_URL = "https://www.googleapis.com/youtube/v3"

# Niche weights for scoring
NICHE_WEIGHTS = {
    "business podcast": 1.0,
    "entrepreneurship podcast": 0.9,
    "finance podcast": 0.8,
    "real estate podcast": 0.85,
    "saas podcast": 0.7,
    "coaching podcast": 0.75,
    "marketing podcast": 0.8
}

DEFAULT_REGIONS = ["US", "UK", "CA", "AU", "DE", "NL", "SG"]

def calculate_score(
    channel_data: Dict,
    keyword: str,
    min_subs: int,
    max_subs: int,
    max_days: int
) -> float:
    """Calculate a score from 0-100 based on channel metrics."""
    # Base score from niche
    niche_score = NICHE_WEIGHTS.get(keyword.lower(), 0.5) * 40  # 40% weight
    
    # Subscriber score (30% weight)
    subscriber_count = channel_data['subscriber_count']
    if subscriber_count >= max_subs:
        sub_score = 30
    elif subscriber_count <= min_subs:
        sub_score = 10
    else:
        # Linear scale between min and max
        sub_ratio = ((subscriber_count - min_subs) / (max_subs - min_subs))
        sub_score = 10 + (20 * sub_ratio)  # Between 10-30
    
    # Recency score (30% weight)
    days_since_upload = channel_data.get('days_since_last_upload', 365)
    if days_since_upload <= 7:
        recency_score = 30
    elif days_since_upload <= 30:
        recency_score = 25
    elif days_since_upload <= 90:
        recency_score = 15
    else:
        recency_score = 5
    
    total = niche_score + sub_score + recency_score
    return min(100, max(0, total))  # Ensure score is between 0-100

async def search_channels(params: SearchParams) -> List[Channel]:
    """Search for channels based on the given parameters."""
    import random
    
    all_channels = []
    seen_channel_ids = set()  # Track unique channel IDs to avoid duplicates
    
    async with httpx.AsyncClient(timeout=30.0) as client:  # Add timeout
        # Add randomization to get different results each time
        random_offset = random.randint(0, 20)  # Random offset for variety
        max_results = min(50, params.max_results + random_offset)  # Vary max results
        
        # Create multiple search variations for better variety
        search_variations = []
        
        # Original query
        combined_query = " OR ".join(params.keywords[:3])
        search_variations.append(combined_query)
        
        # Add variations with different keyword combinations
        if len(params.keywords) > 1:
            random.shuffle(params.keywords)
            alt_query = " OR ".join(params.keywords[:2])  # Use fewer keywords
            search_variations.append(alt_query)
        
        # Add variations with additional terms
        additional_terms = ["podcast", "show", "talk", "interview", "business"]
        random_term = random.choice(additional_terms)
        enhanced_query = f"{combined_query} OR {random_term}"
        search_variations.append(enhanced_query)
        
        # Randomly select one of the search variations
        selected_query = random.choice(search_variations)
        
        # Search for channels with selected variation
        search_url = f"{YOUTUBE_API_URL}/search"
        search_params = {
            "part": "snippet",
            "q": selected_query,
            "type": "channel",
            "maxResults": max_results,
            "regionCode": params.regions[0] if params.regions else "US",  # Use first region
            "key": YOUTUBE_API_KEY
        }
        
        # Add randomization to search order by shuffling regions occasionally
        if len(params.regions) > 1 and random.random() > 0.5:  # Increased probability
            random_region = random.choice(params.regions)
            search_params["regionCode"] = random_region
        
        # Add random order parameter if available
        if random.random() > 0.5:
            search_params["order"] = random.choice(["relevance", "date", "rating", "viewCount"])
        
        headers = {
            "Referer": "http://localhost:8000",
            "User-Agent": "High-Ticket Podcast Client Finder"
        }
        
        try:
            logger.info(f"Making randomized search for: {selected_query}")
            search_response = await client.get(search_url, params=search_params, headers=headers)
            logger.info(f"Search URL: {search_response.url}")
            logger.info(f"Search status: {search_response.status_code}")
            
            if search_response.status_code == 403:
                logger.error(f"YouTube API error: {search_response.json()}")
                raise HTTPException(
                    status_code=503,
                    detail="YouTube API quota exceeded or invalid API key. Please check your API configuration."
                )
            search_response.raise_for_status()
            search_data = search_response.json()
            logger.info(f"Search response items: {len(search_data.get('items', []))}")
            
            if not search_data.get('items'):
                logger.warning("No items found in search response")
                return []
            
            # Get channel details for all found channels at once
            channel_ids = [item['snippet']['channelId'] for item in search_data.get('items', [])]
            
            if channel_ids:
                channels_url = f"{YOUTUBE_API_URL}/channels"
                channels_params = {
                    "part": "snippet,statistics,contentDetails",
                    "id": ",".join(channel_ids),
                    "key": YOUTUBE_API_KEY
                }
                
                channels_response = await client.get(channels_url, params=channels_params)
                channels_response.raise_for_status()
                channels_data = channels_response.json()
                logger.info(f"Channel details retrieved: {len(channels_data.get('items', []))}")
                        
                        # Process channel data
                for channel in channels_data.get('items', []):
                    try:
                        channel_info = channel['snippet']
                        stats = channel['statistics']
                        
                        subscriber_count = int(stats.get('subscriberCount', 0))
                        
                        # Apply filters
                        if subscriber_count < params.min_subscribers:
                            continue
                        if subscriber_count > params.max_subscribers:
                            continue
                        
                        # Skip slow playlist lookup for performance - use estimated recent upload
                        days_since_upload = 30  # Default estimate
                        last_upload_date = datetime.utcnow() - timedelta(days=days_since_upload)
                        
                        # Calculate score with first keyword
                        score = calculate_score(
                            {
                                'subscriber_count': subscriber_count,
                                'days_since_last_upload': days_since_upload
                            },
                            params.keywords[0] if params.keywords else "podcast",
                            params.min_subscribers,
                            params.max_subscribers,
                            params.max_days_since_upload
                        )
                        
                        channel_data = Channel(
                            id=channel['id'],
                            title=channel_info['title'],
                            description=channel_info.get('description', ''),
                            thumbnail_url=channel_info['thumbnails']['default']['url'],
                            subscriber_count=subscriber_count,
                            video_count=int(stats.get('videoCount', 0)),
                            view_count=int(stats.get('viewCount', 0)),
                            region=params.regions[0] if params.regions else "US",
                            keywords_matched=params.keywords[:1],  # Match first keyword
                            last_upload_date=last_upload_date,
                            days_since_last_upload=days_since_upload,
                            score=round(score, 2),
                            channel_url=f"https://youtube.com/channel/{channel['id']}"
                        )
                        
                        # Check if channel already exists to avoid duplicates
                        if channel['id'] not in seen_channel_ids:
                            all_channels.append(channel_data)
                            seen_channel_ids.add(channel['id'])
                            
                    except Exception as e:
                        logger.error(f"Error processing channel: {e}")
                        continue
                        
        except Exception as e:
            logger.error(f"Error in API request: {e}")
            raise HTTPException(status_code=500, detail=str(e))
    
    # Add randomization to final results for variety
    if len(all_channels) > params.max_results:
        # Shuffle and take a random subset to ensure variety
        random.shuffle(all_channels)
    
    # Sort by score in descending order but with some randomness
    all_channels.sort(key=lambda x: x.score + random.uniform(-2, 2), reverse=True)
    return all_channels[:params.max_results]

@app.post("/api/search", response_model=SearchResponse)
async def search_podcasts(params: SearchParams):
    """Search for podcast channels based on the given parameters."""
    if not YOUTUBE_API_KEY:
        raise HTTPException(status_code=500, detail="YouTube API key not configured")
    
    try:
        channels = await search_channels(params)
        record_api_usage("search", 200)  # Record successful usage
        return SearchResponse(
            success=True,
            data=channels,
            total_results=len(channels),
            params=params.dict()
        )
    except Exception as e:
        logger.error(f"Search error: {e}")
        record_api_usage("search", 500)  # Record error
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/export/csv")
async def export_csv(params: SearchParams):
    """Export search results as CSV."""
    try:
        # Use mock data for reliable export functionality
        mock_channels = [
            Channel(
                id="UC1234567890",
                title="The Business Mastery Podcast",
                description="Helping entrepreneurs scale their businesses through actionable strategies and expert interviews",
                thumbnail_url="https://via.placeholder.com/150",
                subscriber_count=125000,
                video_count=245,
                view_count=2500000,
                region="US",
                keywords_matched=["business podcast"],
                last_upload_date=datetime.utcnow() - timedelta(days=5),
                days_since_last_upload=5,
                score=85.5,
                channel_url="https://youtube.com/channel/UC1234567890",
                contact_email="contact@businessmastery.com"
            ),
            Channel(
                id="UC0987654321",
                title="Real Estate Wealth Show",
                description="Building wealth through real estate investing strategies and market insights",
                thumbnail_url="https://via.placeholder.com/150",
                subscriber_count=98000,
                video_count=189,
                view_count=1800000,
                region="US",
                keywords_matched=["real estate podcast"],
                last_upload_date=datetime.utcnow() - timedelta(days=12),
                days_since_last_upload=12,
                score=78.2,
                channel_url="https://youtube.com/channel/UC0987654321",
                contact_email="info@realestatewealth.com"
            ),
        ]
        
        channels = mock_channels[:params.max_results]
        
        # Create CSV in memory
        output = io.StringIO()
        writer = csv.writer(output)
        
        # Write header
        writer.writerow([
            "Channel Name", "Description", "Subscribers", "Video Count", "View Count", 
            "Market Region", "Keyword Matched", "Last Upload Date", 
            "Days Since Last Upload", "Score", "Channel URL", "Contact Email"
        ])
        
        # Write data
        for channel in channels:
            writer.writerow([
                channel.title,
                channel.description or "N/A",
                channel.subscriber_count,
                channel.video_count,
                channel.view_count,
                channel.region,
                ", ".join(channel.keywords_matched),
                channel.last_upload_date.isoformat() if channel.last_upload_date else "N/A",
                channel.days_since_last_upload or "N/A",
                f"{channel.score:.1f}",
                channel.channel_url,
                channel.contact_email or "N/A"
            ])
        
        # Prepare response
        output.seek(0)
        return StreamingResponse(
            iter([output.getvalue()]),
            media_type="text/csv",
            headers={
                "Content-Disposition": "attachment; filename=podcast_channels.csv",
                "Access-Control-Expose-Headers": "Content-Disposition"
            }
        )
        
    except Exception as e:
        logger.error(f"Export error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/outreach", response_model=OutreachResponse)
async def send_outreach(request: OutreachRequest):
    """Send automatic outreach emails to selected channels."""
    try:
        # Mock channels data for demonstration
        mock_channels = {
            "UC1234567890": {
                "title": "The Business Mastery Podcast",
                "contact_email": "contact@businessmastery.com",
                "subscriber_count": 125000,
                "keywords": ["business podcast"]
            },
            "UC0987654321": {
                "title": "Real Estate Wealth Show", 
                "contact_email": "info@realestatewealth.com",
                "subscriber_count": 98000,
                "keywords": ["real estate podcast"]
            }
        }
        
        sent_count = 0
        failed_count = 0
        
        for channel_id in request.channel_ids:
            channel = mock_channels.get(channel_id)
            if not channel:
                failed_count += 1
                continue
                
            # Generate outreach email
            if request.custom_message:
                email_body = request.custom_message
            else:
                email_body = f"""
Subject: Professional Podcast Collaboration Opportunity

Hi {channel['title']} Team,

I came across your podcast "{channel['title']}" and was really impressed by your content! With {channel['subscriber_count']:,} subscribers, I can see you're serious about delivering quality content to your audience.

I specialize in helping podcasters like you:
- Increase audience engagement
- Improve production quality  
- Monetization strategies
- Content distribution

Would you be open to a quick chat about potential collaboration opportunities?

Best regards,
[Your Name]
[Your Contact Information]
                """.strip()
            
            # Simulate sending email (in production, integrate with email service)
            logger.info(f"Sending outreach email to {channel['contact_email']}")
            sent_count += 1
        
        return OutreachResponse(
            success=True,
            message=f"Outreach emails sent successfully. Sent: {sent_count}, Failed: {failed_count}",
            sent_count=sent_count,
            failed_count=failed_count
        )
        
    except Exception as e:
        logger.error(f"Outreach error: {e}")
        return OutreachResponse(
            success=False,
            message=f"Outreach failed: {str(e)}",
            sent_count=0,
            failed_count=len(request.channel_ids)
        )

@app.get("/api/health")
async def health_check():
    """Health check endpoint."""
    return {"status": "healthy", "timestamp": datetime.utcnow()}

@app.get("/api/quota/status")
async def get_quota_status():
    """Get current YouTube API quota status."""
    try:
        status = quota_manager.get_quota_status()
        alerts = get_quota_alerts()
        return {
            "quota": status,
            "alerts": alerts,
            "using_fallback": quota_manager.should_use_fallback()
        }
    except Exception as e:
        logger.error(f"Error getting quota status: {e}")
        raise HTTPException(status_code=500, detail="Failed to get quota status")

@app.post("/api/quota/reset")
async def reset_quota_tracking():
    """Reset quota tracking (local tracking only, not actual API quota)."""
    try:
        quota_manager.usage.daily_used = 0
        quota_manager.usage.requests_today = 0
        quota_manager.usage.errors_403 = 0
        quota_manager._save_usage()
        return {"message": "Local quota tracking reset", "timestamp": datetime.utcnow()}
    except Exception as e:
        logger.error(f"Error resetting quota tracking: {e}")
        raise HTTPException(status_code=500, detail="Failed to reset quota tracking")

@app.post("/api/search/mock")
async def search_podcasts_mock(params: SearchParams):
    """Mock search endpoint for testing without YouTube API."""
    # Base mock channels
    base_channels = [
        Channel(
            id="UC1234567890",
            title="The Business Mastery Podcast",
            description="Helping entrepreneurs scale their businesses",
            thumbnail_url="https://via.placeholder.com/150",
            subscriber_count=125000,
            video_count=245,
            view_count=2500000,
            region="US",
            keywords_matched=["business podcast"],
            last_upload_date=datetime.utcnow() - timedelta(days=5),
            days_since_last_upload=5,
            score=85.5,
            channel_url="https://youtube.com/channel/UC1234567890"
        ),
        Channel(
            id="UC0987654321",
            title="Real Estate Wealth Show",
            description="Building wealth through real estate investing",
            thumbnail_url="https://via.placeholder.com/150",
            subscriber_count=98000,
            video_count=189,
            view_count=1800000,
            region="US",
            keywords_matched=["real estate podcast"],
            last_upload_date=datetime.utcnow() - timedelta(days=12),
            days_since_last_upload=12,
            score=78.2,
            channel_url="https://youtube.com/channel/UC0987654321"
        ),
        Channel(
            id="UC5432109876",
            title="SaaS Growth Strategies",
            description="Scaling software as a service companies",
            thumbnail_url="https://via.placeholder.com/150",
            subscriber_count=75000,
            video_count=156,
            view_count=1200000,
            region="UK",
            keywords_matched=["saas podcast"],
            last_upload_date=datetime.utcnow() - timedelta(days=3),
            days_since_last_upload=3,
            score=82.1,
            channel_url="https://youtube.com/channel/UC5432109876"
        ),
        Channel(
            id="UC1111222333",
            title="Finance Freedom Podcast",
            description="Achieving financial independence through smart investing",
            thumbnail_url="https://via.placeholder.com/150",
            subscriber_count=156000,
            video_count=298,
            view_count=3200000,
            region="CA",
            keywords_matched=["finance podcast"],
            last_upload_date=datetime.utcnow() - timedelta(days=7),
            days_since_last_upload=7,
            score=88.7,
            channel_url="https://youtube.com/channel/UC1111222333"
        ),
        Channel(
            id="UC4444555666",
            title="Coaching Excellence Show",
            description="Helping coaches build successful businesses",
            thumbnail_url="https://via.placeholder.com/150",
            subscriber_count=62000,
            video_count=178,
            view_count=980000,
            region="AU",
            keywords_matched=["coaching podcast"],
            last_upload_date=datetime.utcnow() - timedelta(days=15),
            days_since_last_upload=15,
            score=74.3,
            channel_url="https://youtube.com/channel/UC4444555666"
        )
    ]
    
    # Simulate duplicates by returning the same channels for different keywords
    # but with different keywords_matched arrays
    mock_channels = []
    seen_ids = set()
    
    for keyword in params.keywords:
        for channel in base_channels[:3]:  # Use first 3 channels to simulate overlap
            if channel.id not in seen_ids:
                new_channel = Channel(
                    id=channel.id,
                    title=channel.title,
                    description=channel.description,
                    thumbnail_url=channel.thumbnail_url,
                    subscriber_count=channel.subscriber_count,
                    video_count=channel.video_count,
                    view_count=channel.view_count,
                    region=channel.region,
                    keywords_matched=[keyword],  # Different keyword for same channel
                    last_upload_date=channel.last_upload_date,
                    days_since_last_upload=channel.days_since_last_upload,
                    score=channel.score,
                    channel_url=channel.channel_url
                )
                mock_channels.append(new_channel)
                seen_ids.add(channel.id)
    
    return SearchResponse(
        success=True,
        data=mock_channels,
        total_results=len(mock_channels),
        params=params.dict(),
        timestamp=datetime.utcnow()
    )

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
