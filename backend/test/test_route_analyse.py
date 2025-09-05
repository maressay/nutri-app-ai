import io
from app.routes import analyse as analyse_mod

def test_analyse_meal_rejects_non_image(client):
    f = io.BytesIO(b"not an image")
    files = {"image": ("test.txt", f, "text/plain")}
    r = client.post("/api/analyse_meal", files=files)
    
    assert r.status_code == 400
    assert r.json() == {"detail": "File must be an image file"}