from pydantic import BaseModel, Field, EmailStr

class UserCreate(BaseModel):
    username: EmailStr
    password: str = Field(..., min_length=6, max_length=100)
    
class UserOut(BaseModel):
    id: int
    username: EmailStr
    is_active: bool

    class Config:
        from_attributes = True