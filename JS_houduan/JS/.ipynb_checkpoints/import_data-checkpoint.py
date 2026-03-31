import pandas as pd
import math
from sqlalchemy.orm import Session
from db.database import SessionLocal, engine
from db import models
from core.security import get_password_hash

# 确保所有表结构已创建
models.Base.metadata.create_all(bind=engine)

CSV_FILE_PATH = "nvtai.xlsx" # 替换为你的 CSV 文件实际路径
DEFAULT_PASSWORD = "123456"

def calculate_bmi_group(bmi: float) -> str:
    """根据 BMI 数值计算所属分组 (匹配数据库 Enum)"""
    if pd.isna(bmi) or bmi <= 0:
        return '正常'
    if bmi < 18.5:
        return '偏瘦'
    elif 18.5 <= bmi < 24:
        return '正常'
    elif 24 <= bmi < 28:
        return '偏胖'
    else:
        return '肥胖'

def parse_pregnant_weeks(week_str) -> int:
    """解析孕周字符串，例如把 '13w+5' 解析为 13"""
    if pd.isna(week_str):
        return 12 # 默认值
    week_str = str(week_str).strip()
    if 'w' in week_str.lower():
        try:
            return int(week_str.lower().split('w')[0])
        except:
            return 12
    try:
        return int(float(week_str))
    except:
        return 12

def run_import():
    db: Session = SessionLocal()
    try:
        print("1. 正在初始化默认超级医生账号...")
        admin_user = db.query(models.User).filter(models.User.username == "admin").first()
        if not admin_user:
            admin_user = models.User(
                username="admin",
                password_hash=get_password_hash(DEFAULT_PASSWORD),
                role="doctor",
                real_name="超级专家",
                contact_info="13800138000"
            )
            db.add(admin_user)
            db.commit()
            print("   ✅ 医生账号 admin 创建成功 (密码: 123456)")

        print(f"2. 正在读取数据集: {CSV_FILE_PATH} ...")
        df = pd.read_excel(CSV_FILE_PATH)
        
        # 记录统计
        created_users = 0
        created_records = 0

        print("3. 开始批量导入孕妇账号、档案与测序记录...")
        for index, row in df.iterrows():
            patient_code = str(row['孕妇代码']).strip()
            if pd.isna(patient_code) or patient_code == 'nan':
                continue

            # ==============================
            # A. 创建/获取孕妇账号 (User)
            # ==============================
            patient_user = db.query(models.User).filter(models.User.username == patient_code).first()
            if not patient_user:
                patient_user = models.User(
                    username=patient_code,
                    password_hash=get_password_hash(DEFAULT_PASSWORD),
                    role="patient",
                    real_name=f"孕妇_{patient_code}",
                    contact_info="13999999999"
                )
                db.add(patient_user)
                db.commit() # 先提交以获取 ID
                db.refresh(patient_user)
                created_users += 1

                # ==============================
                # B. 创建孕妇生理档案 (PatientProfile)
                # ==============================
                bmi_val = float(row['孕妇BMI']) if not pd.isna(row['孕妇BMI']) else 22.0
                profile = models.PatientProfile(
                    user_id=patient_user.id,
                    height=float(row['身高']) if not pd.isna(row['身高']) else 160.0,
                    weight=float(row['体重']) if not pd.isna(row['体重']) else 60.0,
                    bmi=bmi_val,
                    age=int(row['年龄']) if not pd.isna(row['年龄']) else 30,
                    current_weeks_pregnant=parse_pregnant_weeks(row['检测孕周']),
                    bmi_group=calculate_bmi_group(bmi_val)
                )
                db.add(profile)
                db.commit()

            # ==============================
            # C. 导入 NIPT 测序数据记录 (NIPTRecord)
            # ==============================
            # 处理空值，将 NaN 转为 0.0
            def safe_float(val):
                return 0.0 if pd.isna(val) else float(val)

            nipt_record = models.NIPTRecord(
                user_id=patient_user.id,
                alignment_ratio=safe_float(row['在参考基因组上比对的比例']),
                filtered_ratio=safe_float(row['被过滤掉读段数的比例']),
                z_value_chr13=safe_float(row['13号染色体的Z值']),
                z_value_chr18=safe_float(row['18号染色体的Z值']),
                z_value_chr21=safe_float(row['21号染色体的Z值']),
                z_value_chrX=safe_float(row['X染色体的Z值']),
                gc_content_chr13=safe_float(row['13号染色体的GC含量']),
                gc_content_chr18=safe_float(row['18号染色体的GC含量']),
                gc_content_chr21=safe_float(row['21号染色体的GC含量']),
                sample_status="待分析" # 设置为待分析，方便医生在前端一键调用 AI 接口
            )
            db.add(nipt_record)
            db.commit()
            created_records += 1

            if created_records % 50 == 0:
                print(f"   ... 已处理 {created_records} 条记录 ...")

        print("========================================")
        print("🎉 批量导入完成！")
        print(f"👩‍⚕️ 医生账号: admin / 123456")
        print(f"🤰 新增孕妇账号: {created_users} 个 (账号如 'B001', 密码全是 '123456')")
        print(f"🧬 新增 NIPT 测序数据: {created_records} 条")
        print("========================================")

    except Exception as e:
        db.rollback()
        print(f"❌ 导入过程中发生错误: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    run_import()