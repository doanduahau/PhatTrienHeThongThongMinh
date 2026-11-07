"""Khối Thường mua kèm (Frequently Bought Together) - Thuật toán: FP-Growth.

Khai phá các tập mục phổ biến (Frequent Itemsets) từ lịch sử đơn hàng bằng FP-Tree,
sinh luật kết hợp (Association Rules) dạng {A} -> {B} với các chỉ số Support,
Confidence và Lift để gợi ý sản phẩm mua kèm.
"""

from __future__ import annotations

from collections import defaultdict
from pathlib import Path
from typing import Any

import joblib
import pandas as pd


class FPGrowthRecommender:
    """Hệ thống gợi ý sản phẩm thường mua kèm sử dụng luật kết hợp từ FP-Growth."""

    def __init__(self, min_support: float = 0.01, min_confidence: float = 0.2, min_lift: float = 1.0) -> None:
        self.min_support = min_support
        self.min_confidence = min_confidence
        self.min_lift = min_lift
        self.rules: list[dict[str, Any]] = []
        self.item_support: dict[str, float] = {}

    def fit_from_db(self) -> "FPGrowthRecommender":
        """Nạp dữ liệu đơn hàng và giỏ hàng trực tiếp từ PostgreSQL Supabase để khai phá luật mua kèm."""
        from db.repository import fetch_order_transactions

        transactions = fetch_order_transactions()
        if not transactions:
            print("[FP-Growth] Chưa có đơn hàng trong DB để huấn luyện. Khởi tạo danh sách luật rỗng.")
            self.rules = []
            return self

        return self.fit_transactions(transactions)

    def fit(self, orders_df: pd.DataFrame) -> "FPGrowthRecommender":
        """Huấn luyện mô hình từ dữ liệu đơn hàng (cần các cột: 'order_id', 'product_id')."""
        if orders_df.empty:
            raise ValueError("Dữ liệu đơn hàng rỗng, không thể huấn luyện FP-Growth.")

        for col in ("order_id", "product_id"):
            if col not in orders_df.columns:
                raise ValueError(f"Dữ liệu đơn hàng thiếu cột bắt buộc: '{col}'")

        transactions = (
            orders_df.groupby("order_id")["product_id"]
            .apply(lambda s: sorted(list(set(str(x) for x in s))))
            .tolist()
        )
        return self.fit_transactions(transactions)

    def fit_transactions(self, transactions: list[list[str]]) -> "FPGrowthRecommender":
        """Huấn luyện trực tiếp từ danh sách các giỏ hàng / giao dịch."""
        total_transactions = len(transactions)
        if total_transactions == 0:
            self.rules = []
            return self

        # Thử sử dụng mlxtend nếu môi trường có sẵn
        try:
            from mlxtend.frequent_patterns import association_rules, fpgrowth
            from mlxtend.preprocessing import TransactionEncoder

            te = TransactionEncoder()
            te_ary = te.fit(transactions).transform(transactions)
            df_trans = pd.DataFrame(te_ary, columns=te.columns_)

            frequent_itemsets = fpgrowth(
                df_trans, min_support=self.min_support, use_colnames=True
            )

            if not frequent_itemsets.empty:
                raw_rules = association_rules(
                    frequent_itemsets, metric="confidence", min_threshold=self.min_confidence
                )
                self.rules = []
                for _, row in raw_rules.iterrows():
                    lift = float(row.get("lift", 1.0))
                    if lift < self.min_lift:
                        continue
                    self.rules.append({
                        "antecedents": list(row["antecedents"]),
                        "consequents": list(row["consequents"]),
                        "support": round(float(row["support"]), 4),
                        "confidence": round(float(row["confidence"]), 4),
                        "lift": round(lift, 4),
                    })
                return self
        except ImportError:
            pass

        self._fit_pairwise(transactions, total_transactions)
        return self

    def _fit_pairwise(self, transactions: list[list[str]], total: int) -> None:
        """Khai phá tập phổ biến & luật kết hợp 2 mục tối ưu khi chưa cài mlxtend."""
        item_counts: dict[str, int] = defaultdict(int)
        pair_counts: dict[tuple[str, str], int] = defaultdict(int)

        for trans in transactions:
            unique_items = sorted(set(trans))
            for item in unique_items:
                item_counts[item] += 1
            for i in range(len(unique_items)):
                for j in range(i + 1, len(unique_items)):
                    pair = (unique_items[i], unique_items[j])
                    pair_counts[pair] += 1

        self.item_support = {item: count / total for item, count in item_counts.items()}
        self.rules = []

        for (item_a, item_b), count in pair_counts.items():
            pair_support = count / total
            if pair_support < self.min_support:
                continue

            conf_a_b = pair_support / self.item_support[item_a]
            lift_a_b = conf_a_b / self.item_support[item_b]
            if conf_a_b >= self.min_confidence and lift_a_b >= self.min_lift:
                self.rules.append({
                    "antecedents": [item_a],
                    "consequents": [item_b],
                    "support": round(pair_support, 4),
                    "confidence": round(conf_a_b, 4),
                    "lift": round(lift_a_b, 4),
                })

            conf_b_a = pair_support / self.item_support[item_b]
            lift_b_a = conf_b_a / self.item_support[item_a]
            if conf_b_a >= self.min_confidence and lift_b_a >= self.min_lift:
                self.rules.append({
                    "antecedents": [item_b],
                    "consequents": [item_a],
                    "support": round(pair_support, 4),
                    "confidence": round(conf_b_a, 4),
                    "lift": round(lift_b_a, 4),
                })

        self.rules.sort(key=lambda r: (r["lift"], r["confidence"]), reverse=True)

    def recommend(
        self, product_ids: str | int | list[str | int], top_n: int = 3
    ) -> list[dict[str, Any]]:
        """Gợi ý các sản phẩm thường mua kèm nhất khi người dùng xem/chọn các sản phẩm đầu vào."""
        if isinstance(product_ids, (str, int)):
            query_set = {str(product_ids)}
        else:
            query_set = {str(p) for p in product_ids}

        candidates: dict[str, dict[str, Any]] = {}
        for rule in self.rules:
            if set(rule["antecedents"]).issubset(query_set):
                for item in rule["consequents"]:
                    if item in query_set:
                        continue
                    if item not in candidates or rule["lift"] > candidates[item]["lift"]:
                        candidates[item] = {
                            "product_id": item,
                            "confidence": rule["confidence"],
                            "lift": rule["lift"],
                            "support": rule["support"],
                        }

        sorted_candidates = sorted(
            candidates.values(),
            key=lambda c: (c["lift"], c["confidence"]),
            reverse=True,
        )
        return sorted_candidates[:top_n]

    def save(self, path: str | Path) -> Path:
        target = Path(path)
        target.parent.mkdir(parents=True, exist_ok=True)
        joblib.dump(
            {
                "rules": self.rules,
                "item_support": self.item_support,
                "min_support": self.min_support,
                "min_confidence": self.min_confidence,
                "min_lift": self.min_lift,
            },
            target,
        )
        return target

    @classmethod
    def load(cls, path: str | Path) -> "FPGrowthRecommender":
        source = Path(path)
        if not source.exists():
            raise FileNotFoundError(f"Không tìm thấy model tại {source}")
        data = joblib.load(source)
        rec = cls(
            min_support=data["min_support"],
            min_confidence=data["min_confidence"],
            min_lift=data["min_lift"],
        )
        rec.rules = data["rules"]
        rec.item_support = data["item_support"]
        return rec
