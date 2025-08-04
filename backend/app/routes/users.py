from fastapi import APIRouter, HTTPException, Header, Depends
from utils.nutrition import calculate_nutrition_targets
from core.supabase import verify_token, supabase
from models.user import UserCreate
from postgrest.exceptions import APIError

router = APIRouter()

def get_current_user_id(authorization: str = Header(...)) -> str:
    user_id = verify_token(authorization)
    return user_id


@router.post("/users")
def create_user(user: UserCreate, user_id: str = Depends(get_current_user_id)):
    print(f"Creating user with ID: {user_id}")
    user_data = user.model_dump()
    user_data["id"] = user_id
    
    print(user_data)
    
    macros = calculate_nutrition_targets(user)
    
    full_user = {**user_data, **macros}
    
    try:
        result = supabase.table("users").upsert(full_user).execute()
        return result.data
    except APIError as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error creating user: {e.message or 'Unknown error'}"
        )