"""Cross-database column types: JSONB on Postgres, JSON on SQLite; UUID native on PG."""
from sqlalchemy import JSON
from sqlalchemy.dialects.postgresql import JSONB, UUID as PG_UUID
from sqlalchemy.types import CHAR, TypeDecorator
import uuid


JSONType = JSON().with_variant(JSONB(), "postgresql")


class GUID(TypeDecorator):
    """Platform-independent GUID. Uses Postgres UUID, otherwise CHAR(36)."""

    impl = CHAR
    cache_ok = True

    def load_dialect_impl(self, dialect):
        if dialect.name == "postgresql":
            return dialect.type_descriptor(PG_UUID(as_uuid=True))
        return dialect.type_descriptor(CHAR(36))

    def process_bind_param(self, value, dialect):
        if value is None:
            return value
        if dialect.name == "postgresql":
            return value
        if isinstance(value, uuid.UUID):
            return str(value)
        return str(uuid.UUID(value))

    def process_result_value(self, value, dialect):
        if value is None:
            return value
        if isinstance(value, uuid.UUID):
            return value
        return uuid.UUID(value)
