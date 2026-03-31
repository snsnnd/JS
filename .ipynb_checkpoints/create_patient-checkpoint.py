import bcrypt
from sqlalchemy import text
from db.database import SessionLocal
import random

def run():
    db = SessionLocal()
    try:
        # --- 1. 创建孕妇账号 (users 表) ---
        username = "patient_test"
        raw_pwd = "123456"
        hashed_pwd = bcrypt.hashpw(raw_pwd.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
        
        # 清理旧数据
        db.execute(text("DELETE FROM users WHERE username = :u"), {"u": username})
        
        db.execute(text("""
            INSERT INTO users (username, password_hash, role, real_name) 
            VALUES (:u, :p, 'patient', '测试孕妇01')
        """), {"u": username, "p": hashed_pwd})
        
        # 获取刚创建的 user_id
        user_id = db.execute(text("SELECT id FROM users WHERE username = :u"), {"u": username}).fetchone()[0]
        print(f"✅ 账号创建成功: {username}, ID: {user_id}")

        # --- 2. 创建患者档案 (patient_profiles 表) ---
        # 对应你的 Screenshot 数据类型: decimal(5,2) 和 enum
        db.execute(text("DELETE FROM patient_profiles WHERE user_id = :uid"), {"uid": user_id})
        db.execute(text("""
            INSERT INTO patient_profiles (user_id, height, weight, bmi, age, current_weeks_pregnant, bmi_group) 
            VALUES (:uid, 165.00, 60.50, 22.22, 28, 15.5, 'normal')
        """), {"uid": user_id})
        print(f"✅ 档案注入成功: BMI 22.22, 孕周 15.5")

        # --- 3. 注入测序数据 (nipt_records 表) ---
        # 这里注入一个 21 号染色体 Z 值明显偏高(异常)的数据进行验证
        db.execute(text("DELETE FROM nipt_records WHERE user_id = :uid"), {"uid": user_id})
        db.execute(text("""
            INSERT INTO nipt_records (
                user_id, alignment_ratio, filtered_ratio, 
                z_value_chr13, z_value_chr18, z_value_chr21, z_value_chrX, 
                gc_content_chr13, gc_content_chr18, gc_content_chr21, sample_status
            ) VALUES (
                :uid, 0.85, 0.02, 
                1.02, -0.50, 4.88, 0.75, 
                0.39, 0.40, 0.41, 'pass'
            )
        """), {"uid": user_id})
        print(f"✅ 测序数据注入成功: Chr21 Z-score = 4.88 (预期高风险)")

        db.commit()
        print("\n" + "🚀" * 15)
        print("所有测试数据已就绪！")
        print(f"请使用账号: {username} 密码: {raw_pwd} 进行登录验证")
        print("🚀" * 15)

    except Exception as e:
        db.rollback()
        print(f"❌ 注入失败: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    run()