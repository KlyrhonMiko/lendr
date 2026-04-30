from pathlib import Path
from types import SimpleNamespace
from uuid import uuid4

import pytest
from sqlalchemy.pool import StaticPool
from sqlmodel import Session, SQLModel, create_engine, select

from systems.admin.models.backup import BackupArtifact, BackupRun
from systems.admin.models.user import User
from systems.admin.services.backup_service import BackupService


@pytest.fixture
def session() -> Session:
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    SQLModel.metadata.create_all(engine)
    with Session(engine) as db_session:
        yield db_session


@pytest.fixture
def backup_service(monkeypatch: pytest.MonkeyPatch, tmp_path: Path) -> BackupService:
    service = BackupService()

    monkeypatch.setattr(service, "_require_setting", lambda *args, **kwargs: None)
    monkeypatch.setattr(service, "_get_backup_dir", lambda: tmp_path)

    return service


def _create_user(session: Session) -> User:
    suffix = uuid4().hex[:8]
    user = User(
        last_name="Backup",
        first_name="Tester",
        email=f"backup-{suffix}@example.com",
        username=f"backup-{suffix}",
        hashed_password="not-used",
        role="admin",
    )
    session.add(user)
    session.commit()
    session.refresh(user)
    return user


def test_trigger_backup_records_local_artifact(
    session: Session,
    backup_service: BackupService,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    actor = _create_user(session)
    database_url = "postgresql+psycopg2://postgres:secret@powergold-db:5432/powergold"

    from systems.admin.services import backup_service as backup_module

    monkeypatch.setattr(backup_module.settings, "DATABASE_URL", database_url)

    def fake_run(cmd: list[str], env: dict[str, str], capture_output: bool, text: bool, timeout: int):
        output_path = Path(cmd[cmd.index("-f") + 1])
        output_path.write_text("-- backup --\n", encoding="utf-8")
        assert env["PGPASSWORD"] == "secret"
        return SimpleNamespace(returncode=0, stderr="")

    monkeypatch.setattr(backup_module.subprocess, "run", fake_run)

    backup_run = backup_service.trigger_backup(session, destination="local", actor_id=actor.id)

    assert backup_run.status == "completed"
    artifacts = session.exec(select(BackupArtifact)).all()
    assert len(artifacts) == 1
    assert Path(artifacts[0].file_path_or_key).exists()
    assert Path(artifacts[0].file_path_or_key).is_absolute()
    assert artifacts[0].size_bytes == len("-- backup --\n")


def test_trigger_backup_marks_run_failed_and_removes_empty_file(
    session: Session,
    backup_service: BackupService,
    monkeypatch: pytest.MonkeyPatch,
    tmp_path: Path,
) -> None:
    actor = _create_user(session)

    from systems.admin.services import backup_service as backup_module

    monkeypatch.setattr(
        backup_module.settings,
        "DATABASE_URL",
        "postgresql+psycopg2://postgres:secret@powergold-db:5432/powergold",
    )

    def fake_run(cmd: list[str], env: dict[str, str], capture_output: bool, text: bool, timeout: int):
        output_path = Path(cmd[cmd.index("-f") + 1])
        output_path.touch()
        return SimpleNamespace(returncode=1, stderr="pg_dump failed")

    monkeypatch.setattr(backup_module.subprocess, "run", fake_run)

    with pytest.raises(RuntimeError, match="failed"):
        backup_service.trigger_backup(session, destination="local", actor_id=actor.id)

    runs = session.exec(select(BackupRun)).all()
    assert len(runs) == 1
    assert runs[0].status == "failed"
    assert list(tmp_path.iterdir()) == []
