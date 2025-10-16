"""
Pruebas unitarias mínimas para la API (FastAPI) de Nutri App.
Cubre: autenticación básica, validación de archivos, flujo feliz de /api/analyse_meal,
guardado en /api/save_analysis, manejo de JSON inválido y helper _compute_totals.
"""

import io
import json
from unittest.mock import MagicMock, patch
from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)

MOCK_JWT_TOKEN = "Bearer mock_jwt_token"
MOCK_USER_ID = "mock_user_id_123"

ENDPOINT_ANALYSE_MEAL = "/api/analyse_meal"
ENDPOINT_SAVE_ANALYSIS = "/api/save_analysis"

MOCK_USER_DATA = {
    "name": "Test User",
    "age": 25,
    "height_cm": 175,
    "weight_kg": 70.0,
    "gender": "male",
    "activity_level_id": 2,
    "objective_id": 1,
}

MOCK_ANALYSIS_RESULT = {
    "alimentos": [
        {
            "nombre": "pollo a la plancha",
            "cantidad_estimada_gramos": 150,
            "calorias": 250,
            "proteinas_g": 30,
            "carbohidratos_g": 0,
            "grasas_g": 8,
        }
    ]
}


# ---------- AUTENTICACIÓN ----------

# Verifica que, si falta el header Authorization, el endpoint rechaza la petición.
def test_missing_authorization_header():
    files = {"image": ("test.jpg", io.BytesIO(b"fake image"), "image/jpeg")}
    resp = client.post(ENDPOINT_ANALYSE_MEAL, files=files)
    # Si tu endpoint define el header como requerido (Header(...)), FastAPI devuelve 422
    assert resp.status_code in (401, 422)


# Verifica que, con token inválido, se devuelve 401 con mensaje de token inválido.
@patch("app.core.supabase.supabase.auth.get_user")
def test_invalid_token(mock_get_user):
    mock_get_user.side_effect = Exception("Invalid token")
    files = {"image": ("test.jpg", io.BytesIO(b"fake image"), "image/jpeg")}
    resp = client.post(
        ENDPOINT_ANALYSE_MEAL,
        files=files,
        headers={"Authorization": "Bearer invalid_token"},
    )
    assert resp.status_code == 401
    assert "inválido" in resp.json().get("detail", "").lower()


# ---------- /api/analyse_meal ----------

# Verifica que un archivo que no es imagen sea rechazado con 400.
@patch("app.routes.analyse.supabase_admin.auth.get_user")
def test_reject_non_image_file(mock_get_user):
    mock_user = MagicMock()
    mock_user.user.id = MOCK_USER_ID
    mock_get_user.return_value = mock_user

    files = {"image": ("test.txt", io.BytesIO(b"not an image"), "text/plain")}
    resp = client.post(
        ENDPOINT_ANALYSE_MEAL,
        files=files,
        headers={"Authorization": MOCK_JWT_TOKEN},
    )
    assert resp.status_code == 400
    # Ajusta este detalle si tu mensaje es distinto
    assert "image" in resp.json().get("detail", "").lower()


# Verifica el flujo feliz de análisis: obtiene perfil, llama a OpenAI y responde 200.
@patch("app.routes.analyse.supabase_admin.auth.get_user")
@patch("app.routes.analyse.client.chat.completions.create")
@patch("app.routes.analyse.supabase_admin.table")
def test_successful_image_analysis(mock_table, mock_openai, mock_get_user):
    mock_user = MagicMock()
    mock_user.user.id = MOCK_USER_ID
    mock_get_user.return_value = mock_user

    # Mock perfil de usuario
    mock_select = MagicMock()
    mock_select.eq.return_value.limit.return_value.execute.return_value.data = [
        MOCK_USER_DATA
    ]
    mock_table.return_value.select.return_value = mock_select

    # Mock OpenAI (visión y recomendación)
    vision_resp = MagicMock()
    vision_resp.choices[0].message.content = json.dumps(MOCK_ANALYSIS_RESULT)
    text_resp = MagicMock()
    text_resp.choices[0].message.content = "Excelente comida rica en proteínas"
    mock_openai.side_effect = [vision_resp, text_resp]

    files = {"image": ("test.jpg", io.BytesIO(b"fake image data"), "image/jpeg")}
    resp = client.post(
        ENDPOINT_ANALYSE_MEAL, files=files, headers={"Authorization": MOCK_JWT_TOKEN}
    )
    assert resp.status_code == 200
    data = resp.json()
    assert "analysis" in data and "recommendation" in data
    assert data["analysis"]["alimentos"][0]["nombre"] == "pollo a la plancha"


