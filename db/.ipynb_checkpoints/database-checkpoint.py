import os
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

# 【修复】采用环境变量读取数据库地址，提供默认回退以防找不到 .env 时报错
# 在生产环境下，请设置操作系统的环境变量 SQLALCHEMY_DATABASE_URL
DEFAULT_DB_URL = "mysql+pymysql://root:Abcdef04071@116.62.86.255:3306/nipt_system"
SQLALCHEMY_DATABASE_URL = os.getenv("SQLALCHEMY_DATABASE_URL", DEFAULT_DB_URL)

engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    pool_pre_ping=True,
    echo=False  
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()