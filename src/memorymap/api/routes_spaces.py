import re

from fastapi import APIRouter, Depends, HTTPException

from memorymap.api.schemas import SpaceResponse, SpaceCreate, SpaceUpdate
from memorymap.core import deps
from memorymap.core.database import Space, workspace_scoped_models
from memorymap.core.deps import get_session, impersonate_workspace
from sqlalchemy.orm import Session

router = APIRouter(tags=["Spaces"])

# "all" is the frontend's "show every space" sentinel and "default" is the
# fallback delete_space reassigns orphaned rows to — a user-created space
# with either id would break both, so neither can ever be created or deleted.
RESERVED_SPACE_IDS = {"all", "default"}

# Phosphor icon names only. The frontend does `class="ph " + icon` with no
# escaping, so an unvalidated icon is a CSS class injection into the page.
_ICON_RE = re.compile(r"^ph-[a-z0-9-]{1,40}$")

_MAX_NAME_LEN = 60


def _slugify(name: str) -> str:
    slug = re.sub(r"[^a-z0-9]+", "-", name.strip().lower()).strip("-")
    return slug[:49] or "space"


def _generate_space_id(name: str, session: Session) -> str:
    """Server-generated id: slugify(name), de-duplicated with a numeric
    suffix. Chosen over validating a client-supplied id because the
    reserved-sentinel and charset rules a client id would need are exactly
    the rules a generated-and-deduped slug satisfies for free."""
    base = _slugify(name)
    existing = {row[0] for row in session.query(Space.id).all()}
    candidate = base
    n = 2
    while candidate in RESERVED_SPACE_IDS or candidate in existing:
        suffix = f"-{n}"
        candidate = f"{base[: 49 - len(suffix)]}{suffix}"
        n += 1
    return candidate


def _validate_icon(icon: str) -> str:
    if not _ICON_RE.match(icon):
        raise HTTPException(400, "icon must match ^ph-[a-z0-9-]{1,40}$")
    return icon


def _validate_name(name: str) -> str:
    name = name.strip()
    if not name:
        raise HTTPException(400, "name must not be empty")
    if len(name) > _MAX_NAME_LEN:
        raise HTTPException(400, f"name must be at most {_MAX_NAME_LEN} characters")
    return name


@router.get("/spaces", response_model=list[SpaceResponse])
def get_spaces(session: Session = Depends(get_session)):
    return session.query(Space).all()


@router.post("/spaces", response_model=SpaceResponse)
def create_space(space_in: SpaceCreate, session: Session = Depends(get_session)):
    # space_in.id is intentionally never read — see SpaceCreate.id's docstring.
    name = _validate_name(space_in.name)
    icon = _validate_icon(space_in.icon)
    space_id = _generate_space_id(name, session)
    space = Space(id=space_id, name=name, icon=icon)
    session.add(space)
    session.commit()
    session.refresh(space)
    return space


@router.put("/spaces/{space_id}", response_model=SpaceResponse)
def update_space(space_id: str, space_in: SpaceUpdate, session: Session = Depends(get_session)):
    space = deps.get_or_404(session, Space, space_id, "Space not found")
    # Only fields the caller actually sent are applied, so an omitted field
    # doesn't get overwritten with None (SpaceUpdate's fields are optional).
    provided = space_in.model_dump(exclude_unset=True)
    if "name" in provided:
        space.name = _validate_name(provided["name"])
    if "icon" in provided:
        space.icon = _validate_icon(provided["icon"])
    if "hidden_from_all" in provided:
        # "default" is where a deleted space's notes land, so hiding it would
        # quietly empty the everything-view of anything that ever fell back
        # to it — refused for the same reason it cannot be deleted.
        if space.id == "default" and provided["hidden_from_all"]:
            raise HTTPException(
                status_code=400,
                detail="The default space cannot be hidden from All spaces.",
            )
        space.hidden_from_all = bool(provided["hidden_from_all"])
    session.commit()
    session.refresh(space)
    return space


@router.delete("/spaces/{space_id}", response_model=SpaceResponse)
def delete_space(space_id: str, session: Session = Depends(get_session)):
    if space_id in RESERVED_SPACE_IDS:
        raise HTTPException(400, "Cannot delete default spaces")
    space = deps.get_or_404(session, Space, space_id, "Space not found")

    # Capture the response body before deleting: reading attributes off an
    # instance after session.delete()+commit() raises ObjectDeletedError,
    # since SQLAlchemy expires it and then finds no row to refresh from.
    response = SpaceResponse.model_validate(space)

    # Reassign every workspace-scoped model, not a hardcoded subset — a
    # model left out here keeps rows pointing at a space id that no longer
    # exists, i.e. data that silently stops showing up anywhere.
    #
    # impersonate_workspace(..., "all") disables the session's ambient
    # workspace filter (database._add_workspace_filter) for this block. A
    # request carrying X-Workspace-ID for some *other* space would
    # otherwise AND that space's id into every UPDATE below, so deleting
    # "personal" while browsing "work" would silently reassign zero rows.
    with impersonate_workspace(session, "all"):
        for model in workspace_scoped_models():
            session.query(model).filter_by(workspace_id=space_id).update(
                {"workspace_id": "default"}
            )

    session.delete(space)
    session.commit()
    return response
