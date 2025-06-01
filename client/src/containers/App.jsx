/*
 * SPDX-FileCopyrightText: © Hypermode Inc. <hello@hypermode.com>
 * SPDX-License-Identifier: Apache-2.0
 */

import classnames from 'classnames'
import React from 'react'
import { connect } from 'react-redux'

import AclPage from 'components/ACL/AclPage'
import BackupsView from 'components/Backups'
import ClusterPage from 'components/Cluster/ClusterPage'
import LicenseWarning from 'components/LicenseWarning'
import QueryView from 'components/QueryView'
import ServerConnectionModal from 'components/ServerConnectionModal'
import Sidebar from 'components/Sidebar'
import SidebarInfo from 'components/SidebarInfo'
import Schema from 'components/schema/Schema'

import { checkHealth } from 'actions/connection'
import { runQuery } from 'actions/frames'
import { setActiveFrame } from 'actions/frames'
import { updateQueryAndAction } from 'actions/query'
import { clickSidebarUrl } from 'actions/ui'

import '@/assets/css/App.scss'

class App extends React.Component {
  async componentDidMount() {
    const { activeFrameId, dispatchCheckHealth, frames } = this.props

    if (!activeFrameId && frames.length) {
      const { id, query, action } = frames[0]
      this.handleSelectQuery(id, query, action)
    }
    dispatchCheckHealth({ openUrlOnError: true })
  }

  getOverlayContent = (overlayUrl) => {
    // if (overlayUrl === "info") { //! TODO FIX THIS
    //     return <SidebarInfo />
    // }
    return null
  }

  handleSelectQuery = (frameId, query, action) => {
    const { handleUpdateQueryAndAction, handleSetActiveFrame } = this.props

    handleUpdateQueryAndAction(query, action)
    handleSetActiveFrame(frameId)
  }

  handleRunQuery = (query, action) => this.props.dispatchRunQuery(query, action)

  handleExternalQuery = (query) => {
    // Open the console
    this.props.clickSidebarUrl('')
    this.handleRunQuery(query, 'query')
    this.handleSelectQuery(null, query, 'query')
  }

  render() {
    const { clickSidebarUrl, mainFrameUrl, overlayUrl } = this.props

    const getMainContent = (mainFrameUrl) => {
      switch (mainFrameUrl) {
        case '':
          return <QueryView />
        case 'acl':
          return <AclPage />
        case 'backups':
          return <BackupsView />
        case 'cluster':
          return <ClusterPage />
        case 'connection':
          return <ServerConnectionModal />
        case 'schema':
          return <Schema onOpenGeneratedQuery={this.handleExternalQuery} />
        default:
          return <div>Unknown main frame URL: {mainFrameUrl}</div>
      }
    }

    return (
      <>
        <Sidebar
          currentMenu={overlayUrl || mainFrameUrl}
          currentOverlay={this.getOverlayContent(overlayUrl)}
          onToggleMenu={this.props.clickSidebarUrl}
        />
        <div className={classnames('main-content', mainFrameUrl || 'console')}>
          {overlayUrl ? (
            <div
              className='click-capture'
              onClick={() => clickSidebarUrl(mainFrameUrl)}
            />
          ) : null}
          <LicenseWarning />
          {getMainContent(mainFrameUrl)}
        </div>
      </>
    )
  }
}

function mapStateToProps(state) {
  return {
    activeFrameId: state.frames.activeFrameId,
    frames: state.frames.items,
    frameResults: state.frames.frameResults,
    activeTab: state.frames.tab,

    mainFrameUrl: state.ui.mainFrameUrl,
    overlayUrl: state.ui.overlayUrl,
  }
}

function mapDispatchToProps(dispatch) {
  return {
    clickSidebarUrl(url) {
      return dispatch(clickSidebarUrl(url))
    },
    dispatchCheckHealth(openUrlSettings) {
      return dispatch(checkHealth(openUrlSettings))
    },
    dispatchRunQuery(query, action) {
      return dispatch(runQuery(query, action))
    },
    handleSetActiveFrame(frameId) {
      return dispatch(setActiveFrame(frameId))
    },
    handleUpdateQueryAndAction(query, action) {
      dispatch(updateQueryAndAction(query, action))
    },
  }
}

export default connect(mapStateToProps, mapDispatchToProps)(App)
