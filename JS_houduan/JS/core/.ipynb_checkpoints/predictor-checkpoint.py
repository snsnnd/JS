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

    # 【修复】补充医生端接口调用的重训方法
    def retrain_xgboost(self, db):
        # TODO: 从 db 获取真实标注数据并增量训练
        return True, "XGBoost 引擎重训触发成功（此为占位方法，待完善逻辑）"

    def retrain_iforest(self, db):
        # TODO: 从 db 获取大批量健康样本更新污染率
        return True, "iForest 引擎重训触发成功（此为占位方法，待完善逻辑）"

    def predict_best_week(self, bmi: float) -> float:
        p = self.params
        c = p["beta_0"] + p["beta_b1"]*bmi + p["beta_b2"]*(bmi**2) - 4.0
        delta = (p["beta_w1"]**2) - (4 * p["beta_w2"] * c)
        if delta < 0: return 22.0
        w = (-p["beta_w1"] + math.sqrt(delta)) / (2 * p["beta_w2"])
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