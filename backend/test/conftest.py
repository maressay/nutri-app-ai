import os
import pytest
from fastapi.testclient import TestClient

from app.main import app

test_client = TestClient(app)

@pytest.fixture()
def client():
    return test_client