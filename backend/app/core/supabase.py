from supabase import create_client
import os
from dotenv import load_dotenv
from fastapi import HTTPException

load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")

if not SUPABASE_URL or not SUPABASE_KEY:
    raise RuntimeError("SUPABASE_URL and SUPABASE_KEY environment variables must be set")

supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

def verify_token(token: str):
    """Verify the JWT token."""
    
    if token.startswith("Bearer "):
        token = token.split(" ")[1]
         
    try:
        user_data = supabase.auth.get_user(token)
        return user_data.user.id # type: ignore
          
    except Exception as e:
        print(f"Error verifying token: {e}")
        raise HTTPException(status_code=500, detail=f"Invalid or expired token, {e}")
    