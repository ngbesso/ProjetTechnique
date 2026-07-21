from datetime import datetime

from pydantic import BaseModel, ConfigDict, EmailStr, Field


class CommentCreate(BaseModel):
    content: str = Field(min_length=1, max_length=2000)
    author_name: str | None = Field(default=None, max_length=150)
    author_email: EmailStr | None = None


class CommentRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    post_id: int
    member_id: int | None
    author_name: str
    content: str
    created_at: datetime
