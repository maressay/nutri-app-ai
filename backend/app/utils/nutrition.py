from typing import TypedDict
from models.user import UserProfileInput

class NutritionResult(TypedDict):
    required_calories: int
    required_protein_g: float
    required_fat_g: float
    required_carbs_g: float

def calculate_nutrition_targets(user: UserProfileInput) -> NutritionResult:
    
    age = user.age
    height_cm = user.height_cm
    weight_kg = user.weight_kg
    gender = user.gender
    activity_level = user.activity_level_id
    objective = user.objective_id
    
    if gender == "male":
        tmb = (13.397 * weight_kg) + (4.799 * height_cm) - (5.677 * age) + 88.362
    elif gender == "female":
        tmb = (9.247 * weight_kg) + (3.098 * height_cm) - (4.330 * age) + 447.593
    
    factor = {
        1: 1.2, # sedentary
        2: 1.375, # slightly active
        3: 1.55, # moderately active
        4: 1.725, # strong exercise
        5: 1.9 # very strong exercise
    }[activity_level]
    
    calories = tmb * factor
    
    if objective == 1:  # gaing muscle
        calories *= 1.15
    elif objective == 2:  # lose_fat
        calories *= 0.85
    
    ratios = {
        1: (0.30, 0.25, 0.45), # gain muscle
        2: (0.30, 0.30, 0.40), # lose fat
        3: (0.25, 0.30, 0.45), # maintain weight
     }[objective]

    protein_g = (calories * ratios[0]) / 4
    fat_g = (calories * ratios[1]) / 9
    carbs_g = (calories * ratios[2]) / 4
    
    return {
        "required_calories": int(calories),
        "required_protein_g": round(protein_g, 2),
        "required_fat_g": round(fat_g,2),
        "required_carbs_g": round(carbs_g,2)
    }