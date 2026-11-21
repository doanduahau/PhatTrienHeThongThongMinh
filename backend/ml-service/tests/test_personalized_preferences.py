import pandas as pd

from src.algorithms.cosine_kmeans.model import PersonalizedRecommender
from src.algorithms.cosine_kmeans.product_tags import PREFERENCE_LABELS


def test_preference_labels_cover_catalog_and_rank_inside_category():
    rows = [
        {"product_id": 1, "category_slug": "chuot", "name": "FPS mouse", "connectivity": "tri_mode"},
        {"product_id": 2, "category_slug": "ban-phim", "name": "Compact RGB", "layout": "75%", "color": "Black"},
        {"product_id": 3, "category_slug": "lot-chuot", "name": "Control pad", "pad_type": "hybrid"},
        {"product_id": 4, "category_slug": "tai-nghe", "name": "Headphones"},
        {"product_id": 5, "category_slug": "soundcard", "name": "Audio DAC"},
        {"product_id": 6, "category_slug": "ghe", "name": "Chair"},
        {"product_id": 7, "category_slug": "ban", "name": "Desk"},
        {"product_id": 8, "category_slug": "arm-man-hinh", "name": "Monitor arm"},
        {"product_id": 9, "category_slug": "phu-kien-cong-thai-hoc", "name": "Footrest"},
    ]
    interactions = pd.DataFrame([{"user_id": "u", "product_id": 1}])
    model = PersonalizedRecommender().fit(pd.DataFrame(rows), interactions)
    tags = model.products_df.set_index("product_id")["preference_tags"]

    assert tags.map(bool).all()
    assert set(tags.explode()) == set(PREFERENCE_LABELS)
    assert "game_cs2_valorant" in tags["1"]
    assert "game_moba" in tags["3"]
    assert "am_thanh" in tags["5"]
    assert "setup_cong_thai_hoc" in tags["9"]
    ranked = model.recommend("u", top_n=50, category_slugs=["ghe", "arm-man-hinh"])
    assert {product["product_id"] for product in ranked} == {"6", "8"}
    assert model.recommend("u", category_slugs=["khong-co"]) == []
