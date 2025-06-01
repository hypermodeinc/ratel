/*
 * SPDX-FileCopyrightText: © Hypermode Inc. <hello@hypermode.com>
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react'
import { DataGrid } from 'react-data-grid'

export default class AutosizeGrid extends React.Component {
  state = {
    width: 100,
    height: 100,
  }

  outerRef = React.createRef()
  dataGrid = React.createRef()

  componentDidMount() {
    const checkResize = () => {
      if (this.outerRef.current) {
        const height = this.outerRef.current.offsetHeight
        const width = this.outerRef.current.offsetWidth
        if (width !== this.state.width || height !== this.state.height) {
          this.setState(
            {
              height,
              width,
            },
            // () => this.dataGrid.current.metricsUpdated(),
          )
        }
      }
    }
    setTimeout(checkResize, 1)
    this.resizeInterval = setInterval(checkResize, 500)
  }

  componentWillUnmount() {
    clearInterval(this.resizeInterval)
  }

  render() {
    const { className, style, ...otherProps } = this.props
    return (
      <div className={className} style={style} ref={this.outerRef}>
        <DataGrid
          rows={rows}
          style={{ minHeight: this.state.height }}
          {...otherProps}
        />
      </div>
    )
  }
}
