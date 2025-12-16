from fastapi import FastAPI
from main import app

# Vercel serverless entry point
app = app

# For Vercel deployment
handler = app
