/*
 * SPDX-FileCopyrightText: © Hypermode Inc. <hello@hypermode.com>
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react'
import { CopyToClipboard } from 'react-copy-to-clipboard'
import Highlight from 'react-highlight'

import 'highlight.js/styles/atom-one-light.css'

const STATE_IDLE = 0
const STATE_ERROR = -1
const STATE_SUCCESS = 1

export default class FrameCodeTab extends React.Component {
  constructor(props) {
    super(props)
    this.state = {
      copyState: STATE_IDLE,
      copyDataState: STATE_IDLE,
    }
    this.onCopySuccess = this.onCopySuccess.bind(this)
    this.onCopyDataSuccess = this.onCopyDataSuccess.bind(this)
    this.newCopyTimer = this.newCopyTimer.bind(this)
    this.newCopyDataTimer = this.newCopyDataTimer.bind(this)
  }

  componentWillUnmount() {
    this.cancelCopyTimer()
    this.cancelCopyDataTimer()
  }

  cancelCopyTimer = () => {
    if (this._timeout) {
      clearTimeout(this._timeout)
    }
    this._timeout = null
  }

  cancelCopyDataTimer = () => {
    if (this._dataTimeout) {
      clearTimeout(this._dataTimeout)
    }
    this._dataTimeout = null
  }

  newCopyTimer(timeout = 1500) {
    this.setState({ copyState: STATE_SUCCESS })
    this._timeout = setTimeout(
      () => this.setState({ copyState: STATE_IDLE }),
      timeout,
    )
  }

  newCopyDataTimer(timeout = 1500) {
    this.setState({ copyDataState: STATE_SUCCESS })
    this._dataTimeout = setTimeout(
      () => this.setState({ copyDataState: STATE_IDLE }),
      timeout,
    )
  }

  onCopySuccess() {
    this.newCopyTimer(1500)
  }

  onCopyDataSuccess() {
    this.newCopyDataTimer(1500)
  }

  render() {
    const { code } = this.props
    const { copyState, copyDataState } = this.state
    const json =
      typeof code === 'string' ? code : JSON.stringify(code, null, 2) || ''

    // Try to extract json.data (as string)
    let dataString = ''
    try {
      const parsed = typeof code === 'string' ? JSON.parse(code) : code
      if (parsed && typeof parsed === 'object' && parsed.data !== undefined) {
        dataString = JSON.stringify(parsed.data, null, 2)
      }
    } catch (e) {
      // ignore
    }
    this._timeout = null

    return (
      <div className='frame-code-tab'>
        <CopyToClipboard text={json} onCopy={this.onCopySuccess}>
          <button className='btn-clipboard'>
            <i className='far fa-clipboard' />{' '}
            {copyState === STATE_IDLE
              ? 'Copy All as JSON'
              : copyState === STATE_SUCCESS
                ? 'Copied!'
                : 'Error Occured!'}
          </button>
        </CopyToClipboard>

        <CopyToClipboard text={dataString} onCopy={this.onCopyDataSuccess}>
          <button
            className='btn-clipboard'
            disabled={!dataString}
            style={{ marginLeft: 8, marginTop: 33 }}
          >
            <i className='far fa-clipboard' />{' '}
            {copyDataState === STATE_IDLE
              ? 'Copy Only data'
              : copyDataState === STATE_SUCCESS
                ? 'Copied!'
                : 'Error Occured!'}
          </button>
        </CopyToClipboard>

        {json && json.length > 16000 ? (
          <pre>{json}</pre>
        ) : (
          <Highlight>{json}</Highlight>
        )}
      </div>
    )
  }
}
