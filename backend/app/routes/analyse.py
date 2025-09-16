from fastapi import APIRouter, UploadFile, File, HTTPException, Header, Form
from fastapi.responses import JSONResponse
from openai import OpenAI
from dotenv import load_dotenv
import os
import base64
import json
import re
from ..core.supabase import supabase
import logging
from datetime import datetime, timezone
import os, json, uuid
from supabase import create_client, Client

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
)

load_dotenv()

OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
SUPABASE_BUCKET = os.getenv("SUPABASE_BUCKET")
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
client = OpenAI(api_key=OPENAI_API_KEY)

if SUPABASE_URL is None or SUPABASE_SERVICE_ROLE_KEY is None:
    print("SUPABASE_URL", SUPABASE_URL)
    print("SUPABASE_SERVICE_ROLE_KEY", SUPABASE_SERVICE_ROLE_KEY)
    raise RuntimeError("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables must be set")
supabase_admin: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

router = APIRouter()

@router.post("/analyse_meal")
async def analyse_meal(image: UploadFile = File(...), authorization: str = Header(...)) -> JSONResponse:
   
    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(status_code=401, detail="Falta token Bearer.")
    token = authorization.split(" ", 1)[1]

    try:
        user_resp = supabase_admin.auth.get_user(jwt=token)
        user_id = (
            getattr(getattr(user_resp, "user", None), "id", None)
            or (user_resp.get("user", {}) if isinstance(user_resp, dict) else {}).get("id")
        )
        if not user_id:
            raise ValueError("No se pudo obtener el user_id")
    except Exception as e:
        raise HTTPException(status_code=401, detail=f"Token inválido: {e}")
    
    if not image.content_type or not image.content_type.startswith('image/'):
        raise HTTPException(status_code=400, detail="File must be an image file")

    try:
        content = await image.read()
        result = await analyze_image(content, image.content_type)
        recommendation = await get_recomendation(result, user_id)
        
        return JSONResponse(status_code=200, content={"analysis": result, "recommendation": recommendation})
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    
async def get_recomendation(analysis: dict, user_id: str) -> str:
    logging.info("get_recomendation() exec[][]")
    
    if analysis is None or "alimentos" not in analysis or not isinstance(analysis["alimentos"], list):
        raise ValueError("Análisis inválido o sin alimentos.")

    info_user = supabase_admin.table("users").select("*").eq("id", user_id).limit(1).execute()
    user_data = info_user.data
    
    prompt = f"""
    Eres un nutricionista experto en dar recomendaciones nutricionales. Un usuario con los siguientes datos:
    {json.dumps(user_data)}
    
    ha consumido los siguientes alimentos:
    {json.dumps(analysis)}
    
    Proporciónale una recomendación nutricional personalizada en base a su consumo reciente y sus datos personales, teniendo prioridad en sus objetivos nutricionales.
    Las recomendaciones deben ser centradas en la comida que esta consumiendo, por ejemplo se recomienda aumentar cierto alimento de los que esta comiendo o disminuirlo.
    Tambien se puede comentar la falta de algun alimento importante en la dieta.
    Tambien pueden haber mensajes tipo, estas consumiendo muy poco o mucho de cierto macronutriente y se recomienda ajustar.
    De ser posible indicar la cantidad en gramos a aumentar o disminuir y estas tienen que tener sentido y no ser exageradas.
    Ten en cuenta que esta es solo una de las comidas del dia, no la unica.
    
    Responde en un máximo de 300 caracteres, de forma clara y concisa.
    Responde solo con el texto de la recomendación, sin explicaciones adicionales.
    No incluyas comillas ni ningún otro carácter especial.
    No incluyas emojis.
    No incluyas saltos de línea.
    No uses markdown.
    """

    response = client.chat.completions.create(
        model="gpt-4o",
        messages=[
            {"role": "system", "content": prompt},
            {
                "role": "user",
                "content": prompt
            }
        ],
        max_tokens=300,
    )

    content = response.choices[0].message.content


    if content is None:
        raise ValueError("Model response content is None and cannot be parsed as JSON.")
    
    return content.strip()
    
    

