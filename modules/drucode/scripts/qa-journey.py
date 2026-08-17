"""End-to-end gate for Cody Visual Blocks World 1.

Requires Python Playwright with Chromium and WebKit installed on the Mac.
Override DRUCODE_URL to test another deployment.
"""

import os
from pathlib import Path
from tempfile import mkdtemp

from playwright.sync_api import sync_playwright


URL = os.environ.get("DRUCODE_URL", "https://cody.druygon.my.id/?qa=journey-v1")
OUTPUT_DIR = Path(os.environ.get("DRUCODE_QA_OUTPUT", mkdtemp(prefix="drucode-journey-")))

EN_TITLES = ["First Command", "The Right Order", "Repeat Steps", "Helpful Loop", "Smart Condition", "Boss: Move Nara"]
ID_TITLES = ["Perintah Pertama", "Urutan yang Tepat", "Langkah Berulang", "Loop Penolong", "Kondisi Cerdas", "Boss: Nara Bergerak"]
SOLUTIONS = [
    "move (1)",
    "move(1)\nturnRight()\nmove(1)",
    "move(1)\nmove(1)\nmove(1)",
    "repeat(4) {\n  move(1)\n}",
    "ifStar() {\n  collect()\n}",
    "move(1)\nturnRight()\nrepeat(2) { move(1) }\nifStar() { collect() }",
]


def run_case(browser_type, browser_name: str, viewport: dict[str, int]) -> None:
    browser = browser_type.launch(headless=True)
    page = browser.new_page(viewport=viewport)
    errors: list[str] = []
    page.on("console", lambda message: errors.append(f"console:{message.type}:{message.text}") if message.type == "error" else None)
    page.on("pageerror", lambda error: errors.append(f"pageerror:{error}"))

    response = page.goto(URL, wait_until="networkidle")
    assert response is not None and response.status == 200
    page.get_by_role("button", name="Mission 2: The Right Order, locked").wait_for()
    page.get_by_role("button", name="Mission 1: First Command, available").click()

    editor = page.locator("#code-editor")
    editor.fill("move forward 1 step")
    page.get_by_role("button", name="Run", exact=True).click()
    page.get_by_text("That is a sentence. Code uses the pattern move(number).", exact=True).wait_for()

    editor.fill(SOLUTIONS[0])
    page.get_by_role("button", name="Save", exact=True).click()
    page.get_by_text("Draft saved. Press Run when you are ready to check the mission.", exact=True).wait_for()
    page.get_by_role("button", name="Run", exact=True).click()
    page.get_by_text("MISSION COMPLETE", exact=True).wait_for()
    page.get_by_text("The Right Order is now unlocked.", exact=True).wait_for()

    page.get_by_role("button", name="Back to the learning map").click()
    page.get_by_role("button", name="Mission 1: First Command, completed").wait_for()
    page.get_by_role("button", name="Mission 2: The Right Order, available").click()

    for mission_id in (2, 3):
        page.get_by_role("heading", name=EN_TITLES[mission_id - 1], exact=True).wait_for()
        editor.fill(SOLUTIONS[mission_id - 1])
        page.get_by_role("button", name="Run", exact=True).click()
        page.get_by_text("MISSION COMPLETE", exact=True).wait_for()
        page.get_by_role("button", name=f"Continue to {EN_TITLES[mission_id]}", exact=True).click()

    page.get_by_role("button", name="ID", exact=True).click()
    page.get_by_role("heading", name=ID_TITLES[3], exact=True).wait_for()

    for mission_id in (4, 5):
        editor.fill(SOLUTIONS[mission_id - 1])
        page.get_by_role("button", name="Jalankan", exact=True).click()
        page.get_by_text("MISI SELESAI", exact=True).wait_for()
        page.get_by_role("button", name=f"Lanjut ke {ID_TITLES[mission_id]}", exact=True).click()

    editor.fill(SOLUTIONS[5])
    page.get_by_role("button", name="Jalankan", exact=True).click()
    page.get_by_text("MISI SELESAI", exact=True).wait_for()
    page.get_by_text("Semua misi di dunia ini selesai. Progress-mu sudah tersimpan.", exact=True).wait_for()
    page.get_by_role("button", name="Lihat perjalanan selesai", exact=True).click()

    for mission_id, title in enumerate(ID_TITLES, start=1):
        page.get_by_role("button", name=f"Misi {mission_id}: {title}, selesai").wait_for()

    page.reload(wait_until="networkidle")
    page.get_by_text("Dunia selesai!", exact=True).wait_for()
    page.locator('[aria-label="Progress Blok Visual, 6 dari 6 misi selesai"]').wait_for()

    dimensions = page.evaluate("({ width: window.innerWidth, scroll: document.documentElement.scrollWidth })")
    assert dimensions["scroll"] <= dimensions["width"], dimensions
    assert errors == [], errors
    page.screenshot(path=OUTPUT_DIR / f"journey-{browser_name}-{viewport['width']}.png", full_page=True)
    browser.close()


with sync_playwright() as playwright:
    for name, browser_type in (("chromium", playwright.chromium), ("webkit", playwright.webkit)):
        for size in ({"width": 1440, "height": 1000}, {"width": 390, "height": 844}):
            run_case(browser_type, name, size)
            print(f"PASS {name} {size['width']}x{size['height']}")

print(f"Screenshots: {OUTPUT_DIR}")
