/*
 * SPDX-FileCopyrightText: © Hypermode Inc. <hello@hypermode.com>
 * SPDX-License-Identifier: Apache-2.0
 */

import { spawn } from 'child_process'
import fetch from 'isomorphic-fetch'
import puppeteer from 'puppeteer'

import {
  DGRAPH_SERVER,
  createTestTab,
  easyUid,
  getElementText,
  setupBrowser,
  waitForElement,
  waitForElementDisappear,
} from '../puppetHelpers'

import { loginUser, logoutUser } from './aclHelpers'

let browser = null

beforeAll(async () => {
  jest.setTimeout(15000)
  browser = await setupBrowser()
})

afterAll(async () => browser && (await browser.close()))

const generateTestUser = async (page) => {
  const addBtnSelector = '.acl-view .panel.first button.btn.btn-primary'
  await expect(
    page.$eval(addBtnSelector, (btn) => btn.textContent),
  ).resolves.toBe('Add User')

  const userId = `addedUser-${easyUid()}`
  const password = 'AddedUserPassword'

  await page.click(addBtnSelector)

  await waitForElement(page, '.modal.show .form-group #userId')

  await page.click('.modal.show .form-group #userId')
  await page.keyboard.type(userId)

  await page.click('.modal.show .form-group #password')
  await page.keyboard.type(password)

  await page.click('.modal.show .form-group #passwordRepeat')
  await page.keyboard.type(password)

  await page.click('.modal.show .modal-footer button.btn.btn-primary')

  await waitForElementDisappear(page, '.modal.show .form-group #userId')

  return userId
}

const adminGql = (query, headers) =>
  fetch(`${DGRAPH_SERVER}/admin`, {
    method: 'POST',
    headers: Object.assign({}, { 'Content-Type': 'application/json' }, headers),
    body: JSON.stringify({ query }),
  })

test('/admin endpoint should return new users and new groups', async () => {
  const page = await createTestTab(browser)

  await logoutUser(page)
  await expect(loginUser(page, 'groot', 'password')).resolves.toBe(true)

  // First click closes the modal.
  await page.click('.sidebar-menu a[href="#acl"]')
  await page.click('.sidebar-menu a[href="#acl"]')

  // Groot should always exist.
  await waitForElement(page, '.main-content.acl .datagrid div[title=groot]')

  const userId = await generateTestUser(page)

  try {
    const gqlLogin = await adminGql(`mutation {
          login(userId:"groot", password:"password") {
            response {accessJWT}
          }
        }`)
    const token = (await gqlLogin.json()).data.login.response.accessJWT
    expect(token).toBeTruthy()

    const gqlUser = await adminGql(
      `{ getUser(name: "${userId}") { name groups { name } } }`,
      {
        'X-Dgraph-AccessToken': token,
      },
    )
    await expect(gqlUser.json()).resolves.toHaveProperty(
      'data.getUser.name',
      userId,
    )
  } catch (err) {
    console.error('/admin validation error')
    console.error(err)
    throw err
  }
})
