from uuid import uuid7

from core.base_model import BaseModel


def test_uuid7_returns_version_7():
    assert uuid7().version == 7


def test_base_model_id_default_factory_uses_uuid7():
    default_factory = BaseModel.model_fields["id"].default_factory

    assert default_factory is not None
    assert default_factory().version == 7
