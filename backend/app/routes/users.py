from fastapi import APIRouter, HTTPException, Header, Depends, Query
from app.utils.nutrition import calculate_nutrition_targets
from app.core.supabase import verify_token, supabase
from app.models.user import UserCreate
from postgrest.exceptions import APIError

from typing import Optional
from datetime import datetime, date as date_cls, time as time_cls, timedelta, timezone
from zoneinfo import ZoneInfo

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
        
@router.put("/users/edit_profile")
def update_user(user: UserCreate, user_id: str = Depends(get_current_user_id)):
    print(f"Updating user with ID: {user_id}")
    user_data = user.model_dump()
    
    macros = calculate_nutrition_targets(user)
    
    full_user = {**user_data, **macros}
    
    try:
        result = (
            supabase.table("users")
            .update(full_user)
            .eq("id", user_id)
            .execute()
        )
        return result.data
    except APIError as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error updating user: {e.message or 'Unknown error'}"
        )
    
@router.get("/users/me")
def get_current_user(user_id: str = Depends(get_current_user_id)):
    try:
        # Embeds: usa las FKs users.activity_level_id -> activity_levels.id
        # y users.objective_id -> objectives.id
        res = (
            supabase.table("users")
            .select(
                "id,name,age,height_cm,weight_kg,gender,"
                "required_calories,required_protein_g,required_fat_g,required_carbs_g,"
                "activity_levels_id:activity_level_id(id),"
                "activity_levels:activity_level_id(name),"
                "objectives_id:objective_id(id),"
                "objectives:objective_id(name)"
            )
            .eq("id", user_id)
            .single()
            .execute()
        )

        if res.data is None:
            raise HTTPException(status_code=404, detail="User not found")

        row = res.data
        

        # Aplanamos: devolvemos nombres en campos nuevos y NO enviamos *_id
        payload = {
            "id": row["id"],  # si no quieres exponerlo, quítalo aquí
            "name": row.get("name"),
            "age": row.get("age"),
            "height_cm": row.get("height_cm"),
            "weight_kg": row.get("weight_kg"),
            "gender": row.get("gender"),
            "required_calories": row.get("required_calories"),
            # Si 'numeric' llega como Decimal, puedes castear a float/str si lo prefieres:
            "required_protein_g": row.get("required_protein_g"),
            "required_fat_g": row.get("required_fat_g"),
            "required_carbs_g": row.get("required_carbs_g"),
            "activity_level_id": (row.get("activity_levels_id") or {}).get("id"),
            "objective_id": (row.get("objectives_id") or {}).get("id"),
            "activity_level": (row.get("activity_levels") or {}).get("name"),
            "objective": (row.get("objectives") or {}).get("name"),
        }
        
        return payload

    except APIError as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error fetching user: {e.message or 'Unknown error'}"
        )
        
        