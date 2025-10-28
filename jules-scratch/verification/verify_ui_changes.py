from playwright.sync_api import sync_playwright

def run(playwright):
    browser = playwright.chromium.launch(headless=True)
    context = browser.new_context()
    page = context.new_page()

    # Navigate to the map screen
    page.goto("http://localhost:3000/")

    # Click on a parking lot to open the details view
    page.locator('.leaflet-marker-icon').first.click()

    # Wait for the lot info view to be visible
    page.wait_for_selector('.group.relative.rounded-xl')

    # Take a screenshot to verify the UI changes
    page.screenshot(path="jules-scratch/verification/verification.png")

    browser.close()

with sync_playwright() as playwright:
    run(playwright)
