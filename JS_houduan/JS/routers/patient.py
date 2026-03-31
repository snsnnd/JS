from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from db.database import get_db
from db import models
from schemas import pydantic_schemas
from core.security import get_current_patient

# 创建路由器，限定前缀为 /api/patient
router = APIRouter(
    prefix="/api/patient",
    tags=["孕妇业务端 (Patient Operations)"]
)

@router.get("/my-reports", response_model=List[pydantic_schemas.NIPTRecordResponse], summary="查看我的 AI 诊断报告")
def get_my_reports(
    db: Session = Depends(get_db),
    current_patient: models.User = Depends(get_current_patient) # 核心拦截：必须是孕妇角色！
):
    """
    孕妇端专属接口：查询属于自己的所有 NIPT 检测记录及对应的 AI 分析结论。
    利用 JWT Token 中的身份信息，实现严格的数据隔离。
    """
    # ==========================================
    # 核心逻辑：只查自己！
    # ==========================================
    records = db.query(models.NIPTRecord).filter(
        models.NIPTRecord.user_id == current_patient.id
    ).order_by(models.NIPTRecord.id.desc()).all() # 按时间倒序，最新的报告在最前面
    
    if not records:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, 
            detail="您目前还没有任何检测报告，请等待医生上传数据并进行 AI 分析。"
        )
        
    # Pydantic (NIPTRecordResponse) 会自动把 records 以及关联的 analysis_result 转化成 JSON 返回给前端
    return records