# ---------- /api/save_analysis ----------

# Verifica el flujo feliz de guardado: sube imagen, inserta meal e items y retorna 201.
@patch("app.routes.analyse.supabase_admin.auth.get_user")
@patch("app.routes.analyse.supabase_admin.storage")
@patch("app.routes.analyse.supabase_admin.table")
def test_save_analysis_success(mock_table, mock_storage, mock_get_user):
    mock_user = MagicMock()
    mock_user.user.id = MOCK_USER_ID
    mock_get_user.return_value = mock_user

    # Storage
    bucket = MagicMock()
    mock_storage.from_.return_value = bucket
    bucket.upload.return_value = None
    bucket.get_public_url.return_value = {
        "data": {"publicUrl": "https://public.example/meals/test.jpg"}
    }

    # BD
    meal_insert = MagicMock()
    meal_insert.execute.return_value.data = [{"id": "meal123"}]
    items_insert = MagicMock()
    items_insert.execute.return_value = MagicMock()

    def _table(t):
        if t == "meals":
            return MagicMock(insert=MagicMock(return_value=meal_insert))
        return MagicMock(insert=MagicMock(return_value=items_insert))

    mock_table.side_effect = _table

    files = {"image": ("test.jpg", io.BytesIO(b"fake image"), "image/jpeg")}
    data = {"analysis": json.dumps(MOCK_ANALYSIS_RESULT), "recommendation": "Buena comida"}
    resp = client.post(
        ENDPOINT_SAVE_ANALYSIS,
        files=files,
        data=data,
        headers={"Authorization": MOCK_JWT_TOKEN},
    )
    assert resp.status_code == 201
    body = resp.json()
    assert "meal_id" in body and "public_url" in body


# Verifica que, si 'analysis' no es JSON válido, devuelve 400 con mensaje claro.
@patch("app.routes.analyse.supabase_admin.auth.get_user")
def test_invalid_json_analysis(mock_get_user):
    mock_user = MagicMock()
    mock_user.user.id = MOCK_USER_ID
    mock_get_user.return_value = mock_user

    files = {"image": ("test.jpg", io.BytesIO(b"fake image"), "image/jpeg")}
    data = {"analysis": "invalid json", "recommendation": "texto"}
    resp = client.post(
        ENDPOINT_SAVE_ANALYSIS,
        files=files,
        data=data,
        headers={"Authorization": MOCK_JWT_TOKEN},
    )
    assert resp.status_code == 400
    assert "json" in resp.json().get("detail", "").lower()


# ---------- HELPERS ----------

# Verifica que _compute_totals sume correctamente calorías y macros.
def test_compute_totals_function():
    from app.routes.analyse import _compute_totals

    items = [
        {"calorias": 100, "proteinas_g": 10, "carbohidratos_g": 5, "grasas_g": 3},
        {"calorias": 200, "proteinas_g": 15, "carbohidratos_g": 10, "grasas_g": 7},
    ]
    result = _compute_totals(items)
    assert result["calorias"] == 300.0
    assert result["proteinas_g"] == 25.0
    assert result["carbohidratos_g"] == 15.0
    assert result["grasas_g"] == 10.0