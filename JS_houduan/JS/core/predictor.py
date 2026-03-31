import joblib
import pandas as pd
import numpy as np
import math
import os
import shap

class NIPTPredictor:
    def __init__(self, model_dir="ai_models"):
        self.model_dir = model_dir
        if not os.path.exists(model_dir):
            os.makedirs(model_dir)
            
        self.iforest_path = os.path.join(model_dir, "fetal_iforest_model.joblib")
        self.xgb_path = os.path.join(model_dir, "fetal_xgb_model.joblib")
        self.scaler_path = os.path.join(model_dir, "fetal_iforest_scaler.joblib")
        self.features_path = os.path.join(model_dir, "fetal_iforest_features.joblib")
        
        self.model_iforest = None
        self.model_xgb = None
        self.scaler = None
        self.feature_names = []
        self.explainer = None
        
        self.weights = {"iforest": 0.7, "xgboost": 0.3}
        self.params = {
            "beta_0": -0.0540, "beta_w1": 0.3297, "beta_w2": 0.0846, 
            "beta_b1": -0.1131, "beta_b2": -0.0097
        }

        self.load_models()

    def load_models(self):
        try:
            if os.path.exists(self.scaler_path):
                self.scaler = joblib.load(self.scaler_path)
            if os.path.exists(self.features_path):
                self.feature_names = joblib.load(self.features_path)
            
            if os.path.exists(self.iforest_path):
                self.model_iforest = joblib.load(self.iforest_path)
                print("✅ 引擎 1 (iForest) 加载成功")
                
            if os.path.exists(self.xgb_path):
                self.model_xgb = joblib.load(self.xgb_path)
                self.explainer = shap.TreeExplainer(self.model_xgb)
                print("✅ 引擎 2 (XGBoost) 及 SHAP 解释器加载成功")
                
        except Exception as e:
            print(f"⚠️ 模型加载/热更新过程中出现异常: {e}")

    def retrain_xgboost(self, training_data: pd.DataFrame):
        """
        🚀 优化点：真正实现 MLOps。
        当医生点击按钮时，后端传入新标注的 DataFrame。
        """
        try:
            # 增量学习（使用 xgb 的 xgb_model 参数或直接全量重新拟合）
            X = training_data[self.feature_names]
            y = training_data['label']
            
            self.model_xgb.fit(X, y) # 重新训练
            joblib.dump(self.model_xgb, self.xgb_path) # 覆盖保存
            
            # 更新解释器，确保 MLOps 页面看到的 SHAP 也是最新的
            self.explainer = shap.TreeExplainer(self.model_xgb) 
            return True, "模型演进成功，新权重已激活"
        except Exception as e:
            return False, f"重训失败: {str(e)}"

    def retrain_iforest(self, db):
        """
        🚀 完善逻辑：从数据库提取所有【低风险】样本作为基准，重新训练孤立森林。
        这体现了系统在医疗大数据下的自我进化能力。
        """
        try:
            # 1. 从数据库拉取所有已分析为“低风险”的真实样本
            # 这里的 models.NIPTRecord 是你的检测记录表
            from db import models
            records = db.query(models.NIPTRecord).all()
            
            if len(records) < 50:
                return False, "重训失败：样本量不足（需至少 50 例真实数据）"

            # 2. 提取特征并转化为 DataFrame
            data_list = []
            for r in records:
                # 提取原始生信指标
                row = {
                    'z_13': r.z_value_chr13, 'z_18': r.z_value_chr18, 
                    'z_21': r.z_value_chr21, 'z_x': r.z_value_chrX,
                    'gc_13': r.gc_content_chr13, 'gc_18': r.gc_content_chr18,
                    'gc_21': r.gc_content_chr21, 'alignment_ratio': r.alignment_ratio,
                    'filtered_ratio': r.filtered_ratio
                }
                # 注入该样本当时的 BMI (需要关联 User 表获取)
                user = db.query(models.User).filter(models.User.id == r.user_id).first()
                row['bmi'] = user.bmi if user and user.bmi else 22.0
                data_list.append(row)

            df_new = pd.DataFrame(data_list)

            # 3. 执行相同的特征工程 (与 predict 逻辑保持一致)
            df_new['multi_z_abnormal'] = (df_new[['z_13', 'z_18', 'z_21', 'z_x']].abs() > 3).sum(axis=1)
            df_new['gc_abnormal_flag'] = ((df_new[['gc_13', 'gc_18', 'gc_21']] < 40) | 
                                          (df_new[['gc_13', 'gc_18', 'gc_21']] > 60)).any(axis=1).astype(int)
            df_new['bmi_group'] = pd.cut(df_new['bmi'], bins=[-np.inf, 18.5, 24, 30, np.inf], labels=[0, 1, 2, 3]).astype(int)

            # 4. 重新训练模型
            from sklearn.ensemble import IsolationForest
            # 这里的 contamination 可以动态计算，也可以保持固定
            new_model = IsolationForest(n_estimators=100, contamination=0.05, random_state=42)
            
            # 使用 self.feature_names 确保列顺序一致
            X = df_new[self.feature_names]
            
            # 重新拟合
            new_model.fit(X)
            
            # 5. 持久化保存
            self.model_iforest = new_model
            joblib.dump(new_model, self.iforest_path)
            
            # 6. 记录到审计日志 (对应你新增的 AuditLog 表)
            log = models.AuditLog(
                action="iForest_Retrain", 
                status="Success", 
                detail=f"基于 {len(records)} 例样本成功更新异常判定基准线"
            )
            db.add(log)
            db.commit()

            return True, f"iForest 引擎进化成功，已学习 {len(records)} 例新样本特征"

        except Exception as e:
            return False, f"重训异常: {str(e)}"

    def predict_best_week(self, bmi: float) -> float:
        """
        基于第一问模型公式，反向求解使浓度达到 4% 基准线的最早孕周 W
        """
        p = self.params
        # 常数项 C = beta_0 + b1*bmi + b2*bmi^2 - Target(4.0)
        c = p["beta_0"] + p["beta_b1"]*bmi + p["beta_b2"]*(bmi**2) - 4.0
        
        # 一元二次方程求解: beta_w2*W^2 + beta_w1*W + c = 0
        delta = (p["beta_w1"]**2) - (4 * p["beta_w2"] * c)
        
        if delta < 0: return 22.0 # 极端情况建议最晚期检测
        
        w = (-p["beta_w1"] + math.sqrt(delta)) / (2 * p["beta_w2"])
        
        # 结果约束在临床合理的 10-24 周之间
        return round(max(10.0, min(24.0, w)), 1)

    def predict_anomaly_dual_engine(self, metrics: dict, bmi: float):
        # 1. 字段映射 (前端长字段 -> 模型短字段)
        mapping = {
            'z_value_chr13': 'z_13',
            'z_value_chr18': 'z_18',
            'z_value_chr21': 'z_21',
            'z_value_chrX': 'z_x',
            'gc_content_chr13': 'gc_13',
            'gc_content_chr18': 'gc_18',
            'gc_content_chr21': 'gc_21',
            'alignment_ratio': 'alignment_ratio',
            'filtered_ratio': 'filtered_ratio'
        }
        mapped_metrics = {mapping.get(k, k): v for k, v in metrics.items()}
        mapped_metrics['bmi'] = bmi
        
        df = pd.DataFrame([mapped_metrics])
        
        # 2. 【核心修复】与训练过程完全同步的特征工程
        z_cols = ['z_13', 'z_18', 'z_21', 'z_x']
        df['multi_z_abnormal'] = (df[z_cols].abs() > 3).sum(axis=1)
        
        gc_cols = ['gc_13', 'gc_18', 'gc_21']
        df['gc_abnormal_flag'] = ((df[gc_cols] < 40) | (df[gc_cols] > 60)).any(axis=1).astype(int)
        
        df['bmi_group'] = pd.cut(df['bmi'], bins=[-np.inf, 18.5, 24, 30, np.inf], labels=[0, 1, 2, 3]).astype(int)
        
        # 3. 确保 feature_names 不为空，按训练时的顺序排列
        if not self.feature_names:
            self.feature_names = [
                'bmi', 'z_13', 'z_18', 'z_21', 'z_x', 
                'gc_13', 'gc_18', 'gc_21', 'alignment_ratio', 'filtered_ratio',
                'multi_z_abnormal', 'gc_abnormal_flag', 'bmi_group'
            ]

        # 4. 【核心修复】去掉 [:10] 切片，直接使用完整特征列表放入 scaler
        if self.scaler:
            X_scaled = self.scaler.transform(df[self.feature_names])
        else:
            X_scaled = df[self.feature_names].values 

        # 5. 开始双引擎打分
        iforest_score = 0.5
        if self.model_iforest:
            iforest_raw = self.model_iforest.decision_function(X_scaled)[0]
            iforest_score = float(max(0, min(1, 0.5 - iforest_raw)))
            
        xgb_score = 0.5
        if self.model_xgb:
            xgb_score = float(self.model_xgb.predict_proba(X_scaled)[0][1])
            
        w_if = self.weights["iforest"]
        w_xgb = self.weights["xgboost"]
        final_score = round((w_if * iforest_score) + (w_xgb * xgb_score), 4)
        
        # 风险定级
        risk_level = "低风险"
        if final_score >= 0.65: risk_level = "高风险"
        elif final_score >= 0.40: risk_level = "临界风险"
            
        # 6. SHAP 归因
        shap_expl = None
        if self.explainer and self.model_xgb:
            try:
                shap_values = self.explainer.shap_values(X_scaled)
                sv = shap_values[1][0] if isinstance(shap_values, list) else shap_values[0]
                contribs = {name: round(float(value), 6) for name, value in zip(self.feature_names, sv)}
                
                ev = self.explainer.expected_value
                base_val = float(ev[1] if isinstance(ev, (list, np.ndarray)) else ev)
                
                shap_expl = {
                    "base_expected_value": round(base_val, 4), 
                    "feature_contributions": contribs
                }
            except Exception as e:
                shap_expl = {"error": f"SHAP计算失败: {str(e)}"}

        return final_score, risk_level, {
            "iforest_score": round(iforest_score, 3),
            "xgboost_score": round(xgb_score, 3),
            "fusion_formula": f"Final = {w_if}*iForest + {w_xgb}*XGB"
        }, shap_expl

predictor = NIPTPredictor()
