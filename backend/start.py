#!/usr/bin/env python3
"""
Startup script: runs alembic migrations then starts uvicorn.
Handles URL format differences between psycopg2 (sync) and asyncpg.
"""
import os
import subprocess
import sys


def fix_url_for_psycopg2(url: str) -> str:
    """Convert asyncpg URL to psycopg2-compatible URL."""
    url = url.replace("postgresql+asyncpg://", "postgresql://")
    url = url.replace("ssl=require", "sslmode=require")
    url = url.replace("channel_binding=require&", "")
    url = url.replace("&channel_binding=require", "")
    url = url.replace("channel_binding=require", "")
    return url


def fix_url_for_asyncpg(url: str) -> str:
    """Convert plain postgresql:// URL to asyncpg-compatible URL."""
    url = url.replace("sslmode=require", "ssl=require")
    url = url.replace("channel_binding=require&", "")
    url = url.replace("&channel_binding=require", "")
    url = url.replace("channel_binding=require", "")
    if url.startswith("postgresql://") and "+asyncpg" not in url:
        url = url.replace("postgresql://", "postgresql+asyncpg://", 1)
    return url


db_url = os.environ.get("DATABASE_URL", "")
port = os.environ.get("PORT", "8080")

if db_url:
    # Run alembic with psycopg2-compatible URL
    sync_url = fix_url_for_psycopg2(db_url)
    print(f"Running migrations with: {sync_url[:40]}...")
    env = os.environ.copy()
    env["DATABASE_URL"] = sync_url
    result = subprocess.run(["alembic", "upgrade", "head"], env=env)
    if result.returncode != 0:
        print("WARNING: Migrations failed, continuing anyway...")

    # Set asyncpg URL for the app
    async_url = fix_url_for_asyncpg(db_url)
    os.environ["DATABASE_URL"] = async_url
    print(f"Starting server with: {async_url[:40]}...")

# Start uvicorn
os.execvp("uvicorn", ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", port])