async def analyze_image(image_bytes: bytes, content_type: str) -> dict:
    base64_image = base64.b64encode(image_bytes).decode('utf-8')
    
    prompt = """
**Eres un nutricionista experto con experiencia en análisis de alimentos a partir de imágenes. Tu objetivo es identificar los alimentos presentes en una imagen de un plato, estimar su peso y calcular su aporte nutricional.

**Formato de salida esperado (responde solo con este JSON, sin explicaciones adicionales):

{
  "alimentos": [
    {
      "nombre": "nombre del alimento en minúscula",
      "cantidad_estimada_gramos": número entero,   // por ejemplo: 150
      "calorias": número entero,
      "proteinas_g": número entero,
      "carbohidratos_g": número entero,
      "grasas_g": número entero
    },
    ...
  ]
}

**Restricciones:
- No hagas suposiciones de alimentos que no se vean claramente.
- No incluyas bebidas ni condimentos si no son claramente visibles.
- Usa nombres simples y en minúsculas para los alimentos (ej. "pollo a la plancha", "arroz blanco").
- Las cantidades deben estar en gramos estimados lo más realistas posible según la imagen.
- No incluyas ningún comentario, explicación o nota fuera del JSON.
    """


    response = client.chat.completions.create(
        model="gpt-4o",
        messages=[
            {"role": "system", "content": prompt},
            {
                "role": "user",
                "content": [
                    {
                        "type": "image_url",
                        "image_url": {
                            "url": f"data:{content_type};base64,{base64_image}"
                        }
                    }
                ]
            }
        ],
        max_tokens=2048,
    )

    content = response.choices[0].message.content
    
    if content is None:
        raise ValueError("Model response content is None and cannot be parsed as JSON.")
    try:
        cleaned_content = extract_json_block(content)
        return json.loads(cleaned_content)
    except Exception as e:
        raise ValueError(f"Failed to parse JSON from model response: {e}\nResponse content: {content}")
    
def extract_json_block(text: str) -> str:
    """
    Extrae el contenido JSON de un bloque Markdown como ```json ... ```
    """
    match = re.search(r"```(?:json)?\s*(.*?)```", text, re.DOTALL)
    if match:
        return match.group(1).strip()
    return text.strip()

