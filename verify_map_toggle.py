import asyncio
from playwright.async_api import async_playwright, expect

async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch()
        page = await browser.new_page()

        try:
            print("Navigating to http://localhost:3003...")
            await page.goto("http://localhost:3003/")
            print("Page loaded.")

            await page.screenshot(path="screenshot_before_click.png")
            print("Screenshot taken before click.")

            print("Waiting for 'View Users' button...")
            view_users_button = page.locator('text="View Users"')
            await expect(view_users_button).to_be_visible(timeout=30000)
            print("'View Users' button is visible.")

            print("Clicking 'View Users' button...")
            await view_users_button.click()
            print("Clicked 'View Users' button.")

            print("Waiting for 'All Users' modal heading...")
            await expect(page.locator('h2:has-text("All Users")')).to_be_visible(timeout=30000)
            print("'All Users' modal is visible.")

            await page.screenshot(path="screenshot_after_click.png")
            print("Screenshot taken after click.")

        except Exception as e:
            print(f"An error occurred: {e}")
            await page.screenshot(path="screenshot_error.png")
        finally:
            await browser.close()

asyncio.run(main())
