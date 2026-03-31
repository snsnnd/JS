from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import or_, and_

from sqlalchemy import func
from db.database import get_db
from db import models
from schemas import pydantic_schemas
from core.security import get_current_user

router = APIRouter(
    prefix="/api/chat",
    tags=["私信与咨询模块 (Chat Operations)"]
)

@router.post("/send", summary="发送私信")
def send_message(
    msg_in: pydantic_schemas.MessageCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user) # 无论是医生还是孕妇都可以发
):
    # 找接收人
    receiver = db.query(models.User).filter(models.User.username == msg_in.receiver_username).first()
    if not receiver:
        raise HTTPException(status_code=404, detail="找不到该接收方账号")

    new_msg = models.ChatMessage(
        sender_id=current_user.id,
        receiver_id=receiver.id,
        content=msg_in.content
    )
    db.add(new_msg)
    db.commit()
    db.refresh(new_msg)
    
    return {"status": "success", "message": "发送成功"}

@router.get("/history/{other_username}", summary="拉取与某人的聊天记录")
def get_chat_history(
    other_username: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    other_user = db.query(models.User).filter(models.User.username == other_username).first()
    if not other_user:
        raise HTTPException(status_code=404, detail="找不到该聊天对象")

    # 查询我和他之间的所有聊天记录 (按时间正序，早的在上面)
    messages = db.query(models.ChatMessage).filter(
        or_(
            and_(models.ChatMessage.sender_id == current_user.id, models.ChatMessage.receiver_id == other_user.id),
            and_(models.ChatMessage.sender_id == other_user.id, models.ChatMessage.receiver_id == current_user.id)
        )
    ).order_by(models.ChatMessage.created_at.asc()).all()

    result = []
    for msg in messages:
        result.append({
            "id": msg.id,
            "sender_username": msg.sender.username,
            "receiver_username": msg.receiver.username,
            "content": msg.content,
            "is_read": msg.is_read,
            "created_at": msg.created_at
        })
        # 如果是对方发给我的，且我拉取了记录，自动标记为已读
        if msg.receiver_id == current_user.id and msg.is_read == 0:
            msg.is_read = 1
            
    db.commit() # 保存已读状态
    return result



@router.get("/unread", summary="获取当前用户的未读消息总数和明细")
def get_unread_messages(db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    """
    统计别人发给我的、且 is_read == 0 的消息。
    返回格式: { "total": 5, "details": { "B001": 2, "B002": 3 } }
    """
    unread_counts = db.query(
        models.ChatMessage.sender_id, 
        func.count(models.ChatMessage.id).label("count")
    ).filter(
        models.ChatMessage.receiver_id == current_user.id,
        models.ChatMessage.is_read == 0
    ).group_by(models.ChatMessage.sender_id).all()
    
    result = {}
    total = 0
    for sender_id, count in unread_counts:
        sender = db.query(models.User).filter(models.User.id == sender_id).first()
        if sender:
            result[sender.username] = count
            total += count
            
    return {"total": total, "details": result}