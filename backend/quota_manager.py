"""
YouTube API Quota Management System

This module handles YouTube API quota tracking, monitoring, and provides
fallback strategies when quotas are exceeded.
"""

import os
import json
import time
import logging
from datetime import datetime, timedelta
from typing import Dict, Optional, Tuple
from pathlib import Path
from dataclasses import dataclass, asdict

logger = logging.getLogger(__name__)

@dataclass
class QuotaUsage:
    """Track quota usage statistics"""
    daily_quota: int = 10000  # Default daily quota for YouTube Data API v3
    daily_used: int = 0
    last_reset_date: str = ""
    requests_today: int = 0
    errors_403: int = 0
    last_request_time: float = 0
    quota_reset_time: float = 0  # When quota resets (Pacific Time)

class QuotaManager:
    """Manages YouTube API quota usage and provides fallback strategies"""
    
    def __init__(self, quota_file: str = "quota_usage.json"):
        self.quota_file = Path(quota_file)
        self.usage = self._load_usage()
        self._check_daily_reset()
        
    def _load_usage(self) -> QuotaUsage:
        """Load quota usage from file"""
        if self.quota_file.exists():
            try:
                with open(self.quota_file, 'r') as f:
                    data = json.load(f)
                return QuotaUsage(**data)
            except Exception as e:
                logger.warning(f"Error loading quota file: {e}")
        
        return QuotaUsage(
            last_reset_date=datetime.now().strftime("%Y-%m-%d"),
            quota_reset_time=self._get_next_quota_reset()
        )
    
    def _save_usage(self):
        """Save quota usage to file"""
        try:
            with open(self.quota_file, 'w') as f:
                json.dump(asdict(self.usage), f, indent=2)
        except Exception as e:
            logger.error(f"Error saving quota file: {e}")
    
    def _get_next_quota_reset(self) -> float:
        """Get next quota reset time (Pacific Time, midnight)"""
        # YouTube API quota resets at midnight Pacific Time
        import pytz
        pacific = pytz.timezone('America/Los_Angeles')
        now_pacific = datetime.now(pacific)
        tomorrow = now_pacific + timedelta(days=1)
        reset_time = tomorrow.replace(hour=0, minute=0, second=0, microsecond=0)
        return reset_time.timestamp()
    
    def _check_daily_reset(self):
        """Check if daily quota should be reset"""
        today = datetime.now().strftime("%Y-%m-%d")
        if self.usage.last_reset_date != today:
            logger.info("Resetting daily quota usage")
            self.usage.daily_used = 0
            self.usage.requests_today = 0
            self.usage.errors_403 = 0
            self.usage.last_reset_date = today
            self.usage.quota_reset_time = self._get_next_quota_reset()
            self._save_usage()
    
    def can_make_request(self, estimated_cost: int = 100) -> Tuple[bool, str]:
        """Check if a request can be made within quota limits"""
        self._check_daily_reset()
        
        # Check if we're close to quota limit
        if self.usage.daily_used + estimated_cost > self.usage.daily_quota:
            wait_time = self.usage.quota_reset_time - time.time()
            hours = wait_time / 3600
            return False, f"Quota would be exceeded. Wait {hours:.1f} hours for reset."
        
        # Check rate limiting (max 10 requests per second)
        current_time = time.time()
        if current_time - self.usage.last_request_time < 0.1:
            return False, "Rate limit exceeded. Wait 100ms between requests."
        
        return True, "Request allowed"
    
    def record_request(self, cost: int = 100, status_code: int = 200):
        """Record a request and its quota cost"""
        self.usage.daily_used += cost
        self.usage.requests_today += 1
        self.usage.last_request_time = time.time()
        
        if status_code == 403:
            self.usage.errors_403 += 1
            logger.warning(f"403 error recorded. Total 403 errors: {self.usage.errors_403}")
        
        self._save_usage()
    
    def get_quota_status(self) -> Dict:
        """Get current quota status"""
        self._check_daily_reset()
        
        remaining = self.usage.daily_quota - self.usage.daily_used
        reset_in_hours = (self.usage.quota_reset_time - time.time()) / 3600
        
        return {
            "daily_quota": self.usage.daily_quota,
            "daily_used": self.usage.daily_used,
            "remaining": remaining,
            "remaining_percent": (remaining / self.usage.daily_quota) * 100,
            "requests_today": self.usage.requests_today,
            "errors_403": self.usage.errors_403,
            "resets_in_hours": max(0, reset_in_hours),
            "last_reset_date": self.usage.last_reset_date
        }
    
    def get_cost_estimate(self, operation: str) -> int:
        """Estimate quota cost for different operations"""
        costs = {
            "search": 100,
            "channel_details": 1,
            "playlist_items": 1,
            "video_details": 1,
            "comment_threads": 1,
        }
        return costs.get(operation, 100)
    
    def should_use_fallback(self) -> bool:
        """Determine if fallback data should be used"""
        # Use fallback if quota is low or we've had multiple 403 errors
        remaining_percent = ((self.usage.daily_quota - self.usage.daily_used) / self.usage.daily_quota) * 100
        
        return (
            remaining_percent < 10 or  # Less than 10% quota remaining
            self.usage.errors_403 >= 3 or  # Multiple 403 errors
            self.usage.daily_used >= self.usage.daily_quota  # Quota exceeded
        )

# Global quota manager instance
quota_manager = QuotaManager()

def check_quota_and_proceed(operation: str) -> Tuple[bool, str]:
    """
    Check quota before making an API request
    Returns (can_proceed, message)
    """
    cost = quota_manager.get_cost_estimate(operation)
    can_proceed, message = quota_manager.can_make_request(cost)
    
    if not can_proceed:
        logger.warning(f"Quota check failed for {operation}: {message}")
        if quota_manager.should_use_fallback():
            message += " Using fallback data."
    
    return can_proceed, message

def record_api_usage(operation: str, status_code: int = 200):
    """Record API usage after request completes"""
    cost = quota_manager.get_cost_estimate(operation)
    quota_manager.record_request(cost, status_code)

# Quota monitoring and alerting functions
def get_quota_alerts() -> list:
    """Get alerts about quota usage"""
    alerts = []
    status = quota_manager.get_quota_status()
    
    if status["remaining_percent"] < 20:
        alerts.append({
            "level": "warning",
            "message": f"Only {status['remaining_percent']:.1f}% quota remaining"
        })
    
    if status["errors_403"] > 0:
        alerts.append({
            "level": "error", 
            "message": f"{status['errors_403']} API errors detected"
        })
    
    if status["remaining_percent"] < 5:
        alerts.append({
            "level": "critical",
            "message": "Critically low quota - consider using fallback data"
        })
    
    return alerts
