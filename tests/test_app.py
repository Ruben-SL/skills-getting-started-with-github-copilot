import pytest
from fastapi.testclient import TestClient
from src.app import app

client = TestClient(app)

def test_get_activities():
    response = client.get("/activities")
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, dict)
    assert "Soccer Team" in data
    assert "participants" in data["Soccer Team"]

def test_signup_and_unregister():
    # Use a unique email for testing
    test_email = "pytestuser@mergington.edu"
    activity = "Soccer Team"

    # Ensure not already signed up
    client.delete(f"/activities/{activity}/unregister?email={test_email}")

    # Sign up
    response = client.post(f"/activities/{activity}/signup?email={test_email}")
    assert response.status_code == 200
    assert f"Signed up {test_email}" in response.json()["message"]

    # Duplicate signup should fail
    response = client.post(f"/activities/{activity}/signup?email={test_email}")
    assert response.status_code == 400

    # Unregister
    response = client.delete(f"/activities/{activity}/unregister?email={test_email}")
    assert response.status_code == 200
    assert test_email not in client.get("/activities").json()[activity]["participants"]

    # Unregister again should fail
    response = client.delete(f"/activities/{activity}/unregister?email={test_email}")
    assert response.status_code == 404

@pytest.mark.parametrize("activity", ["Soccer Team", "Basketball Team", "Art Club"])
def test_activity_exists(activity):
    response = client.get("/activities")
    assert response.status_code == 200
    data = response.json()
    assert activity in data
