import importlib
import json
from pathlib import Path

import pytest
from sqlalchemy.engine import make_url

pytestmark = [pytest.mark.smoke]


CONFIG_ENV_VARS = (
    "DATABASE_ENGINE",
    "DATABASE_USERNAME",
    "DATABASE_PASSWORD",
    "DATABASE_HOST",
    "DATABASE_PORT",
    "DATABASE_NAME",
)


def _reload_config_module():
    config_module = importlib.import_module("config")
    return importlib.reload(config_module)


def test_development_config_encodes_database_password_special_characters():
    with pytest.MonkeyPatch.context() as monkeypatch:
        for key in CONFIG_ENV_VARS:
            monkeypatch.delenv(key, raising=False)

        monkeypatch.setenv("DATABASE_ENGINE", "postgres")
        monkeypatch.setenv("DATABASE_USERNAME", "queue_user")
        monkeypatch.setenv("DATABASE_PASSWORD", "abc@123")
        monkeypatch.setenv("DATABASE_HOST", "db.internal")
        monkeypatch.setenv("DATABASE_PORT", "5432")
        monkeypatch.setenv("DATABASE_NAME", "queue_db")

        config_module = _reload_config_module()
        uri = config_module.DevelopmentConfig.SQLALCHEMY_DATABASE_URI
        parsed = make_url(uri)

        assert "%40" in uri
        assert parsed.password == "abc@123"
        assert parsed.host == "db.internal"
        assert parsed.drivername == "postgresql+psycopg2"

    _reload_config_module()


def test_local_react_frontend_origin_is_allowed_for_cors_and_keycloak():
    config_module = _reload_config_module()

    assert "http://localhost:8000" in config_module.LocalConfig.CORS_ALLOWED_ORIGINS

    realm_path = Path(__file__).parents[3] / "keycloak-local" / "servicebc-local-realm.json"
    realm = json.loads(realm_path.read_text())
    frontend_client = next(
        client
        for client in realm["clients"]
        if client["clientId"] == "theq-frontend"
    )

    assert "http://localhost:8080/*" in frontend_client["redirectUris"]
    assert "http://localhost:8000/*" in frontend_client["redirectUris"]
    assert "http://localhost:8080" in frontend_client["webOrigins"]
    assert "http://localhost:8000" in frontend_client["webOrigins"]
    assert frontend_client["attributes"]["post.logout.redirect.uris"] == "+"
