import importlib

import pytest

import agro_v2


def test_export_optional_ignores_missing_bead_module(monkeypatch):
    real_import_module = importlib.import_module
    monkeypatch.delitem(agro_v2.__dict__, "AdvisoryRetrievalContract", raising=False)

    def fake_import_module(name: str):
        if name == "agro_v2.advisory_retrieval":
            raise ModuleNotFoundError("missing optional bead module", name=name)
        return real_import_module(name)

    monkeypatch.setattr(agro_v2, "import_module", fake_import_module)

    agro_v2._export_optional("advisory_retrieval", ("AdvisoryRetrievalContract",))

    assert "AdvisoryRetrievalContract" not in agro_v2.__dict__


def test_export_optional_re_raises_nested_dependency_errors(monkeypatch):
    real_import_module = importlib.import_module

    def fake_import_module(name: str):
        if name == "agro_v2.advisory_retrieval":
            raise ModuleNotFoundError("missing nested dependency", name="pydantic")
        return real_import_module(name)

    monkeypatch.setattr(agro_v2, "import_module", fake_import_module)

    with pytest.raises(ModuleNotFoundError) as excinfo:
        agro_v2._export_optional("advisory_retrieval", ("AdvisoryRetrievalContract",))

    assert excinfo.value.name == "pydantic"
