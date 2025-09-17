
from fastapi import APIRouter, HTTPException, Header, Depends
from app.utils.nutrition import calculate_nutrition_targets
from app.core.supabase import verify_token, supabase
from app.models.user import UserCreate
from postgrest.exceptions import APIError

router = APIRouter()

def get_current_user_id(authorization: str = Header(...)) -> str:
    user_id = verify_token(authorization)
    return user_id


@router.get("/history_meals")
def get_meal_history(user_id: str = Depends(get_current_user_id)):
    try:
        history = supabase.table("meals").select("*").eq("user_id", user_id).order("date_creation", desc=True).execute()
        return history.data
    except APIError as e:
        raise HTTPException(status_code=500, detail=str(e))
    
    
@router.get("/history_meals/{meal_id}")
def get_meal_detail(meal_id: str, user_id: str = Depends(get_current_user_id)):
    try:
        meal = supabase.table("meals").select("*").eq("id", meal_id).eq("user_id", user_id).execute()
        meal_items = supabase.table("meal_items").select("*").eq("meal_id", meal_id).execute()
        if not meal.data:
            raise HTTPException(status_code=404, detail="Meal not found")
        return {"meal": meal.data[0], "items": meal_items.data}
    except APIError as e:
        raise HTTPException(status_code=500, detail=str(e))
