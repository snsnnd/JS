from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from pydantic import BaseModel # 用于接收建档和预约的传参


from sqlalchemy import event
from db.database import get_db
from db import models
from schemas import pydantic_schemas
from core.security import get_current_patient

router = APIRouter(
    prefix="/api/patient",
    tags=["孕妇业务端 (Patient Operations)"]
)

# --- 定义接收数据的模型 ---
class OnboardProfile(BaseModel):
    height: float
    weight: float
    bmi: float
    lmp: str
    weeks: float

class AppointmentCreate(BaseModel):
    appointment_time: str
    type: str = "NIPT复查"

# ==========================================
# 1. 查看我的 AI 诊断报告 (原有功能)
# ==========================================
@router.get("/my-reports", response_model=List[pydantic_schemas.NIPTRecordResponse], summary="查看我的 AI 诊断报告")
def get_my_reports(
    db: Session = Depends(get_db),
    current_patient: models.User = Depends(get_current_patient)
):
    records = db.query(models.NIPTRecord).filter(
        models.NIPTRecord.user_id == current_patient.id
    ).order_by(models.NIPTRecord.id.desc()).all()
    
    if not records:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, 
            detail="您目前还没有任何检测报告。"
        )
    return records

# ==========================================
# 2. 核心新增：沉浸式建档数据持久化
# ==========================================
@router.post("/onboard", summary="保存孕妇首次建档生理信息")
def save_onboard_profile(
    profile: OnboardProfile,
    db: Session = Depends(get_db),
    current_patient: models.User = Depends(get_current_patient)
):
    """
    将前端“沉浸式向导”算出的 BMI、孕周等存入数据库。
    这些数据将直接作为第一问“混合效应模型”的输入参数。
    """
    try:
        # 更新当前用户模型中的字段
        current_patient.height = profile.height
        current_patient.weight = profile.weight
        current_patient.bmi = profile.bmi
        current_patient.lmp = profile.lmp
        current_patient.weeks = profile.weeks
        
        db.commit()
        return {"status": "success", "message": "专属健康档案已同步至云端"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"数据库写入失败: {str(e)}")

# ==========================================
# 3. 核心新增：一键预约复查功能
# ==========================================
@router.post("/book-appointment", summary="发起一键预约")
def book_appointment(
    apt: AppointmentCreate,
    db: Session = Depends(get_db),
    current_patient: models.User = Depends(get_current_patient)
):
    """
    在数据库中创建一条预约记录。
    医生端会在“预约排班”中即时看到该患者。
    """
    # 默认分配给系统管理员(医生账号)
    doctor = db.query(models.User).filter(models.User.role == "doctor").first()
    
    new_apt = models.Appointment(
        patient_id=current_patient.id,
        doctor_id=doctor.id if doctor else None,
        appointment_time=apt.appointment_time,
        type=apt.type,
        status="已预约"
    )
    
    try:
        db.add(new_apt)
        db.commit()
        return {"status": "success", "message": f"预约成功，请于 {apt.appointment_time} 到院"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail="预约保存失败")


# 🚀 自动计算 BMI 的监听器
@event.listens_for(User, 'before_insert')
@event.listens_for(User, 'before_update')
def receive_before_insert_update(mapper, connection, target):
    if target.weight and target.height and target.height > 0:
        # 自动换算：体重(kg) / (身高(m)^2)
        h_m = target.height / 100
        target.bmi = round(target.weight / (h_m * h_m), 2)
