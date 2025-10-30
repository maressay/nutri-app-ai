
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

@router.delete("/delete_meal/{meal_id}")
def delete_meal(meal_id: str, user_id: str = Depends(get_current_user_id)):
    try:
        meal = supabase.table("meals").select("*").eq("id", meal_id).eq("user_id", user_id).execute()
        if not meal.data:
            raise HTTPException(status_code=404, detail="Meal not found")
        supabase.table("meal_items").delete().eq("meal_id", meal_id).execute()
        supabase.table("meals").delete().eq("id", meal_id).eq("user_id", user_id).execute()
        return {"detail": "Meal deleted successfully"}
    except APIError as e:
        raise HTTPException(status_code=500, detail=str(e))



# ⬇️ reemplaza tus imports y helpers por esto
from typing import Optional, Tuple
from datetime import datetime, date as date_cls, time as time_cls, timedelta, timezone

try:
    from zoneinfo import ZoneInfo, ZoneInfoNotFoundError  # Py3.9+
except Exception:  # ultra-robusto
    ZoneInfo = None
    ZoneInfoNotFoundError = Exception

def resolve_tz(tz_name: str):
    """
    Devuelve tzinfo robusto:
    - Intenta ZoneInfo(tz_name)
    - Si falla y es Lima: -05:00 fijo (Perú no usa DST)
    - Si falla cualquier otra: UTC
    """
    if ZoneInfo is not None:
        try:
            return ZoneInfo(tz_name)
        except ZoneInfoNotFoundError:
            pass
    if tz_name == "America/Lima":
        return timezone(timedelta(hours=-5))
    return timezone.utc

def _day_range_utc(date_str: Optional[str], tz_name: str = "America/Lima") -> tuple[str, str, str]:
    """
    Convierte una fecha local (YYYY-MM-DD) a rango UTC [start, end) ISO8601.
    Si no se pasa fecha, usa la fecha “hoy” en la TZ indicada.
    """
    tz = resolve_tz(tz_name)

    if date_str:
        target_date = date_cls.fromisoformat(date_str)
    else:
        target_date = datetime.now(tz).date()

    start_local = datetime.combine(target_date, time_cls.min).replace(tzinfo=tz)
    end_local   = start_local + timedelta(days=1)

    start_utc = start_local.astimezone(timezone.utc).isoformat()
    end_utc   = end_local.astimezone(timezone.utc).isoformat()
    return (target_date.isoformat(), start_utc, end_utc)

@router.get("/meals/day")
def get_meals_and_summary_for_day(
    date: Optional[str] = Query(
        default=None,
        description="Fecha en formato YYYY-MM-DD. Por defecto, la fecha actual en America/Lima."
    ),
    tz: str = Query(
        default="America/Lima",
        description="Timezone IANA para calcular el día local (ej. America/Lima)."
    ),
    user_id: str = Depends(get_current_user_id),
):
    """
    Devuelve:
    - date: fecha local solicitada
    - timezone: timezone usado
    - targets: objetivos diarios del usuario (required_* y metadatos)
    - totals: sumatoria consumida en el día (cal, prot, carb, fat)
    - meals_count: número de comidas del día
    - meals: lista de comidas del día (para listar/depurar/thumbnail)
    """
    try:
        # Rango del día en UTC (robusto vs date(date_creation) = ...)
        local_date, start_utc, end_utc = _day_range_utc(date, tz)

        # 1) Traer comidas del día del usuario
        meals_res = (
            supabase.table("meals")
            .select(
                "id,user_id,date_creation,img_url,recommendation,"
                "total_calories,total_carbs_g,total_fat_g,total_protein_g"
            )
            .eq("user_id", user_id)
            .gte("date_creation", start_utc)
            .lt("date_creation", end_utc)
            .order("date_creation", desc=False)
            .execute()
        )
        meals = meals_res.data or []

        # 2) Sumar totales
        def f(x):  # cast seguro a float
            try:
                return float(x) if x is not None else 0.0
            except Exception:
                return 0.0

        totals = {
            "calories": sum(f(m.get("total_calories")) for m in meals),
            "protein_g": sum(f(m.get("total_protein_g")) for m in meals),
            "carbs_g":   sum(f(m.get("total_carbs_g")) for m in meals),
            "fat_g":     sum(f(m.get("total_fat_g")) for m in meals),
        }

        # 3) Traer objetivos del usuario para las barras (y header “bonito”)
        #    Usamos columnas ya calculadas si existen en tu tabla users.
        user_res = (
            supabase.table("users")
            .select(
                "required_calories,required_protein_g,required_fat_g,required_carbs_g,"
                "objective_id,activity_level_id"
            )
            .eq("id", user_id)
            .execute()
        )
        user_row = (user_res.data or [{}])[0]

        targets = {
            "required_calories": user_row.get("required_calories"),
            "required_protein_g": user_row.get("required_protein_g"),
            "required_fat_g": user_row.get("required_fat_g"),
            "required_carbs_g": user_row.get("required_carbs_g"),
            "objective": user_row.get("objective_id"),
            "activity_level": user_row.get("activity_level_id"),
        }

        return {
            "date": local_date,
            "timezone": tz,
            "targets": targets,
            "totals": totals,
            "meals_count": len(meals),
            "meals": meals,
        }

    except APIError as e:
        raise HTTPException(status_code=500, detail=str(e))
    except ValueError:
        # fecha malformateada
        raise HTTPException(
            status_code=400,
            detail="El parámetro 'date' debe tener formato YYYY-MM-DD."
        )