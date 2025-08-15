from fastapi import APIRouter, UploadFile, File, HTTPException
from fastapi.responses import JSONResponse
from openai import OpenAI
from dotenv import load_dotenv
import os
import base64
import json
import re

load_dotenv()

OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
client = OpenAI(api_key=OPENAI_API_KEY)

router = APIRouter()

@router.post("/analyse_meal")
async def analyse_meal(image: UploadFile = File(...)) -> JSONResponse:
    print(f"Received file: {image.filename}, Content-Type: {image.content_type}")
    
    if not image.content_type or not image.content_type.startswith('image/'):
        raise HTTPException(status_code=400, detail="File must be an image file")

    try:
        content = await image.read()
        result = await analyze_image(content, image.content_type)
        
        return JSONResponse(status_code=200, content={"analysis": result})
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    

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
        max_tokens=800,
    )

    content = response.choices[0].message.content
    
    print(content)
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