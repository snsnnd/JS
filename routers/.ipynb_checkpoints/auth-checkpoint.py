from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from datetime import timedelta

from db.database import get_db
from db.models import User
from core import security
from schemas import pydantic_schemas

# 创建路由器，统一前缀为 /api/auth，在 API 文档中分到 "认证授权" 标签下
router = APIRouter(
    prefix="/api/auth",
    tags=["认证授权 (Authentication)"]
)

@router.post("/login", response_model=pydantic_schemas.Token)
async def login_for_access_token(
    form_data: OAuth2PasswordRequestForm = Depends(), 
    db: Session = Depends(get_db)
):
    """
    用户登录接口 (医生与孕妇通用)
    - 接收前端传来的 username 和 password
    - 验证成功后返回携带权限身份的 JWT Token
    """
    # 1. 去数据库里找这个账号
    user = db.query(User).filter(User.username == form_data.username).first()
    
    # 2. 如果账号不存在，或者密码核对失败
    if not user or not security.verify_password(form_data.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="用户名或密码错误",
            headers={"WWW-Authenticate": "Bearer"},
        )
        
    # 3. 登录成功，准备签发 Token
    # 我们把 username 和 role 塞进 Token 的载荷(Payload)里
    access_token_expires = timedelta(minutes=security.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = security.create_access_token(
        data={"sub": user.username, "role": user.role},
        expires_delta=access_token_expires
    )
    
    # 4. 返回标准格式给前端
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "role": user.role # 附带返回 role，方便前端根据角色跳转到不同的页面(医生大屏 or 孕妇报告)
    }

# 🚀 核心新增：获取当前登录用户的完整个人档案
@router.get("/me", response_model=pydantic_schemas.UserResponse, summary="获取当前用户完整信息")
async def get_current_user_info(
    current_user: User = Depends(security.get_current_user)
):
    """
    前端登录拿到 Token 后，会调用这个接口获取用户的身高、体重、末次月经和心理状态。
    有了这些数据，前端才能判断是否是“老用户”，从而允许直接点击“下一步”。
    """
    return current_user