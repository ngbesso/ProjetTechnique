# Importer Base + tous les modèles ici pour qu'Alembic les détecte
from app.models.base import Base  # noqa: F401
from app.models.user import User  # noqa: F401
from app.models.eglise import Eglise  # noqa: F401
from app.models.membre import Membre  # noqa: F401
from app.models.sermon import Sermon  # noqa: F401
