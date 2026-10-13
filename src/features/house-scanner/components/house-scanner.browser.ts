import { expect, test } from '@playwright/test';

test.beforeEach(async ({ context, page }) => {
  await context.route('**/*', async (route) => {
    const url = new URL(route.request().url());
    if (['localhost', '127.0.0.1'].includes(url.hostname))
      await route.continue();
    else await route.abort('blockedbyclient');
  });
  await page.goto('/projects/house-scanner');
  await expect(
    page.getByRole('heading', { name: 'House Scanner', exact: true }),
  ).toBeVisible();
});

async function openDemo(page: import('@playwright/test').Page) {
  await page
    .getByRole('button', { name: 'Explore the synthetic demo' })
    .click();
  await expect(
    page.getByText('4 homes · 2 list only', { exact: false }),
  ).toBeVisible();
}

test('private access is closed by default and demo state leaves no browser storage', async ({
  page,
}) => {
  await expect(page.getByRole('article')).toHaveCount(0);
  const requests: string[] = [];
  page.on('request', (request) => requests.push(request.url()));
  await openDemo(page);
  await page
    .getByRole('article', { name: 'Example balcony home', exact: true })
    .getByRole('button', { name: 'Save favorite', exact: true })
    .click();
  await expect(
    page.getByText('Favorite saved.', { exact: true }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Leave demo' }).click();
  await expect(page.getByRole('article')).toHaveCount(0);
  await openDemo(page);
  await expect(
    page
      .getByRole('article', { name: 'Example balcony home', exact: true })
      .getByText('Saved by: Demo Morgan', { exact: true }),
  ).toBeVisible();
  expect(
    await page.evaluate(() => ({
      local: Object.keys(localStorage),
      session: Object.keys(sessionStorage),
    })),
  ).toEqual({ local: [], session: [] });
  expect(
    requests.filter(
      (url) => !new URL(url).hostname.match(/^(localhost|127\.0\.0\.1)$/),
    ),
  ).toEqual([]);
  await page.screenshot({
    path: `.browser-test-results/shortlist-${test.info().project.name}.png`,
    fullPage: true,
  });
});

test('favorites preserve the other member save and filters identify the saver', async ({
  page,
}) => {
  await openDemo(page);
  const home = page.getByRole('article', {
    name: 'Example balcony home',
    exact: true,
  });
  await home
    .getByRole('button', { name: 'Save favorite', exact: true })
    .click();
  await expect(
    home.getByText('Saved by: Demo Morgan, Demo Alex', { exact: true }),
  ).toBeVisible();
  await home.getByRole('button', { name: 'Remove my favorite' }).click();
  await expect(
    home.getByText('Saved by: Demo Morgan', { exact: true }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Favorites', exact: true }).click();
  await expect(page.getByRole('article')).toHaveCount(1);
  await page.getByRole('combobox', { name: 'Saved by' }).click();
  await page.getByRole('option', { name: 'Mine', exact: true }).click();
  await expect(page.getByRole('article')).toHaveCount(0);
  await expect(
    page.getByText('No homes in this view.', { exact: false }),
  ).toBeVisible();
  await page.getByRole('combobox', { name: 'Saved by' }).click();
  await page.getByRole('option', { name: 'Demo Morgan', exact: true }).click();
  await expect(page.getByRole('article')).toHaveCount(1);
});

test('manual links are normalized without fetching and duplicates open the existing home', async ({
  page,
}) => {
  await openDemo(page);
  const requests: string[] = [];
  page.on('request', (request) => requests.push(request.url()));
  await page.getByRole('button', { name: 'Add link', exact: true }).click();
  await page
    .getByRole('textbox', { name: 'Listing link' })
    .fill(
      'https://example.invalid/private-home?id=42&utm_source=test#identity',
    );
  await page
    .getByRole('textbox', { name: 'Title (optional)', exact: true })
    .fill('Local manual bookmark');
  await page
    .getByRole('textbox', { name: 'Shared note (optional)' })
    .fill('Synthetic household note');
  await page
    .getByRole('button', { name: 'Add link', exact: true })
    .last()
    .click();
  await expect(page.getByText('Link added.', { exact: false })).toBeVisible();
  await page
    .getByRole('textbox', { name: 'Listing link' })
    .fill(
      'https://example.invalid/private-home?id=42&utm_source=second#identity',
    );
  await page
    .getByRole('button', { name: 'Add link', exact: true })
    .last()
    .click();
  await expect(
    page.getByText('This link already exists.', { exact: false }),
  ).toBeVisible();
  const manual = page.getByRole('article', {
    name: 'Local manual bookmark',
    exact: true,
  });
  await expect(
    manual.getByRole('link', { name: 'Open original listing' }),
  ).toHaveAttribute(
    'href',
    'https://example.invalid/private-home?id=42#identity',
  );
  await expect(
    manual.getByRole('link', { name: 'Open original listing' }),
  ).toHaveAttribute('rel', 'noopener noreferrer');
  await expect(
    manual
      .getByRole('list', { name: 'Household notes' })
      .getByText('Synthetic household note', { exact: false }),
  ).toBeVisible();
  await expect(
    manual
      .getByRole('list', { name: 'Household notes' })
      .getByText('You (Demo Alex) · edited', { exact: false }),
  ).toBeVisible();
  expect(
    requests.some((url) => new URL(url).hostname === 'example.invalid'),
  ).toBe(false);
  await page.getByRole('button', { name: 'Favorites', exact: true }).click();
  await expect(
    page.getByRole('article', { name: 'Local manual bookmark', exact: true }),
  ).toHaveCount(0);
});

test('criteria revisions re-evaluate suggestions and keep favorites', async ({
  page,
}) => {
  await openDemo(page);
  await page.getByRole('button', { name: 'Settings and status' }).click();
  await page
    .getByRole('textbox', { name: 'Preferred budget (SEK)' })
    .fill('1000000');
  await page
    .getByRole('textbox', { name: 'Stretch budget (SEK)' })
    .fill('1500000');
  await page.getByRole('button', { name: 'Save criteria' }).click();
  await expect(page.getByText('Revision 2', { exact: false })).toBeVisible();
  await page.getByRole('button', { name: 'Suggestions', exact: true }).click();
  await expect(page.getByRole('article')).toHaveCount(1);
  await expect(
    page.getByRole('article', {
      name: 'Example home needing details',
      exact: true,
    }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Favorites', exact: true }).click();
  await expect(
    page.getByRole('article', { name: 'Example balcony home', exact: true }),
  ).toBeVisible();
});

test('map is opt-in and a failed tile request leaves details and list controls usable', async ({
  page,
}) => {
  await openDemo(page);
  const external: string[] = [];
  page.on('request', (request) => {
    if (new URL(request.url()).hostname !== 'localhost')
      external.push(request.url());
  });
  expect(external).toEqual([]);
  await page.getByRole('button', { name: 'Open map', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText(/map|Map/);
  await expect(
    page.getByText('2 homes with usable positions.', { exact: false }),
  ).toBeVisible();
  expect(
    external.every(
      (url) => url === 'https://tiles.openfreemap.org/styles/liberty',
    ),
  ).toBe(true);
  await page.getByRole('button', { name: 'Use list only' }).click();
  await expect(page.getByRole('article')).toHaveCount(4);
  await page
    .getByRole('article', { name: 'Example terrace home', exact: true })
    .getByRole('button', { name: 'Details', exact: true })
    .click();
  await expect(
    page.getByText('Approximate area; no exact pin is shown.', { exact: true }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
});

test('a locally served map style groups overlapping homes and keeps map selection synchronized', async ({
  page,
}) => {
  await page.route(
    'https://tiles.openfreemap.org/styles/liberty',
    async (route) =>
      route.fulfill({
        json: {
          version: 8,
          sources: {},
          layers: [
            {
              id: 'background',
              type: 'background',
              paint: { 'background-color': '#e8e6df' },
            },
          ],
        },
      }),
  );
  await openDemo(page);
  await page.getByRole('button', { name: 'Open map', exact: true }).click();
  await page
    .getByRole('button', { name: '2 homes at this point', exact: true })
    .click();
  await expect(page.getByLabel('Homes at selected point')).toBeVisible();
  await page.getByRole('button', { name: 'Home 2', exact: true }).click();
  await expect(
    page
      .getByRole('article', { name: 'Example detached home', exact: true })
      .last()
      .getByText('Facts and source evidence', { exact: true }),
  ).toBeVisible();
  await page.screenshot({
    path: `.browser-test-results/map-${test.info().project.name}.png`,
    fullPage: true,
  });
});

test('shared notes show every member and the signed-in member edits only their own, by keyboard', async ({
  page,
}) => {
  await openDemo(page);
  const home = page.getByRole('article', {
    name: 'Example balcony home',
    exact: true,
  });
  await home.getByRole('button', { name: 'Details', exact: true }).focus();
  await page.keyboard.press('Enter');
  const notes = home.getByRole('list', { name: 'Household notes' });
  await expect(notes.getByRole('listitem')).toHaveCount(1);
  await expect(notes).toContainText('Demo Morgan · edited');
  await expect(notes).toContainText('the balcony faces a courtyard');
  await expect(notes).not.toContainText('You (Demo Alex)');

  const editor = home.getByRole('textbox', { name: 'Your shared note' });
  const save = home.getByRole('button', { name: 'Save note', exact: true });
  await expect(save).toBeDisabled();
  await editor.focus();
  await page.keyboard.type('Our first visit is Saturday.');
  await expect(save).toBeEnabled();
  await page.keyboard.press('Tab');
  await expect(save).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(home.getByText('Note saved.', { exact: true })).toBeVisible();
  await expect(notes.getByRole('listitem')).toHaveCount(2);
  await expect(notes).toContainText('You (Demo Alex) · edited');
  await expect(notes).toContainText('Our first visit is Saturday.');
  await expect(save).toBeDisabled();

  await editor.focus();
  await page.keyboard.press('Control+A');
  await page.keyboard.type('Moved the visit to Sunday.');
  await page.keyboard.press('Tab');
  await page.keyboard.press('Enter');
  await expect(notes).toContainText('Moved the visit to Sunday.');
  await expect(notes).not.toContainText('Our first visit is Saturday.');
  await expect(notes.getByRole('listitem')).toHaveCount(2);
  await expect(notes).toContainText('the balcony faces a courtyard');

  await page.getByRole('button', { name: 'Leave demo' }).click();
  await openDemo(page);
  await home.getByRole('button', { name: 'Details', exact: true }).click();
  await expect(notes.getByRole('listitem')).toHaveCount(1);
  await expect(notes).not.toContainText('Moved the visit to Sunday.');
});
