import bcrypt
from sqlalchemy import text
from db.database import SessionLocal

def run():
    # 1. 直接用底层库生成哈希，不通过 passlib
    password = b"123456"
    salt = bcrypt.gensalt()
    # 这一步生成的肯定是 60 位的标准 Bcrypt 串，绝对不会超过 72
    hashed = bcrypt.hashpw(password, salt).decode('utf-8')
    
    db = SessionLocal()
    try:
        print(f"正在写入哈希值: {hashed} (长度: {len(hashed)})")
        
        # 2. 先清理旧账号
        db.execute(text("DELETE FROM users WHERE username = 'admin'"))
        
        # 3. 使用原生 SQL 插入，绕过所有 Python 模型类逻辑
        sql = text("""
            INSERT INTO users (username, password_hash, role) 
            VALUES (:u, :p, :r)
        """)
        db.execute(sql, {"u": "admin", "p": hashed, "r": "doctor"})
        
        db.commit()
        print("\n" + "★"*30)
        print("✅ 原生 SQL 强制写入成功！")
        print("👉 账号: admin")
        print("👉 密码: 123456")
        print("★"*30)
        
    except Exception as e:
        db.rollback()
        print(f"❌ 还是失败了: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    run()