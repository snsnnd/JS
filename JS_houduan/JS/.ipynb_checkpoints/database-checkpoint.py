from sqlalchemy import create_engine, Column, Integer, String, Float, ForeignKey, DateTime, Enum, Text
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
import datetime

# 1. 配置数据库连接 URL
# 格式: mysql+pymysql://用户名:密码@主机地址:端口号/数据库名
SQLALCHEMY_DATABASE_URL = "mysql+pymysql://root:Abcdef04071#@116.62.86.255:3306/nipt_system"

# 2. 创建数据库引擎
engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    pool_pre_ping=True,  # 保持连接活跃，防止断开
    echo=False           # 调试时可设为True，会在控制台打印所有SQL语句
)

# 3. 创建会话工厂
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# 4. 定义声明基类（所有的表模型都要继承它）
Base = declarative_base()

# =========================================
# 5. 定义表结构模型 (对照你设计的四张表)
# ==========================================

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(50), unique=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    role = Column(Enum('doctor', 'patient'), nullable=False)
    real_name = Column(String(50))
    contact_info = Column(String(100))
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

class PatientProfile(Base):
    __tablename__ = "patient_profiles"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    height = Column(Float)
    weight = Column(Float)
    bmi = Column(Float)
    age = Column(Integer)
    current_weeks_pregnant = Column(Float)
    bmi_group = Column(String(20)) # 偏瘦/正常/超重/肥胖

class NIPTRecord(Base):
    __tablename__ = "nipt_records"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    alignment_ratio = Column(Float)
    filtered_ratio = Column(Float)
    # 染色体 Z 值
    z_value_chr13 = Column(Float)
    z_value_chr18 = Column(Float)
    z_value_chr21 = Column(Float)
    z_value_chrX = Column(Float)
    # GC 含量
    gc_content_chr13 = Column(Float)
    gc_content_chr18 = Column(Float)
    gc_content_chr21 = Column(Float)
    sample_status = Column(String(20)) # 通过/未通过质量初筛

class AIAnalysisResult(Base):
    __tablename__ = "ai_analysis_results"
    id = Column(Integer, primary_key=True, index=True)
    nipt_record_id = Column(Integer, ForeignKey("nipt_records.id"))
    anomaly_score = Column(Float)
    risk_level = Column(String(20)) # 红/黄/绿
    recommended_weeks = Column(Float)
    expected_success_rate = Column(Float)
    doctor_notes = Column(Text)

# 6. 获取数据库会话的依赖函数
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# 7. (可选) 自动创建表逻辑
# 如果你在MySQL里还没建表，运行这个脚本会根据上面的定义自动创建
# if __name__ == "__main__":
    # Base.metadata.create_all(bind=engine)
    # print("✅ 数据库表结构同步完成！")