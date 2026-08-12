from fastapi import APIRouter, Depends, HTTPException

from memorymap.api.schemas import SpaceResponse, SpaceCreate, SpaceUpdate
from memorymap.core.database import Space, Entry, EntryLink, Document, Category
from memorymap.core.deps import get_session
from sqlalchemy.orm import Session

router = APIRouter(tags=["Spaces"])

@router.get("/spaces", response_model=list[SpaceResponse])
def get_spaces(session: Session = Depends(get_session)):
    return session.query(Space).all()

@router.post("/spaces", response_model=SpaceResponse)
def create_space(space_in: SpaceCreate, session: Session = Depends(get_session)):
    existing = session.query(Space).filter_by(id=space_in.id).first()
    if existing:
        raise HTTPException(400, "Space with this ID already exists")
    space = Space(id=space_in.id, name=space_in.name, icon=space_in.icon)
    session.add(space)
    session.commit()
    session.refresh(space)
    return space

@router.put("/spaces/{space_id}", response_model=SpaceResponse)
def update_space(space_id: str, space_in: SpaceUpdate, session: Session = Depends(get_session)):
    space = session.query(Space).filter_by(id=space_id).first()
    if not space:
        raise HTTPException(404, "Space not found")
    space.name = space_in.name
    space.icon = space_in.icon
    session.commit()
    session.refresh(space)
    return space

@router.delete("/spaces/{space_id}", response_model=SpaceResponse)
def delete_space(space_id: str, session: Session = Depends(get_session)):
    if space_id == "all" or space_id == "default":
        raise HTTPException(400, "Cannot delete default spaces")
    space = session.query(Space).filter_by(id=space_id).first()
    if not space:
        raise HTTPException(404, "Space not found")
        
    # Reassign notes/documents to default
    session.query(Entry).filter_by(workspace_id=space_id).update({"workspace_id": "default"})
    session.query(Document).filter_by(workspace_id=space_id).update({"workspace_id": "default"})
    session.query(Category).filter_by(workspace_id=space_id).update({"workspace_id": "default"})
    session.query(EntryLink).filter_by(workspace_id=space_id).update({"workspace_id": "default"})
    
    session.delete(space)
    session.commit()
    return space
