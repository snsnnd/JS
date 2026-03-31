from pydantic import BaseModel, ConfigDict, Field
from typing import Optional
from datetime import datetime

# ==========================
# 1. 登录与令牌 (Token) 校验
# ==========================
class Token(BaseModel):
    access_token: str
    token_type: str
    role: str

class TokenData(BaseModel):
    username: Optional[str] = None
    role: Optional[str] = None

# ==========================
# 2. 用户相关结构
# ==========================
class UserCreate(BaseModel):
    username: str
    password: str
    role: str = Field(..., description="必须是 doctor 或 patient")
    real_name: str
    contact_info: Optional[str] = None

class UserResponse(BaseModel):
    id: int
    username: str
    role: str
    real_name: Optional[str] = None # 建议给个默认值，防止数据库为 null 时报错
    
    # 🚀 核心新增：同步数据库中的生理档案字段
    name: Optional[str] = None      # 真实姓名
    age: Optional[int] = None       # 年龄
    height: Optional[float] = None  # 身高
    weight: Optional[float] = None  # 体重
    bmi: Optional[float] = None     # BMI
    lmp: Optional[str] = None       # 末次月经
    weeks: Optional[float] = None   # 建档孕周

    model_config = ConfigDict(from_attributes=True)

# ==========================
# 3. 孕妇档案录入结构
# ==========================
class ProfileCreate(BaseModel):
    height: float
    weight: float
    age: int
    current_weeks_pregnant: float

# ==========================
# 4. NIPT 检测数据接收结构 (医生端调用)
# ==========================
class NIPTRecordCreate(BaseModel):
    patient_username: str  # 医生通过孕妇账号绑定数据
    alignment_ratio: float
    filtered_ratio: float
    z_value_chr13: float
    z_value_chr18: float
    z_value_chr21: float
    z_value_chrX: float
    gc_content_chr13: float
    gc_content_chr18: float
    gc_content_chr21: float

# ==========================
# 5. [AI 亮点：添加 XAI 结果结构]
# ==========================
class ShapAnalysisResponse(BaseModel):
    # 如果出错，会有 error 字段，其他为空
    error: Optional[str] = Field(None, description="SHAP 计算错误信息 (如果有)")
    base_expected_value: Optional[float] = Field(None, description="模型决策的基准得分線")
    # key 为特征名，value 为贡献度 (正数为增加异常风险，负数为降低)
    feature_contributions: Optional[dict[str, float]] = Field(None, description="各核心特征对最终得分的贡献度")

class DualEngineDetails(BaseModel):
    iforest_score: float = Field(..., description="无监督隔离森林得分 (侧重发现未知突变)")
    xgboost_score: float = Field(..., description="有监督 XGBoost 得分 (侧重已知三体综合征精准识别)")
    fusion_formula: str = Field(..., description="加权融合公式")
    
# ==========================
# 6. AI 结果返回结构 (孕妇端/医生端查看)
# ==========================
class AIAnalysisResultResponse(BaseModel):
    anomaly_score: float
    risk_level: str
    recommended_weeks: float
    expected_success_rate: float
    doctor_notes: Optional[str] = None

    # 新增：双引擎明细
    engine_details: Optional[DualEngineDetails] = Field(None, description="双引擎交叉验证详细得分")
    # --- [添加 XAI 数据] ---
    # 我们不把 SHAP 结果存入数据库，它太大了。只在返回 JSON 时包含它。
    # 医生下次查看报告时，系统会从 MySQL 读取原始 NIPT 指标，再现场算一次 SHAP 返回。
    shap_analysis: Optional[ShapAnalysisResponse] = Field(None, description="AI 决策可解释性分析 (SHAP)")
    
    model_config = ConfigDict(from_attributes=True)

class NIPTRecordResponse(BaseModel):
    id: int
    sample_status: str
    # 嵌套返回带 SHAP 数据的结果
    analysis_result: Optional[AIAnalysisResultResponse] = None

    model_config = ConfigDict(from_attributes=True)

# pydantic_schemas.py 末尾新增
class MessageCreate(BaseModel):
    receiver_username: str
    content: str

class MessageResponse(BaseModel):
    id: int
    sender_username: str  # 为了方便前端展示，我们直接返回用户名
    receiver_username: str
    content: str
    is_read: int
    created_at: datetime
    
    model_config = ConfigDict(from_attributes=True)
