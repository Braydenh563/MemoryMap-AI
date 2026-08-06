"""Whiteboard API endpoints."""

from __future__ import annotations

from typing import List

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, ConfigDict
from sqlalchemy import select
from sqlalchemy.orm import Session

from memorymap.core.database import WhiteboardNode, WhiteboardSketch
from memorymap.core.deps import get_session

router = APIRouter(prefix="/whiteboard", tags=["whiteboard"])

class WhiteboardNodeBase(BaseModel):
    entry_id: int
    x: float
    y: float
    z: int = 0

class WhiteboardNodeOut(WhiteboardNodeBase):
    id: int
    
    model_config = ConfigDict(from_attributes=True)

class WhiteboardSketchBase(BaseModel):
    data: str
    x: float
    y: float
    z: int = 0

class WhiteboardSketchOut(WhiteboardSketchBase):
    id: int
    
    model_config = ConfigDict(from_attributes=True)

class WhiteboardStateOut(BaseModel):
    nodes: List[WhiteboardNodeOut]
    sketches: List[WhiteboardSketchOut]

@router.get("/", response_model=WhiteboardStateOut)
def get_whiteboard_state(db: Session = Depends(get_session)):
    nodes = db.scalars(select(WhiteboardNode)).all()
    sketches = db.scalars(select(WhiteboardSketch)).all()
    return WhiteboardStateOut(
        nodes=list(nodes),
        sketches=list(sketches)
    )

@router.post("/nodes", response_model=WhiteboardNodeOut)
def create_node(node_in: WhiteboardNodeBase, db: Session = Depends(get_session)):
    # Check if a node for this entry already exists
    existing = db.scalar(select(WhiteboardNode).where(WhiteboardNode.entry_id == node_in.entry_id))
    if existing:
        # Just update it instead of crashing
        existing.x = node_in.x
        existing.y = node_in.y
        existing.z = node_in.z
        db.commit()
        db.refresh(existing)
        return existing
        
    node = WhiteboardNode(**node_in.model_dump())
    db.add(node)
    db.commit()
    db.refresh(node)
    return node

@router.put("/nodes/{node_id}", response_model=WhiteboardNodeOut)
def update_node(node_id: int, node_in: WhiteboardNodeBase, db: Session = Depends(get_session)):
    node = db.get(WhiteboardNode, node_id)
    if not node:
        raise HTTPException(status_code=404, detail="Node not found")
    node.x = node_in.x
    node.y = node_in.y
    node.z = node_in.z
    db.commit()
    db.refresh(node)
    return node

@router.delete("/nodes/{node_id}")
def delete_node(node_id: int, db: Session = Depends(get_session)):
    node = db.get(WhiteboardNode, node_id)
    if node:
        db.delete(node)
        db.commit()
    return {"status": "ok"}

@router.post("/sketches", response_model=WhiteboardSketchOut)
def create_sketch(sketch_in: WhiteboardSketchBase, db: Session = Depends(get_session)):
    sketch = WhiteboardSketch(**sketch_in.model_dump())
    db.add(sketch)
    db.commit()
    db.refresh(sketch)
    return sketch

@router.put("/sketches/{sketch_id}", response_model=WhiteboardSketchOut)
def update_sketch(sketch_id: int, sketch_in: WhiteboardSketchBase, db: Session = Depends(get_session)):
    sketch = db.get(WhiteboardSketch, sketch_id)
    if not sketch:
        raise HTTPException(status_code=404, detail="Sketch not found")
    sketch.data = sketch_in.data
    sketch.x = sketch_in.x
    sketch.y = sketch_in.y
    sketch.z = sketch_in.z
    db.commit()
    db.refresh(sketch)
    return sketch

@router.delete("/sketches/{sketch_id}")
def delete_sketch(sketch_id: int, db: Session = Depends(get_session)):
    sketch = db.get(WhiteboardSketch, sketch_id)
    if sketch:
        db.delete(sketch)
        db.commit()
    return {"status": "ok"}
