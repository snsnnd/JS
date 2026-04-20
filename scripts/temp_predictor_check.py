"""临时排查脚本：检查双引擎分数是否出现“几乎恒定输出”。

用法：
  python scripts/temp_predictor_check.py
"""

from __future__ import annotations

import statistics
import sys
import types
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))
MODELS_DIR = ROOT / "ai_models"


def ensure_shap_importable() -> bool:
    """如果环境没有 shap，注入最小 stub，保证可执行评分路径。"""
    try:
        import shap  # noqa: F401
        return True
    except Exception:
        stub = types.ModuleType("shap")

        class _DummyTreeExplainer:
            def __init__(self, model):
                self.model = model
                self.expected_value = 0.0

            def shap_values(self, _x):
                raise RuntimeError("shap is not installed; using stub explainer")

        stub.TreeExplainer = _DummyTreeExplainer
        sys.modules["shap"] = stub
        return False


def run_check() -> int:
    shap_ok = ensure_shap_importable()

    from core.predictor import predictor

    print("=== 临时排查: 双引擎分数差异度 ===")
    print(f"模型目录: {MODELS_DIR}")
    print(f"fetal_iforest_model.joblib 存在: {(MODELS_DIR / 'fetal_iforest_model.joblib').exists()}")
    print(f"fetal_xgb_model.joblib 存在: {(MODELS_DIR / 'fetal_xgb_model.joblib').exists()}")
    print(f"scaler 存在: {(MODELS_DIR / 'fetal_iforest_scaler.joblib').exists()}")
    print(f"features 存在: {(MODELS_DIR / 'fetal_iforest_features.joblib').exists()}")
    print(f"shap 可用: {shap_ok}")
    print(f"iForest 加载: {predictor.model_iforest is not None}")
    print(f"XGBoost 加载: {predictor.model_xgb is not None}")

    # 5 组明显不同的样本
    samples = [
        {
            "name": "baseline",
            "bmi": 22.0,
            "metrics": {
                "alignment_ratio": 0.98,
                "filtered_ratio": 0.95,
                "z_value_chr13": 0.1,
                "z_value_chr18": 0.2,
                "z_value_chr21": 0.1,
                "z_value_chrX": 0.0,
                "gc_content_chr13": 45,
                "gc_content_chr18": 46,
                "gc_content_chr21": 44,
            },
        },
        {
            "name": "z_extreme",
            "bmi": 22.0,
            "metrics": {
                "alignment_ratio": 0.98,
                "filtered_ratio": 0.95,
                "z_value_chr13": 5.5,
                "z_value_chr18": -4.8,
                "z_value_chr21": 6.2,
                "z_value_chrX": 3.8,
                "gc_content_chr13": 45,
                "gc_content_chr18": 46,
                "gc_content_chr21": 44,
            },
        },
        {
            "name": "gc_extreme",
            "bmi": 22.0,
            "metrics": {
                "alignment_ratio": 0.98,
                "filtered_ratio": 0.95,
                "z_value_chr13": 0.1,
                "z_value_chr18": 0.2,
                "z_value_chr21": 0.1,
                "z_value_chrX": 0.0,
                "gc_content_chr13": 30,
                "gc_content_chr18": 71,
                "gc_content_chr21": 66,
            },
        },
        {
            "name": "quality_low",
            "bmi": 22.0,
            "metrics": {
                "alignment_ratio": 0.65,
                "filtered_ratio": 0.58,
                "z_value_chr13": 0.1,
                "z_value_chr18": 0.2,
                "z_value_chr21": 0.1,
                "z_value_chrX": 0.0,
                "gc_content_chr13": 45,
                "gc_content_chr18": 46,
                "gc_content_chr21": 44,
            },
        },
        {
            "name": "bmi_high",
            "bmi": 32.0,
            "metrics": {
                "alignment_ratio": 0.98,
                "filtered_ratio": 0.95,
                "z_value_chr13": 0.1,
                "z_value_chr18": 0.2,
                "z_value_chr21": 0.1,
                "z_value_chrX": 0.0,
                "gc_content_chr13": 45,
                "gc_content_chr18": 46,
                "gc_content_chr21": 44,
            },
        },
    ]

    rows: list[tuple[str, float, float, float, str]] = []
    for s in samples:
        final_score, risk_level, details, shap_expl = predictor.predict_anomaly_dual_engine(
            s["metrics"], s["bmi"]
        )
        rows.append((s["name"], final_score, details["iforest_score"], details["xgboost_score"], risk_level))
        print(
            f"{s['name']:<12} final={final_score:.4f} if={details['iforest_score']:.4f} "
            f"xgb={details['xgboost_score']:.4f} risk={risk_level}"
        )
        if isinstance(shap_expl, dict) and shap_expl.get("error"):
            print(f"  SHAP状态: {shap_expl['error']}")

    finals = [r[1] for r in rows]
    ifs = [r[2] for r in rows]
    xgbs = [r[3] for r in rows]

    print("--- 汇总 ---")
    print(f"final_score 唯一值个数: {len(set(finals))}, std={statistics.pstdev(finals):.6f}")
    print(f"iforest_score 唯一值个数: {len(set(ifs))}, std={statistics.pstdev(ifs):.6f}")
    print(f"xgboost_score 唯一值个数: {len(set(xgbs))}, std={statistics.pstdev(xgbs):.6f}")

    is_flat = len(set(finals)) <= 1
    print(f"结论: {'疑似恒定输出' if is_flat else '分数可区分，非恒定输出'}")
    return 0


if __name__ == "__main__":
    raise SystemExit(run_check())