@router.post("/save_analysis")
async def save_analysis(
    image: UploadFile = File(...),
    analysis: str = Form(...),
    recommendation: str = Form(""),
    authorization: str = Header(None),
) -> JSONResponse:
    logging.info("save_analysis() exec[][]")

    # --- Auth: validar el JWT del usuario (para autorizar el endpoint) ---
    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(status_code=401, detail="Falta token Bearer.")
    token = authorization.split(" ", 1)[1]

    try:
        user_resp = supabase_admin.auth.get_user(jwt=token)
        user_id = (
            getattr(getattr(user_resp, "user", None), "id", None)
            or (user_resp.get("user", {}) if isinstance(user_resp, dict) else {}).get("id")
        )
        if not user_id:
            raise ValueError("No se pudo obtener el user_id")
    except Exception as e:
        raise HTTPException(status_code=401, detail=f"Token inválido: {e}")
    
    try:
        payload = json.loads(analysis)
    except Exception:
        raise HTTPException(400, "El campo 'analysis' debe ser un JSON válido.")
    
    alimentos_raw = payload.get("alimentos") or []
    # filtra entradas mal formadas (a veces llega un objeto sin 'nombre')
    alimentos = [a for a in alimentos_raw if isinstance(a, dict) and a.get("nombre")]
    if not alimentos:
        raise HTTPException(400, "analysis.alimentos está vacío o mal formado.")
    
    recommendation = recommendation.strip()
    totals = _compute_totals(alimentos)

    # --- Ruta destino: meals/<uid>/YYYYMMDD/<uuid>.<ext> ---
    ext = (image.filename or "jpg").split(".")[-1].lower()
    now = datetime.now(timezone.utc)
    stored_name = f"{uuid.uuid4().hex}.{ext}"
    path = f"meals/{user_id}/{now.strftime('%Y%m%d')}/{stored_name}"
    logging.info(f"Storing image at path: {path}")

    # --- Subida a Storage con Service Role (RLS no aplica) ---
    try:
        content = await image.read()

        if not SUPABASE_BUCKET:
            raise HTTPException(status_code=500, detail="SUPABASE_BUCKET no está configurado.")

        storage = supabase_admin.storage.from_(SUPABASE_BUCKET)
        storage.upload(
            path=path,
            file=content,
            file_options={
                "content-type": image.content_type or "application/octet-stream",
                "upsert": "false",
                "cache-control": "3600",
            },
        )
    except Exception as e:
        logging.error(f"Upload failed: {e}")
        raise HTTPException(status_code=500, detail=f"No se pudo subir a Supabase Storage: {e}")

    # --- URL de retorno ---
    if not SUPABASE_URL:
        raise HTTPException(status_code=500, detail="SUPABASE_URL no está configurado.")
    
    public_url = f"{SUPABASE_URL.rstrip('/')}/storage/v1/object/public/{SUPABASE_BUCKET}/{path}"\
    
    meal_row = {
        "user_id": user_id,
        "img_url": public_url,            # guarda ruta; public_url solo si tu bucket es público
        "recommendation": recommendation,
        "total_calories": totals["calorias"],
        "total_protein_g": totals["proteinas_g"],
        "total_carbs_g": totals["carbohidratos_g"],
        "total_fat_g": totals["grasas_g"],
    }

    try:
        ins_meal = supabase_admin.table("meals").insert(meal_row).execute()
        row = ins_meal.data[0] if ins_meal.data and isinstance(ins_meal.data, list) else None
        meal_id = row.get("id") if row else None
    except Exception as e:
        logging.exception("Fallo insert meals")
        raise HTTPException(500, f"No se pudo guardar la comida: {e}")
    
    # --- 5) Insert en meal_items (bulk) ---
    items_rows = []
    for it in alimentos:
        items_rows.append({
            "meal_id": meal_id,
            "name": it["nombre"],
            "weight_grams": it.get("cantidad_estimada_gramos"),
            "calories_kcal": it.get("calorias"),
            "protein_g": it.get("proteinas_g"),
            "carbs_g": it.get("carbohidratos_g"),
            "fat_g": it.get("grasas_g"),
        })

    try:
        if items_rows:
            supabase_admin.table("meal_items").insert(items_rows).execute()
    except Exception as e:
        logging.exception("Fallo insert meal_items; limpiando meal")
        # rollback best-effort (PostgREST no hace transacciones multi tabla en una llamada)
        try:
            supabase.table("meals").delete().eq("id", meal_id).execute()
        finally:
            raise HTTPException(500, f"No se pudieron guardar los items: {e}")

    return JSONResponse(
        status_code=201,
        content={
            "meal_id": meal_id,
            "image_path": public_url,
            "public_url": public_url,  # si bucket público
            "totals": totals,
        }
    )

def _compute_totals(items):
    totals = {"calorias": 0.0, "proteinas_g": 0.0, "carbohidratos_g": 0.0, "grasas_g": 0.0}
    for a in items:
        totals["calorias"]        += float(a.get("calorias", 0) or 0)
        totals["proteinas_g"]     += float(a.get("proteinas_g", 0) or 0)
        totals["carbohidratos_g"] += float(a.get("carbohidratos_g", 0) or 0)
        totals["grasas_g"]        += float(a.get("grasas_g", 0) or 0)
    return totals