from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# 引入数据库引擎和模型，确保启动时表结构同步
from db.database import engine
from db import models

# 引入我们写好的路由模块
from routers import auth
from routers import doctor  # 预留给医生端的业务接口
from routers import patient # 预留给孕妇端的业务接口
from routers import chat

# 1. 初始化数据库表结构 (如果云端还没有表，这行代码会自动建表)
models.Base.metadata.create_all(bind=engine)

# 2. 实例化 FastAPI 应用 (这些信息会展示在 Swagger UI 接口文档上)
app = FastAPI(
    title="NIPT 智能辅助决策系统",
    description="基于统计学与机器学习(Isolation Forest)的胎儿异常风险预警与最佳检测时点推荐平台。",
    version="1.0.0",
    docs_url="/docs", # 默认的接口文档地址
    redoc_url="/redoc"
)

# 3. 配置跨域资源共享 (CORS) - 极其重要！
# 允许任何前端域名(比如 http://localhost:8080)访问这个后端
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # 生产环境建议改为实际的前端域名
    allow_credentials=True,
    allow_methods=["*"], # 允许所有请求方法 (GET, POST, PUT, DELETE)
    allow_headers=["*"], # 允许所有请求头 (包括带 Token 的 Authorization)
)

# 4. 挂载路由模块 (把分散在 routers 文件夹里的接口全接进来)
app.include_router(auth.router)
app.include_router(doctor.router)  # 等我们写完后取消注释
app.include_router(patient.router) # 等我们写完后取消注释
app.include_router(chat.router)

# 5. 根目录测试接口 (用于探测后端是否存活)
@app.get("/", tags=["系统探活"])
async def root():
    return {
        "status": "success",
        "message": "欢迎访问 NIPT 智能辅助决策系统后端 API",
        "doc_url": "访问 /docs 查看完整接口文档"
    }

if __name__ == "__main__":
    import uvicorn
    # 本地启动命令配置 (如果在终端运行 python main.py 也会生效)
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)