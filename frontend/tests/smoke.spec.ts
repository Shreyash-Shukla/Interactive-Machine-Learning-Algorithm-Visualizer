import { expect, test } from '@playwright/test'

test('public replay stays synchronized and needs no training request', async ({ page }) => {
  const calls: string[] = []
  page.on('request', request => { if (request.url().includes('/api/train')) calls.push(request.url()) })
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Study hours vs exam score' })).toBeVisible()
  await expect(page.getByText('EPOCH 0', { exact: true })).toBeVisible()
  await page.getByRole('slider', { name: 'Training timeline' }).fill('125')
  await expect(page.getByText('EPOCH 500', { exact: true })).toBeVisible()
  await expect(page.getByText('Epoch 500 / 500')).toBeVisible()
  await page.getByRole('button', { name: 'Restart playback' }).click()
  await expect(page.getByText('EPOCH 0', { exact: true })).toBeVisible()
  await page.getByRole('combobox', { name: 'Example datasets' }).selectOption('ads')
  await expect(page.getByRole('heading', { name: 'Advertising spend vs sales' })).toBeVisible()
  expect(calls).toHaveLength(0)
})

test('admin signs in, uploads data, and trains through protected API', async ({ page }) => {
  test.skip(!process.env.ML_LAB_TEST_PASSWORD, 'Set ML_LAB_TEST_PASSWORD and run the local API first')
  await page.goto('/')
  await page.getByRole('button', { name: 'Admin login' }).click()
  await page.getByLabel('Password').fill(process.env.ML_LAB_TEST_PASSWORD!)
  await page.getByRole('button', { name: 'Sign in', exact: true }).click()
  await expect(page.getByText('Admin workspace')).toBeVisible()
  await page.locator('input[type=file]').setInputFiles({ name: 'custom.csv', mimeType: 'text/csv',
    buffer: Buffer.from('hours,score\n1,3\n2,5\n3,7\n4,9\n5,11') })
  await expect(page.getByText('custom.csv').first()).toBeVisible()
  await expect(page.getByText('5 usable rows')).toBeVisible()
  await page.getByRole('button', { name: /Train model/ }).click()
  await expect(page.getByRole('slider', { name: 'Training timeline' })).toBeEnabled()
  await page.getByRole('slider', { name: 'Training timeline' }).fill('125')
  await expect(page.getByText('EPOCH 500', { exact: true })).toBeVisible()
  await expect(page.getByText('y = 2x + 1')).toBeVisible()
  await page.getByRole('button', { name: 'Sign out' }).click()
  await expect(page.getByRole('button', { name: 'Admin login' })).toBeVisible()
})

test('tablet and mobile layouts have no horizontal overflow', async ({ page }) => {
  for (const width of [768, 390]) {
    await page.setViewportSize({ width, height: 844 })
    await page.goto('/')
    await expect(page.getByText('See the line')).toBeVisible()
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
    expect(overflow).toBeLessThanOrEqual(1)
  }
})
