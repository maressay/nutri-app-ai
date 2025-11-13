from typing import TypedDict
from app.models.user import UserProfileInput


class NutritionResult(TypedDict):
    required_calories: int
    required_protein_g: float
    required_fat_g: float
    required_carbs_g: float


def calculate_nutrition_targets(user: UserProfileInput) -> NutritionResult:
    """
    Calcula objetivos diarios de calorías y macronutrientes usando:

    - Fórmula Mifflin-St Jeor para TMB.
    - Factor de actividad estándar según activity_level_id.
    - Ajuste por objetivo (ganar, perder, mantener).
    - Proteínas y grasas basadas en g/kg.
    - Carbohidratos = calorías restantes.
    """

    age = user.age
    height_cm = user.height_cm
    weight_kg = user.weight_kg
    gender = (user.gender or "").lower()
    activity_level = user.activity_level_id
    objective = user.objective_id

    # 1) TMB: Mifflin-St Jeor
    if gender == "male":
        # Hombres
        bmr = 10 * weight_kg + 6.25 * height_cm - 5 * age + 5
    elif gender == "female":
        # Mujeres
        bmr = 10 * weight_kg + 6.25 * height_cm - 5 * age - 161
    else:
        # fallback básico si no se define bien el género
        bmr = 10 * weight_kg + 6.25 * height_cm - 5 * age

    # 2) Factor de actividad
    activity_factors = {
        1: 1.2,   # sedentario
        2: 1.375, # ligera
        3: 1.55,  # moderada
        4: 1.725, # intensa
        5: 1.9,   # muy intensa
    }
    factor = activity_factors.get(activity_level, 1.2)
    maintenance_calories = bmr * factor

    # 3) Ajuste por objetivo
    # 1 = ganar músculo, 2 = perder grasa, 3 = mantener
    if objective == 1:
        total_calories = maintenance_calories * 1.15  # +15%
    elif objective == 2:
        total_calories = maintenance_calories * 0.80  # -20%
    else:
        total_calories = maintenance_calories  # mantener por defecto

    # 4) Macros en g/kg según objetivo
    if objective == 1:  # ganar músculo
        protein_per_kg = 1.8
        fat_per_kg = 0.9
    elif objective == 2:  # perder grasa
        protein_per_kg = 2.0
        fat_per_kg = 0.8
    else:  # mantener
        protein_per_kg = 1.6
        fat_per_kg = 0.9

    protein_g = weight_kg * protein_per_kg
    fat_g = weight_kg * fat_per_kg

    # kcal aportadas por proteína y grasa
    protein_kcal = protein_g * 4
    fat_kcal = fat_g * 9
    base_macro_kcal = protein_kcal + fat_kcal

    # 5) Si proteína + grasa se comen todas las calorías, las escalamos
    if base_macro_kcal > total_calories:
        scale = total_calories / base_macro_kcal
        protein_g *= scale
        fat_g *= scale
        protein_kcal = protein_g * 4
        fat_kcal = fat_g * 9

    # 6) Carbohidratos = calorías restantes
    carbs_kcal = max(total_calories - protein_kcal - fat_kcal, 0)
    carbs_g = carbs_kcal / 4 if carbs_kcal > 0 else 0.0

    return {
        "required_calories": int(round(total_calories)),
        "required_protein_g": round(protein_g, 2),
        "required_fat_g": round(fat_g, 2),
        "required_carbs_g": round(carbs_g, 2),
    }
