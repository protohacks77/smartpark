from playwright.sync_api import sync_playwright

def run(playwright):
    browser = playwright.chromium.launch(headless=True)
    context = browser.new_context()
    page = context.new_page()

    page.goto("http://localhost:3000/")

    page.locator('button:has-text("Login as Admin")').click()

    page.locator('input[placeholder="admin@smartpark.com"]').fill("admin@gmail.com")
    page.locator('input[placeholder="••••••••"]').fill("password")

    page.locator('button:has-text("Login")').click()

    # Wait for the dashboard to load by looking for its header
    page.wait_for_selector('h1:has-text("Admin Dashboard")')

    page.locator('button:has-text("Add New User")').click()

    # Wait for the modal to appear
    page.wait_for_selector('h2:has-text("Add New User")')

    page.screenshot(path="jules-scratch/verification/add_user_modal.png")

    browser.close()

with sync_playwright() as playwright:
    run(playwright)
