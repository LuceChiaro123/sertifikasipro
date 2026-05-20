"""Custom Pydantic types untuk handling datetime dengan timezone yang konsisten."""
from datetime import datetime, timezone
from typing import Annotated, Optional

from pydantic import PlainSerializer


def to_iso_utc(dt: Optional[datetime]) -> Optional[str]:
    """Serialize datetime ke ISO format dengan timezone UTC.

    SQLite menyimpan datetime sebagai string naive (tanpa tz info),
    meskipun di Python kita pakai datetime.now(timezone.utc).
    Saat dibaca kembali oleh SQLAlchemy, datetime jadi naive.

    Frontend JavaScript akan menafsirkan ISO string tanpa tz sebagai LOKAL,
    bukan UTC — menyebabkan selisih waktu (mis. 7 jam untuk WIB).

    Fungsi ini memastikan setiap datetime yang dikirim ke client:
    - Memiliki suffix `+00:00` (atau setara) yang valid
    - Diinterpretasi sebagai UTC oleh client
    - Otomatis dikonversi ke timezone lokal client oleh `new Date()`
    """
    if dt is None:
        return None
    if dt.tzinfo is None:
        # Asumsi: datetime naive dari DB = UTC
        dt = dt.replace(tzinfo=timezone.utc)
    return dt.isoformat()


# Annotated type untuk datetime field di Pydantic schemas.
# Penggunaan: `created_at: UTCDateTime`
UTCDateTime = Annotated[
    datetime,
    PlainSerializer(to_iso_utc, return_type=str, when_used="json"),
]
