/*
 * SPDX-FileCopyrightText: © Hypermode Inc. <hello@hypermode.com>
 * SPDX-License-Identifier: Apache-2.0
 */

import 'core-js/stable'
import 'regenerator-runtime/runtime'

import React from 'react'
import ReactDOM from 'react-dom/client'

import App from './containers/App'
import AppProvider from './containers/AppProvider'

window.FontAwesomeConfig = { autoReplaceSvg: 'nest' }
import '@fortawesome/fontawesome-free/js/all.min.js'

const root = ReactDOM.createRoot(
  document.getElementById('root') || document.createElement('div'),
)

root.render(
  <React.StrictMode>
    <AppProvider component={App} />
  </React.StrictMode>,
)

if (import.meta.hot) {
  window.RATEL_DEV_MODE = true
  import.meta.hot.accept('./containers/App', async () => {
    const nextApp = (await import('./containers/App')).default
    root.render(
      <React.StrictMode>
        <AppProvider component={nextApp} />
      </React.StrictMode>,
    )
  })
}
