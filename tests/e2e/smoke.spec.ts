import { expect, test } from '@playwright/test'

test('homepage responds with success', async ({ request }) => {
  const response = await request.get('/')
  expect(response.ok()).toBeTruthy()
})

test('login page responds with success', async ({ request }) => {
  const response = await request.get('/login')
  expect(response.ok()).toBeTruthy()
})
