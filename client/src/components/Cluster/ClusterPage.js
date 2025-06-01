/*
 * SPDX-FileCopyrightText: © Hypermode Inc. <hello@hypermode.com>
 * SPDX-License-Identifier: Apache-2.0
 */

import moment from 'moment'
import React, { useEffect, useState } from 'react'
import Card from 'react-bootstrap/Card'
import Dropdown from 'react-bootstrap/Dropdown'
import DropdownButton from 'react-bootstrap/DropdownButton'
import { useDispatch, useSelector } from 'react-redux'
import useInterval from 'use-interval'

import { getClusterState, getInstanceHealth } from 'actions/cluster'
import ColorGenerator from 'lib/ColorGenerator'
import { humanizeBytes } from 'lib/helpers'
import { getSpace } from 'lib/utils'
import MoveTabletModal from './MoveTabletModal'
import RemoveNodeModal from './RemoveNodeModal'

import './ClusterPage.scss'

export default function ClusterPage() {
  const dispatch = useDispatch()
  const { instanceHealth, isAuthorized, clusterState } = useSelector(
    (state) => state.cluster,
  )

  const currentServer = useSelector(
    (state) => state.connection.serverHistory[0],
  )

  const [removeNodeState, setRemoveNodeState] = useState(undefined)
  const [moveTabletState, setMoveTabletState] = useState(undefined)

  const refresh = () => {
    dispatch(getInstanceHealth())
    dispatch(getClusterState())
  }

  useInterval(refresh, 10000)
  useEffect(refresh, [currentServer, dispatch])

  if (!isAuthorized) {
    return (
      <div className='alert alert-danger' style={{ margin: '20px 40px' }}>
        You need to login as a <strong>guardians group</strong> member to view
        Cluster State.
      </div>
    )
  }

  const getHealthDot = (addr) => {
    const health = (instanceHealth || []).find((r) => r.address === addr)

    if (!health) {
      return <div className='health unknown' />
    }

    const humanizeLastEcho = () => {
      if (!health.lastEcho) {
        return ''
      }
      const lastPing = health.lastEcho * 1000 - Date.now()
      return ` - last echo ${moment.duration(lastPing).humanize(true)}`
    }

    return (
      <div
        className={
          health.status === 'healthy' ? 'health healthy' : 'health dead'
        }
        title={`${health.status}${humanizeLastEcho()}`}
      />
    )
  }

  const Node = ({ node }) => {
    const R = ({ children, other }) => (
      <div className='node'>
        {getHealthDot(node.addr)}
        <div className='id' title={`Id: ${node.id}`}>
          {node.id} -
        </div>
        <span className='addr' title={node.addr}>
          {node.addr}
        </span>
        {node.leader && (
          <div className='leader-wrap'>
            <div className='leader' title='Leader' />
          </div>
        )}
        {children}
      </div>
    )

    if (!node.groupId) {
      // This is a zero
      return <R />
    }

    return (
      <DropdownButton as={R} key={node.id} title=''>
        <Dropdown.Item href='#' onClick={() => onRemoveNode(node)}>
          Remove Node
        </Dropdown.Item>
      </DropdownButton>
    )
  }

  const renderNode = (node) => <Node node={node} key={node.id} />

  const onRemoveNode = (node) => {
    setRemoveNodeState({
      nodeId: node.id,
      groupId: node.groupId,
    })
  }

  const renderZeros = (zeros) => {
    if (!zeros) {
      return
    }

    const remainingMs = clusterState?.license?.expiryTs * 1000 - Date.now()

    return (
      <div className='zeros'>
        <div className='summary-panel'>
          <h1>Zeros ({Object.values(zeros).length})</h1>
          <div className='license'>
            <span className='value'>
              {clusterState?.license?.enabled
                ? 'Enterprise License'
                : 'Community Edition'}
            </span>
            <br />
            Max Nodes:{' '}
            <span className='value'>
              {clusterState?.license?.maxNodes > 1e10
                ? '∞'
                : clusterState?.license?.maxNodes}
            </span>
            <br />
            {remainingMs > 0 ? 'Expires' : 'Expired'}:{' '}
            <span className='value'>
              {moment.duration(remainingMs, 'ms').humanize(true)}
            </span>
          </div>
        </div>
        <div className='nodes'>{Object.values(zeros).map(renderNode)}</div>
      </div>
    )
  }

  const renderGroups = (groups) => {
    if (!groups) {
      return
    }

    const colors = new ColorGenerator()

    const cmp = (a, b) => (a < b ? -1 : a > b ? 1 : 0)

    const compareTablets = (a, b) => {
      if (!getSpace(a[1]) && !getSpace(b[1])) {
        return cmp(a[0], b[0])
      }
      if (getSpace(a[1]) && !getSpace(b[1])) {
        return -1
      }
      if (getSpace(b[1]) && !getSpace(a[1])) {
        return 1
      }
      const cmpSpace = -cmp(
        parseFloat(getSpace(a[1])),
        parseFloat(getSpace(b[1])),
      )
      return cmpSpace || cmp(a[0], b[0])
    }

    const renderSpace = (space) => {
      if (!space) {
        return <span className='space default'>&lt; 64MB</span>
      }

      return <span className='space'>{humanizeBytes(space)}</span>
    }

    const renderGroup = (key, g) => {
      let tablets = Object.entries(g.tablets || {})
      tablets.sort(compareTablets)
      const MAX_TABLETS = 15

      const andMore =
        tablets.length > MAX_TABLETS ? tablets.length - MAX_TABLETS - 1 : 0
      const andMoreSpace = tablets
        .slice(MAX_TABLETS - 1)
        .map((t) => getSpace(t[1]) || 0)
        .map(parseFloat)
        .reduce((a, b) => a + b, 0)
      if (andMore) {
        tablets = tablets.slice(0, MAX_TABLETS - 1)
      }

      return (
        <div
          className='group'
          key={key}
          style={{
            backgroundColor: `rgba(${colors.getRGBA(0.25).join(',')})`,
          }}
        >
          <h1 title={`Group #${key}`}>Group #{key}</h1>
          <div className='nodes'>
            {Object.values(g.members || {}).map(renderNode)}
          </div>
          <h1>Tablets ({tablets.length})</h1>
          <div className='tablets'>
            {tablets.map(([p, tablet]) => (
              <div className='tablet' key={p}>
                <span>{p}</span>
                {Object.keys(clusterState?.groups || {}).length > 1 && (
                  <button
                    className='move'
                    title='Move to another group'
                    onClick={() =>
                      setMoveTabletState({
                        fromGroup: key,
                        tablet: p,
                      })
                    }
                  >
                    <i className='fas fa-exchange-alt' />
                  </button>
                )}
                {renderSpace(getSpace(tablet))}
              </div>
            ))}
            {andMore > 0 && (
              <div className='tablet'>
                ... and {andMore} more ...
                {renderSpace(andMoreSpace)}
              </div>
            )}
          </div>
        </div>
      )
    }

    return (
      <>
        <h1>Groups ({Object.entries(groups).length})</h1>

        <div className='groups'>
          {Object.entries(groups).map(([key, g]) => renderGroup(key, g))}
        </div>
      </>
    )
  }

  return (
    <Card>
      <Card.Body>
        <Card.Title>Cluster Management</Card.Title>
        {renderZeros(clusterState?.zeros)}
        {renderGroups(clusterState?.groups)}
      </Card.Body>
      {removeNodeState && (
        <RemoveNodeModal
          {...removeNodeState}
          onHide={() => {
            setRemoveNodeState()
            refresh()
          }}
        />
      )}

      {moveTabletState && (
        <MoveTabletModal
          {...moveTabletState}
          groups={clusterState?.groups}
          onHide={() => {
            setMoveTabletState()
            refresh()
          }}
        />
      )}
    </Card>
  )
}
