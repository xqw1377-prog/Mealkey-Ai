"""
行业模型层测试 (PriceBand, ConsumerScene)
"""

from src.core.knowledge.models import (
    CONSUMER_SCENES,
    PRICE_BANDS,
    find_price_band,
    find_scene,
)


def test_price_bands_loaded():
    assert len(PRICE_BANDS) >= 5


def test_find_price_band():
    band = find_price_band(25)
    assert band is not None
    assert band.name == "低价位"


def test_find_price_band_luxury():
    band = find_price_band(500)
    assert band is not None
    assert band.name == "奢侈级"


def test_find_price_band_zero():
    band = find_price_band(0)
    assert band is not None


def test_find_price_band_negative():
    band = find_price_band(-5)
    assert band is None or band.name == "超低价"


def test_consumer_scenes_loaded():
    assert len(CONSUMER_SCENES) >= 5


def test_find_scene():
    scene = find_scene("一人食")
    assert scene is not None
    assert scene.purpose == "日常果腹"


def test_find_scene_not_found():
    scene = find_scene("不存在的场景")
    assert scene is None


def test_scene_has_decision_factors():
    scene = find_scene("商务宴请")
    assert scene is not None
    assert len(scene.decision_factors) > 0
    assert "档次" in scene.decision_factors


def test_price_band_has_competitive_chars():
    band = find_price_band(50)
    assert band is not None
    assert len(band.competitive_chars) > 0
