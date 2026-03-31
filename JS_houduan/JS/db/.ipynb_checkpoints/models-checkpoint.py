from sqlalchemy import Column, Integer, String, Float, Numeric, ForeignKey, DateTime, Enum, Text
from sqlalchemy.orm import relationship
import datetime

# 这里的 Base 将在 db/database.py 中定义并引入
from .database import Base 

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(50), unique=True, index=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    role = Column(Enum('doctor', 'patient'), nullable=False) # 区分权限
    real_name = Column(String(50))
    contact_info = Column(String(100))
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    # 关联属性
    profile = relationship("PatientProfile", back_populates="owner", uselist=False, cascade="all, delete-orphan")
    records = relationship("NIPTRecord", foreign_keys="[NIPTRecord.user_id]", back_populates="patient", cascade="all, delete-orphan")


class PatientProfile(Base):
    __tablename__ = "patient_profiles"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"))
    
    # 按照数据库设计，对应 decimal 类型
    height = Column(Numeric(10, 2))
    weight = Column(Numeric(10, 2))
    bmi = Column(Numeric(10, 2))
    
    age = Column(Integer)
    # 【修复】确认为 Integer
    current_weeks_pregnant = Column(Integer) 
    
    # 枚举保持一致
    bmi_group = Column(Enum('偏瘦', '正常', '偏胖', '肥胖', name='bmi_group_enum')) 

    owner = relationship("User", back_populates="profile")


class NIPTRecord(Base):
    __tablename__ = "nipt_records"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE")) 
    
    # 核心特征指标 
    alignment_ratio = Column(Numeric(10, 4))
    filtered_ratio = Column(Numeric(10, 4))
    z_value_chr13 = Column(Numeric(10, 4))
    z_value_chr18 = Column(Numeric(10, 4))
    z_value_chr21 = Column(Numeric(10, 4))
    z_value_chrX = Column(Numeric(10, 4))
    gc_content_chr13 = Column(Numeric(10, 4))
    gc_content_chr18 = Column(Numeric(10, 4))
    gc_content_chr21 = Column(Numeric(10, 4))
    
    # 【修复】严格限制 Enum 为 '待分析', '分析中', '已完成'
    sample_status = Column(Enum('待分析', '分析中', '已完成', name='sample_status_enum'), default="待分析")

    patient = relationship("User", foreign_keys=[user_id], back_populates="records")
    analysis_result = relationship("AIAnalysisResult", back_populates="parent_record", uselist=False, cascade="all, delete-orphan")


class AIAnalysisResult(Base):
    __tablename__ = "ai_analysis_results"
    id = Column(Integer, primary_key=True, index=True)
    nipt_record_id = Column(Integer, ForeignKey("nipt_records.id", ondelete="CASCADE"))
    
    anomaly_score = Column(Numeric(10, 4)) 
    
    # 【修复】严格限制 Enum 为 '低风险', '临界风险', '高风险'
    risk_level = Column(Enum('低风险', '临界风险', '高风险', name='risk_level_enum')) 
    
    # 【修复】确认为 Integer
    recommended_weeks = Column(Integer) 
    expected_success_rate = Column(Numeric(10, 4)) 
    doctor_notes = Column(Text, nullable=True)

    parent_record = relationship("NIPTRecord", back_populates="analysis_result")


# models.py 末尾新增
class ChatMessage(Base):
    __tablename__ = "chat_messages"
    id = Column(Integer, primary_key=True, index=True)
    sender_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    receiver_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    content = Column(Text, nullable=False)
    is_read = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    # 关联对象
    sender = relationship("User", foreign_keys=[sender_id])
    receiver = relationship("User", foreign_keys=[receiver_id])