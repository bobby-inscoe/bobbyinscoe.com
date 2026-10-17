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
    page.getByText('5 homes · 3 not located', { exact: false }),
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
      .getByText('Saved by Demo Morgan', { exact: true }),
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
    home.getByText('Saved by Demo Morgan, Demo Alex', { exact: true }),
  ).toBeVisible();
  await home.getByRole('button', { name: 'Remove my favorite' }).click();
  await expect(
    home.getByText('Saved by Demo Morgan', { exact: true }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Favorites', exact: true }).click();
  await expect(page.getByRole('article')).toHaveCount(2);
  await page.getByRole('combobox', { name: 'Saved by' }).click();
  await page.getByRole('option', { name: 'Mine', exact: true }).click();
  await expect(page.getByRole('article')).toHaveCount(1);
  await expect(
    page.getByRole('article', { name: 'Example older listing', exact: true }),
  ).toBeVisible();
  await page.getByRole('combobox', { name: 'Saved by' }).click();
  await page.getByRole('option', { name: 'Demo Morgan', exact: true }).click();
  await expect(page.getByRole('article')).toHaveCount(1);
  await expect(home).toBeVisible();
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
  await page.getByRole('button', { name: 'Settings' }).click();
  await page
    .getByRole('textbox', { name: 'Preferred budget (SEK)' })
    .fill('1000000');
  await page
    .getByRole('textbox', { name: 'Stretch budget (SEK)' })
    .fill('1500000');
  await page.getByRole('button', { name: 'Save criteria' }).click();
  await expect(page.getByText('Revision 2', { exact: false })).toBeVisible();
  await page.getByRole('button', { name: 'Listings', exact: true }).click();
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
  await page.getByRole('button', { name: 'Map', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText(/map|Map/);
  expect(
    external.every(
      (url) =>
        url === 'https://tiles.openfreemap.org/styles/liberty' ||
        url.startsWith('https://server.arcgisonline.com/'),
    ),
  ).toBe(true);
  await page.getByRole('button', { name: 'List', exact: true }).click();
  await expect(page.getByRole('article')).toHaveCount(5);
  await page
    .getByRole('article', { name: 'Example terrace home', exact: true })
    .getByRole('button', { name: 'Details', exact: true })
    .click();
  await expect(
    page
      .getByRole('dialog', { name: 'Example terrace home', exact: true })
      .getByText('Approximate area; no exact pin is shown.', { exact: true }),
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
  await routeImagery(page);
  await openDemo(page);
  await page.getByRole('button', { name: 'Map', exact: true }).click();
  await page
    .getByRole('button', { name: '2 homes at this point', exact: true })
    .click();
  await expect(page.getByLabel('Homes at selected point')).toBeVisible();
  await page.getByRole('button', { name: 'Home 2', exact: true }).click();
  const pinCard = page.getByRole('article', {
    name: 'Selected home: Example detached home',
    exact: true,
  });
  await expect(pinCard).toBeVisible();
  await expect(
    pinCard.getByRole('link', { name: 'Open original listing' }),
  ).toHaveAttribute('target', '_blank');
  await pinCard.getByRole('button', { name: 'Details', exact: true }).click();
  await expect(
    page
      .getByRole('dialog', { name: 'Example detached home', exact: true })
      .getByText('Facts and source evidence', { exact: true }),
  ).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.getByLabel('Listing map')).toBeVisible();
  await page.getByRole('button', { name: 'Close selected home' }).click();
  await expect(pinCard).toHaveCount(0);
  await page.screenshot({
    path: `.browser-test-results/map-${test.info().project.name}.png`,
    fullPage: true,
  });
});

const LOCAL_STREET_STYLE = {
  version: 8,
  sources: {},
  layers: [
    {
      id: 'background',
      type: 'background',
      paint: { 'background-color': '#e8e6df' },
    },
  ],
};
const PIXEL_PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
  'base64',
);

async function routeImagery(page: import('@playwright/test').Page) {
  const imagery: string[] = [];
  await page.route('https://server.arcgisonline.com/**', (route) => {
    imagery.push(route.request().url());
    return route.fulfill({ body: PIXEL_PNG, contentType: 'image/png' });
  });
  return imagery;
}

test('personal filters change the list and the map together, and Clear restores them', async ({
  page,
}) => {
  await page.route('https://tiles.openfreemap.org/styles/liberty', (route) =>
    route.fulfill({ json: LOCAL_STREET_STYLE }),
  );
  await routeImagery(page);
  await openDemo(page);
  await expect(page.getByLabel('Min living area (m²)')).toBeHidden();
  const filtersToggle = page.getByRole('button', {
    name: 'Filters',
    exact: true,
  });
  await expect(filtersToggle).toHaveAttribute('aria-expanded', 'false');
  await filtersToggle.click();
  await expect(filtersToggle).toHaveAttribute('aria-expanded', 'true');
  await expect(filtersToggle).toHaveAttribute(
    'aria-controls',
    'listing-filters',
  );
  await page.getByRole('textbox', { name: 'Min living area (m²)' }).fill('90');
  await expect(page.getByText('1 homes', { exact: false })).toBeVisible();
  await expect(page.getByText('Showing 1 of 5 homes')).toBeVisible();
  await expect(page.getByText('1 active')).toBeVisible();
  await expect(page.getByRole('article')).toHaveCount(1);
  await page.getByRole('button', { name: 'Map', exact: true }).click();
  await expect(
    page.getByRole('button', { name: /Example detached home/ }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Clear filters' }).click();
  await expect(page.getByText('Showing 5 of 5 homes')).toBeVisible();
  await page.getByRole('button', { name: 'List', exact: true }).click();
  await expect(page.getByRole('article')).toHaveCount(5);
  await expect(
    page.getByText('5 homes · 3 not located', { exact: false }),
  ).toBeVisible();
});

test('Lift only and Glazed only narrow the list and count as active filters', async ({
  page,
}) => {
  await openDemo(page);
  await page.getByRole('button', { name: 'Filters', exact: true }).click();
  await page.getByRole('checkbox', { name: 'Lift only' }).check();
  await expect(page.getByText('2 active')).toHaveCount(0);
  await expect(page.getByText('1 active')).toBeVisible();
  const lifted = await page.getByRole('article').count();
  expect(lifted).toBeLessThan(5);
  await page.getByRole('checkbox', { name: 'Glazed only' }).check();
  await expect(page.getByText('2 active')).toBeVisible();
  expect(await page.getByRole('article').count()).toBeLessThanOrEqual(lifted);
  await page.getByRole('button', { name: 'Clear filters' }).click();
  await expect(page.getByRole('article')).toHaveCount(5);
  await expect(
    page
      .getByRole('article', { name: 'Example balcony home', exact: true })
      .getByText('Balcony', { exact: true }),
  ).toBeVisible();
});

test('unknown prices are kept or hidden by the checkbox, and an empty result says filters are active', async ({
  page,
}) => {
  await openDemo(page);
  await page.getByRole('button', { name: 'Filters', exact: true }).click();
  await page.getByRole('textbox', { name: 'Max price (MSEK)' }).fill('3');
  await expect(page.getByRole('article')).toHaveCount(4);
  await page
    .getByRole('checkbox', {
      name: 'Keep homes with unknown or disputed values',
    })
    .uncheck();
  await expect(page.getByRole('article')).toHaveCount(3);
  await page.getByRole('textbox', { name: 'Max price (MSEK)' }).fill('1');
  await expect(page.getByRole('article')).toHaveCount(0);
  await expect(
    page.getByText('Clear the filters', { exact: false }),
  ).toBeVisible();
});

test('the satellite toggle swaps the basemap, names the provider and keeps the markers', async ({
  page,
}) => {
  await page.route('https://tiles.openfreemap.org/styles/liberty', (route) =>
    route.fulfill({ json: LOCAL_STREET_STYLE }),
  );
  const imagery = await routeImagery(page);
  await openDemo(page);
  await page.getByRole('button', { name: 'Map', exact: true }).click();
  const marker = page.getByRole('button', {
    name: '2 homes at this point',
    exact: true,
  });
  await expect(marker).toBeVisible();
  const satellite = page.getByRole('button', {
    name: 'Satellite',
    exact: true,
  });
  await expect(satellite).toHaveAttribute('aria-pressed', 'true');
  await expect(
    page.getByText('Imagery © Esri, Maxar, Earthstar Geographics'),
  ).toBeVisible();
  await expect(
    page.getByText('Map tiles come from Esri', { exact: false }),
  ).toBeVisible();
  await expect.poll(() => imagery.length).toBeGreaterThan(0);
  // Relative to the map, so a scroll change from the toggle click does not count.
  const offset = () =>
    marker.evaluate((element) => {
      const a = element.getBoundingClientRect();
      const b = element
        .closest('[aria-label="Listing map"]')
        ?.getBoundingClientRect();
      return [a.x - (b?.x ?? 0), a.y - (b?.y ?? 0)];
    });
  const before = await offset();
  await page.getByRole('button', { name: 'Street map' }).click();
  await expect(
    page.getByRole('button', { name: 'Street map' }),
  ).toHaveAttribute('aria-pressed', 'true');
  await expect(
    page.getByText('Map tiles come from OpenFreeMap', { exact: false }),
  ).toBeVisible();
  await expect(marker).toBeVisible();
  expect(await offset()).toEqual(before);
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
  const dialog = page.getByRole('dialog', {
    name: 'Example balcony home',
    exact: true,
  });
  await expect(dialog).toBeVisible();
  const notes = dialog.getByRole('list', { name: 'Household notes' });
  await expect(notes.getByRole('listitem')).toHaveCount(1);
  await expect(notes).toContainText('Demo Morgan · edited');
  await expect(notes).toContainText('the balcony faces a courtyard');
  await expect(notes).not.toContainText('You (Demo Alex)');

  const editor = dialog.getByRole('textbox', { name: 'Your shared note' });
  const save = dialog.getByRole('button', { name: 'Save note', exact: true });
  await expect(save).toBeDisabled();
  await editor.focus();
  await page.keyboard.type('Our first visit is Saturday.');
  await expect(save).toBeEnabled();
  await page.keyboard.press('Tab');
  await expect(save).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(dialog.getByText('Note saved.', { exact: true })).toBeVisible();
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

  // The open dialog covers the page, so close it before leaving the demo.
  await page.keyboard.press('Escape');
  await expect(dialog).toHaveCount(0);
  await page.getByRole('button', { name: 'Leave demo' }).click();
  await openDemo(page);
  await home.getByRole('button', { name: 'Details', exact: true }).click();
  await expect(notes.getByRole('listitem')).toHaveCount(1);
  await expect(notes).not.toContainText('Moved the visit to Sunday.');
});

test('Details opens a dialog named for the home without reflowing the grid, and Escape returns focus to Details', async ({
  page,
}) => {
  await openDemo(page);
  const home = page.getByRole('article', {
    name: 'Example balcony home',
    exact: true,
  });
  const details = home.getByRole('button', { name: 'Details', exact: true });
  // Page coordinates, so a scroll caused by the dialog does not count as movement.
  const boxes = () =>
    page.getByRole('article').evaluateAll((cards) =>
      cards.map((card) => {
        const { x, y, width, height } = card.getBoundingClientRect();
        return [x + scrollX, y + scrollY, width, height];
      }),
    );
  const before = await boxes();
  await details.click();
  const dialog = page.getByRole('dialog', {
    name: 'Example balcony home',
    exact: true,
  });
  await expect(dialog).toBeVisible();
  await expect(page.getByRole('dialog')).toHaveCount(1);
  await expect(
    dialog.getByText('Facts and source evidence', { exact: true }),
  ).toBeVisible();
  // The card keeps its place, so the grid does not jump.
  expect(await boxes()).toEqual(before);
  const viewport = page.viewportSize();
  if (!viewport) throw new Error('Missing viewport.');
  // The sheet slides in, so poll until it has settled against its edge.
  if (viewport.width > 768)
    await expect
      .poll(async () => {
        const box = await dialog.boundingBox();
        return box ? Math.round(box.x + box.width) : 0;
      })
      .toBe(viewport.width);
  else
    await expect
      .poll(async () => {
        const box = await dialog.boundingBox();
        return box ? Math.round(box.y + box.height) : 0;
      })
      .toBe(viewport.height);
  const box = await dialog.boundingBox();
  if (!box) throw new Error('Missing box.');
  if (viewport.width > 768) expect(box.width).toBeLessThan(viewport.width / 2);
  else {
    expect(Math.round(box.width)).toBe(viewport.width);
    expect(box.y).toBeGreaterThan(0);
  }
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(details).toBeFocused();
  expect(await boxes()).toEqual(before);
  // Closing keeps the selection outline on the card.
  expect(
    await home.evaluate((card) => getComputedStyle(card).outlineStyle),
  ).toBe('solid');
});

test('only one details dialog exists and the notes follow the selected home', async ({
  page,
}) => {
  await openDemo(page);
  const open = async (name: string) =>
    page
      .getByRole('article', { name, exact: true })
      .getByRole('button', { name: 'Details', exact: true })
      .click();
  await open('Example balcony home');
  await expect(page.getByRole('dialog')).toHaveCount(1);
  await expect(page.getByRole('dialog')).toContainText(
    'the balcony faces a courtyard',
  );
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await open('Example terrace home');
  const dialog = page.getByRole('dialog', {
    name: 'Example terrace home',
    exact: true,
  });
  await expect(page.getByRole('dialog')).toHaveCount(1);
  await expect(dialog).toContainText('the terrace is large');
  await expect(dialog).not.toContainText('the balcony faces a courtyard');
});

test('on a touch screen every button in the details dialog is at least 44 px tall', async ({
  page,
}) => {
  test.skip(test.info().project.name !== 'narrow');
  await openDemo(page);
  await page
    .getByRole('article', { name: 'Example balcony home', exact: true })
    .getByRole('button', { name: 'Details', exact: true })
    .click();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  const small = await dialog
    .locator('button:visible, a[role="button"]:visible')
    .evaluateAll((buttons) =>
      buttons
        .map((button) => ({
          name: button.textContent || button.getAttribute('aria-label'),
          height: Math.round(button.getBoundingClientRect().height),
        }))
        .filter(({ height }) => height < 44),
    );
  expect(small).toEqual([]);
});

test('See on map in the dialog closes it, keeps the selection and shows the map', async ({
  page,
}) => {
  await page.route('https://tiles.openfreemap.org/styles/liberty', (route) =>
    route.fulfill({ json: LOCAL_STREET_STYLE }),
  );
  await routeImagery(page);
  await openDemo(page);
  await page
    .getByRole('article', { name: 'Example detached home', exact: true })
    .getByRole('button', { name: 'Details', exact: true })
    .click();
  const dialog = page.getByRole('dialog', {
    name: 'Example detached home',
    exact: true,
  });
  await dialog.getByRole('button', { name: 'See on map', exact: true }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(
    page.getByRole('article', {
      name: 'Selected home: Example detached home',
      exact: true,
    }),
  ).toBeVisible();
  await expect(page.getByLabel('Listing map')).toBeVisible();
});

test('the pin card Details opens the dialog over the map without switching to the list', async ({
  page,
}) => {
  await seeDetachedHomeOnMap(page);
  const pinCard = page.getByRole('article', {
    name: 'Selected home: Example detached home',
    exact: true,
  });
  const pinDetails = pinCard.getByRole('button', {
    name: 'Details',
    exact: true,
  });
  await pinDetails.click();
  const dialog = page.getByRole('dialog', {
    name: 'Example detached home',
    exact: true,
  });
  await expect(dialog).toBeVisible();
  await expect(page.getByLabel('Listing map')).toBeVisible();
  // The map's own overlays (pin card, basemap toggle) must sit under the dialog.
  const covered = (locator: typeof dialog) =>
    locator.evaluate((element) => {
      const { x, y, width, height } = element.getBoundingClientRect();
      const top = document.elementFromPoint(x + width / 2, y + height / 2);
      return !element.contains(top);
    });
  expect(await covered(pinCard)).toBe(true);
  expect(await covered(page.getByRole('group', { name: 'Basemap' }))).toBe(
    true,
  );
  await expect(
    page.getByRole('article', { name: 'Example balcony home' }),
  ).toHaveCount(0);
  await expect(
    page.getByRole('button', { name: 'Map', exact: true }),
  ).toHaveAttribute('aria-pressed', 'true');
  await page.keyboard.press('Escape');
  await expect(dialog).toHaveCount(0);
  await expect(pinDetails).toBeFocused();
  await expect(page.getByLabel('Listing map')).toBeVisible();
});

test('a saved listing missing from the latest scan shows a notice and can be unfavorited by keyboard', async ({
  page,
}) => {
  await openDemo(page);
  const home = page.getByRole('article', {
    name: 'Example older listing',
    exact: true,
  });
  await expect(home.getByText('Not in latest scan')).toBeVisible();
  await expect(home.getByRole('note')).toHaveCount(0);
  await home.getByRole('button', { name: 'Details', exact: true }).focus();
  await page.keyboard.press('Enter');
  const dialog = page.getByRole('dialog', {
    name: 'Example older listing',
    exact: true,
  });
  const notice = dialog.getByRole('note', {
    name: 'Not seen in the latest scan',
  });
  await expect(notice).toBeVisible();
  await expect(notice).toContainText('Not seen in the latest scan. Last seen');
  await expect(notice).toContainText('open it to check');
  await page.keyboard.press('Escape');
  await expect(dialog).toHaveCount(0);
  await expect(
    home.getByText('Saved by Demo Alex', { exact: true }),
  ).toBeVisible();
  const remove = home.getByRole('button', { name: 'Remove my favorite' });
  await remove.focus();
  await page.keyboard.press('Enter');
  await expect(
    page.getByText('Your favorite was removed.', { exact: false }),
  ).toBeVisible();
  await expect(home.getByText(/^Saved by/)).toHaveCount(0);
  await expect(
    home.getByRole('button', { name: 'Save favorite', exact: true }),
  ).toBeVisible();
});

test('See on map opens that home on the map, and unlocated homes share one marker', async ({
  page,
}) => {
  await page.route('https://tiles.openfreemap.org/styles/liberty', (route) =>
    route.fulfill({ json: LOCAL_STREET_STYLE }),
  );
  await routeImagery(page);
  await openDemo(page);
  const home = page.getByRole('article', {
    name: 'Example detached home',
    exact: true,
  });
  await home.getByRole('button', { name: 'See on map', exact: true }).click();
  await expect(
    page.getByRole('article', {
      name: 'Selected home: Example detached home',
      exact: true,
    }),
  ).toBeVisible();
  await expect(
    page.getByRole('button', {
      name: '3 homes with no known position',
      exact: true,
    }),
  ).toBeVisible();
});

test('pressing a map marker keeps keyboard focus on it and marks it pressed', async ({
  page,
}) => {
  await page.route('https://tiles.openfreemap.org/styles/liberty', (route) =>
    route.fulfill({ json: LOCAL_STREET_STYLE }),
  );
  await routeImagery(page);
  await openDemo(page);
  await page.getByRole('button', { name: 'Filters', exact: true }).click();
  await page.getByRole('textbox', { name: 'Min living area (m²)' }).fill('90');
  await page.getByRole('button', { name: 'Map', exact: true }).click();
  const marker = page.getByRole('button', { name: /^Example detached home:/ });
  await expect(marker).toHaveAttribute('aria-pressed', 'false');
  const restingColor = await marker.evaluate(
    (element) => getComputedStyle(element).backgroundColor,
  );
  await marker.focus();
  await page.keyboard.press('Enter');
  await expect(
    page.getByRole('article', {
      name: 'Selected home: Example detached home',
      exact: true,
    }),
  ).toBeVisible();
  await expect(marker).toBeFocused();
  await expect(marker).toHaveAttribute('aria-pressed', 'true');
  // The selected pin is filled with the accent so it stands out from the rest.
  await expect(marker).toHaveCSS(
    'background-color',
    await page.evaluate(() => {
      const probe = document.createElement('span');
      probe.style.color = 'var(--mantine-color-moss-7)';
      document.body.append(probe);
      const color = getComputedStyle(probe).color;
      probe.remove();
      return color;
    }),
  );
  expect(restingColor).not.toBe(
    await marker.evaluate(
      (element) => getComputedStyle(element).backgroundColor,
    ),
  );
});

async function seeDetachedHomeOnMap(page: import('@playwright/test').Page) {
  await page.route('https://tiles.openfreemap.org/styles/liberty', (route) =>
    route.fulfill({ json: LOCAL_STREET_STYLE }),
  );
  await routeImagery(page);
  await openDemo(page);
  await page
    .getByRole('article', { name: 'Example detached home', exact: true })
    .getByRole('button', { name: 'See on map', exact: true })
    .click();
  await expect(
    page.getByRole('article', {
      name: 'Selected home: Example detached home',
      exact: true,
    }),
  ).toBeVisible();
}

// A point on the bare map: the canvas, not a marker, control or the card.
async function bareMapPoint(page: import('@playwright/test').Page) {
  return page.evaluate(() => {
    const box = document.querySelector('canvas')?.getBoundingClientRect();
    if (!box) throw new Error('No map canvas');
    for (let y = box.top + 20; y < box.bottom; y += 20)
      for (let x = box.left + 20; x < box.right; x += 20)
        if (document.elementFromPoint(x, y)?.tagName === 'CANVAS')
          return { x, y };
    throw new Error('No bare map point');
  });
}

test('a click or tap on the bare map closes the selected home; markers, drags, the card and other keys do not', async ({
  page,
}) => {
  await seeDetachedHomeOnMap(page);
  const card = page.getByRole('article', { name: /^Selected home:/ });
  const point = await bareMapPoint(page);
  // A marker click stays a selection, so the map click it also raises must be ignored.
  await page
    .getByLabel('Listing map')
    .locator('button[aria-pressed="true"]')
    .click();
  await expect(card).toBeVisible();
  await card.getByRole('heading').click();
  await expect(card).toBeVisible();
  await page.mouse.move(point.x, point.y);
  await page.mouse.down();
  await page.mouse.move(point.x + 30, point.y + 10, { steps: 5 });
  await page.mouse.up();
  await expect(card).toBeVisible();
  await page.getByRole('button', { name: 'Map', exact: true }).focus();
  await page.keyboard.press('Escape');
  await expect(card).toBeVisible();
  const bare = await bareMapPoint(page);
  if (test.info().project.name === 'narrow')
    await page.touchscreen.tap(bare.x, bare.y);
  else await page.mouse.click(bare.x, bare.y);
  await expect(card).toHaveCount(0);
});

test('Escape in the map area closes the selected home', async ({ page }) => {
  await seeDetachedHomeOnMap(page);
  await page
    .getByLabel('Listing map')
    .locator('button[aria-pressed="true"]')
    .focus();
  await page.keyboard.press('Escape');
  await expect(
    page.getByRole('article', { name: /^Selected home:/ }),
  ).toHaveCount(0);
});

test('opening the map on a located home keeps the not-located marker inside the map', async ({
  page,
}) => {
  test.skip(test.info().project.name !== 'desktop');
  await seeDetachedHomeOnMap(page);
  const unlocated = page.getByRole('button', {
    name: '3 homes with no known position',
    exact: true,
  });
  await expect(unlocated).toBeVisible();
  await expect
    .poll(async () => {
      const mapBox = await page.getByLabel('Listing map').boundingBox();
      const box = await unlocated.boundingBox();
      if (!box || !mapBox) return false;
      return (
        box.x >= mapBox.x &&
        box.y >= mapBox.y &&
        box.x + box.width <= mapBox.x + mapBox.width &&
        box.y + box.height <= mapBox.y + mapBox.height
      );
    })
    .toBe(true);
});

test('on a phone the selected home card does not cover the selected pin', async ({
  page,
}) => {
  test.skip(test.info().project.name !== 'narrow');
  await seeDetachedHomeOnMap(page);
  const pin = page
    .getByLabel('Listing map')
    .locator('button[aria-pressed="true"]');
  const card = page.getByRole('article', {
    name: 'Selected home: Example detached home',
    exact: true,
  });
  await expect(pin).toBeVisible();
  await expect
    .poll(async () => {
      const [pinBox, cardBox] = await Promise.all([
        pin.boundingBox(),
        card.boundingBox(),
      ]);
      if (!pinBox || !cardBox) return true;
      return !(
        pinBox.x < cardBox.x + cardBox.width &&
        pinBox.x + pinBox.width > cardBox.x &&
        pinBox.y < cardBox.y + cardBox.height &&
        pinBox.y + pinBox.height > cardBox.y
      );
    })
    .toBe(true);
});

test('the synthetic demo status line is not drawn in the stale warning color', async ({
  page,
}) => {
  await openDemo(page);
  const status = page.getByText('Synthetic demo. Fictional homes and people', {
    exact: false,
  });
  const colors = await status.evaluate((element) => {
    const probe = document.createElement('span');
    probe.style.color = 'var(--mantine-color-red-8)';
    element.append(probe);
    const red = getComputedStyle(probe).color;
    probe.remove();
    return { status: getComputedStyle(element).color, red };
  });
  expect(colors.red).not.toBe('');
  expect(colors.status).not.toBe(colors.red);
});

test('on a touch screen every button in the Listings view is at least 44 px tall', async ({
  page,
}) => {
  test.skip(test.info().project.name !== 'narrow');
  expect(
    await page.evaluate(() => matchMedia('(pointer: coarse)').matches),
  ).toBe(true);
  await openDemo(page);
  const small = await page
    .locator('button:visible, a[role="button"]:visible')
    .evaluateAll((buttons) =>
      buttons
        .map((button) => ({
          name: button.textContent || button.getAttribute('aria-label'),
          height: Math.round(button.getBoundingClientRect().height),
        }))
        .filter(({ height }) => height < 44),
    );
  expect(small).toEqual([]);
  const narrowIcons = await page
    .locator(
      '.mantine-ActionIcon-root:visible, .mantine-CloseButton-root:visible',
    )
    .evaluateAll((icons) =>
      icons
        .map((icon) => ({
          name: icon.textContent || icon.getAttribute('aria-label'),
          width: Math.round(icon.getBoundingClientRect().width),
        }))
        .filter(({ width }) => width < 44),
    );
  expect(narrowIcons).toEqual([]);
});

test('the tab buttons stay on one row and the view heading is only for screen readers', async ({
  page,
}) => {
  await openDemo(page);
  const tabs = page.getByRole('navigation', { name: 'Shortlist sections' });
  const tops = await tabs
    .getByRole('button')
    .evaluateAll((buttons) =>
      buttons.map((button) => Math.round(button.getBoundingClientRect().top)),
    );
  expect(tops).toHaveLength(4);
  expect(new Set(tops).size).toBe(1);
  const heading = page.getByRole('heading', { name: 'Listings', level: 2 });
  await expect(heading).toHaveCount(1);
  const box = await heading.boundingBox();
  expect(box?.width).toBeLessThanOrEqual(1);
  expect(box?.height).toBeLessThanOrEqual(1);
  await page.getByRole('button', { name: 'Favorites', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: 'Favorites', level: 2 }),
  ).toHaveCount(1);
});

test('the basemap toggle sits in the map corner, clear of the map navigation controls', async ({
  page,
}) => {
  await page.route('https://tiles.openfreemap.org/styles/liberty', (route) =>
    route.fulfill({ json: LOCAL_STREET_STYLE }),
  );
  await routeImagery(page);
  await openDemo(page);
  await page.getByRole('button', { name: 'Map', exact: true }).click();
  const toggle = page.getByRole('group', { name: 'Basemap' });
  await expect(toggle).toBeVisible();
  const [mapBox, toggleBox, navBox] = await Promise.all([
    page.getByLabel('Listing map').boundingBox(),
    toggle.boundingBox(),
    page.locator('.maplibregl-ctrl-top-right').boundingBox(),
  ]);
  if (!mapBox || !toggleBox || !navBox) throw new Error('Missing box.');
  expect(toggleBox.x).toBeGreaterThanOrEqual(mapBox.x);
  expect(toggleBox.y).toBeGreaterThanOrEqual(mapBox.y);
  expect(toggleBox.x + toggleBox.width).toBeLessThanOrEqual(navBox.x);
  expect(toggleBox.y).toBeLessThan(mapBox.y + 40);
});

test('on a touch screen the map needs two fingers to pan, and a mouse keeps the plain map', async ({
  page,
}) => {
  await seeDetachedHomeOnMap(page);
  const map = page.locator('.maplibregl-canvas-container');
  if (test.info().project.name === 'narrow')
    await expect(map).toHaveClass(/maplibregl-cooperative-gestures/);
  else await expect(map).not.toHaveClass(/maplibregl-cooperative-gestures/);
});

test('the selected home is a bottom sheet on a phone and a floating card on desktop', async ({
  page,
}) => {
  await seeDetachedHomeOnMap(page);
  const narrow = test.info().project.name === 'narrow';
  const card = page.getByRole('article', {
    name: 'Selected home: Example detached home',
    exact: true,
  });
  // The sheet slides in, so poll until it has settled.
  await expect
    .poll(async () => {
      const [mapBox, cardBox] = await Promise.all([
        page.getByLabel('Listing map').boundingBox(),
        card.boundingBox(),
      ]);
      if (!mapBox || !cardBox) return false;
      const gap = mapBox.y + mapBox.height - (cardBox.y + cardBox.height);
      return narrow
        ? Math.abs(cardBox.width - mapBox.width) <= 2 &&
            Math.abs(cardBox.x - mapBox.x) <= 2 &&
            Math.abs(gap) <= 2
        : cardBox.width <= 320 && gap >= 10;
    })
    .toBe(true);
  if (!narrow) return;
  // The tile attribution must stay readable above the sheet.
  await expect
    .poll(async () => {
      const [attributionBox, cardBox] = await Promise.all([
        page.locator('.maplibregl-ctrl-attrib').boundingBox(),
        card.boundingBox(),
      ]);
      return Boolean(
        attributionBox &&
          cardBox &&
          attributionBox.y + attributionBox.height <= cardBox.y + 1,
      );
    })
    .toBe(true);
});
