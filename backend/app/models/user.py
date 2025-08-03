from pydantic import BaseModel
from typing import Optional, Literal

class UserProfileInput(BaseModel):
    age: int
    height_cm: int
    weight_kg: float
    gender: Literal["male", "female"]
    activity_level_id: int
    objective_id: int

class UserCreate(UserProfileInput):
    name: str
    
class UserUpdate(BaseModel):
    name: Optional[str] = None
    age: Optional[int] = None
    height_cm: Optional[int] = None
    weight_kg: Optional[float] = None
    sex: Optional[int] = None
    activity_level_id: Optional[int] = None
    objective_id: Optional[int] = None