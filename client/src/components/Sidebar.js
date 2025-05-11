/*
 * SPDX-FileCopyrightText: © Hypermode Inc. <hello@hypermode.com>
 * SPDX-License-Identifier: Apache-2.0
 */

import classnames from 'classnames'
import React, { useEffect } from 'react'
import OverlayTrigger from 'react-bootstrap/OverlayTrigger'
import Tooltip from 'react-bootstrap/Tooltip'
import { useDispatch, useSelector } from 'react-redux'
import useInterval from 'use-interval'

import GraphIcon from './GraphIcon'
import SantaHat from './SantaHat'

import { checkHealth } from 'actions/connection'
import { FetchError, Fetching, OK, Unknown } from 'lib/constants'
import HealthDot from './HealthDot'

import '../assets/css/Sidebar.scss'

import logo from '../assets/images/dgraph.png'

export default function Sidebar({ currentMenu, currentOverlay, onToggleMenu }) {
  const currentServer = useSelector(
    (state) => state.connection.serverHistory?.[0],
  )

  if (process.env.NODE_ENV !== 'production') {
    console.log('Sidebar initial state:', {
      serverHistory: useSelector((state) => state.connection.serverHistory),
      currentServer,
    })
  }

  if (
    !currentServer ||
    typeof currentServer !== 'object' ||
    !currentServer.url
  ) {
    return <div className='sidebar-empty'>No server connected</div>
  }

  const dispatch = useDispatch()
  useInterval(() => dispatch(checkHealth({ unknownOnStart: false })), 30000)

  useEffect(() => {
    dispatch(checkHealth({ unknownOnStart: false }))
  }, [currentServer?.url, currentServer?.refreshToken, dispatch])

  const renderButton = ({
    menuId,
    label,
    icon,
    fontAwesomeIcon,
    extraClassname,
    locked,
    key,
  }) => {
    const className = currentMenu === menuId ? 'link active' : 'link'
    if (process.env.NODE_ENV !== 'production') {
      console.log('Sidebar renderButton props:', {
        menuId,
        label,
        icon,
        fontAwesomeIcon,
        extraClassname,
        locked,
      })
    }
    return (
      <li className={extraClassname || ''}>
        <a
          href={'#' + menuId}
          className={className}
          onClick={(e) => {
            e.preventDefault()
            onToggleMenu(menuId)
          }}
        >
          {icon || <i className={'icon ' + fontAwesomeIcon} />}
          <label>{label}</label>
          {/* {locked === true && (
                        <i
                            title="Dgraph Alpha seems to restrict access to this feature. Are you logged in?"
                            className="acl-lock fas fa-lock"
                        />
                    )} */}
        </a>
      </li>
    )
  }

  const renderConnectionString = () => {
    const serverDisplayString = currentServer.url.replace(/^[a-z]*:\/\//i, '')

    let errorStyle = ''
    if (currentServer.health !== Unknown && currentServer.health !== OK) {
      errorStyle = 'error'
    }

    return (
      <div className={'connection-string ' + errorStyle}>
        <HealthDot
          health={currentServer.health}
          version={currentServer.version}
        />
        <span className='server-name'>
          &nbsp;
          {serverDisplayString}
        </span>
      </div>
    )
  }

  const getConnectionStatus = () => {
    if (currentServer.health === Unknown) {
      return 'Unknown'
    }
    if (currentServer.health === Fetching) {
      return 'Establishing connection'
    }
    if (currentServer.health === FetchError) {
      return 'Connection Error'
    }
    if (currentServer.health === OK) {
      return 'Connected'
    }
  }

  const renderConnectionButton = () => {
    const dgraphLogo = <img src={logo} alt='logo' className='icon logo' />

    // Santa hat from Dec 20 to Jan 14th (Old New Year is Jan 14th)
    const now = new Date()
    const isChristmas =
      (now.getMonth() === 11 && now.getDate() >= 20) ||
      (now.getMonth() === 0 && now.getDate() < 15)

    const iconDiv = !isChristmas ? (
      dgraphLogo
    ) : (
      <div style={{ position: 'relative' }}>
        {dgraphLogo}
        <div
          style={{
            position: 'absolute',
            transform: 'rotateY(180deg) scale(0.45)',
            top: -29,
            right: -19,
          }}
        >
          <SantaHat />
        </div>
      </div>
    )

    const label =
      currentMenu === 'connection' ? (
        renderConnectionString()
      ) : (
        <OverlayTrigger
          placement='right'
          overlay={
            <Tooltip>
              {renderConnectionString()}
              <span>Status:&nbsp;</span>
              <label>{getConnectionStatus()}</label>
            </Tooltip>
          }
        >
          {renderConnectionString()}
        </OverlayTrigger>
      )

    return renderButton({
      extraClassname: 'brand',
      menuId: 'connection',
      icon: iconDiv,
      label: label,
      key: 'connection',
    })
  }

  return (
    <div className='sidebar-container'>
      <div className='sidebar-menu'>
        <ul>
          {/* {renderConnectionButton()} */}

          {renderButton({
            menuId: '',
            icon: (
              <div
                style={{
                  width: '44px',
                  display: 'inline-block',
                }}
              >
                <GraphIcon />
              </div>
            ),
            label: 'Console',
            locked: currentServer?.aclState !== OK,
            key: 'console',
          })}

          {renderButton({
            menuId: 'schema',
            fontAwesomeIcon: 'fas fa-pencil-ruler',
            label: 'Schema',
            locked: currentServer?.aclState !== OK,
            key: 'schema',
          })}

          {currentServer?.isAclEnabled &&
            renderButton({
              menuId: 'acl',
              fontAwesomeIcon: 'fas fa-unlock-alt',
              label: 'ACL',
              locked: currentServer?.aclState !== OK,
              key: 'acl',
            })}

          {renderButton({
            menuId: 'cluster',
            fontAwesomeIcon: 'fas fa-layer-group',
            label: 'Cluster',
            locked: currentServer?.aclState !== OK,
            key: 'cluster',
          })}

          {currentServer?.isBackupEnabled &&
            renderButton({
              menuId: 'backups',
              fontAwesomeIcon: 'fas fa-hdd',
              label: 'Backups',
              locked: currentServer?.aclState !== OK,
              key: 'backups',
            })}

          {renderButton({
            menuId: 'info',
            fontAwesomeIcon: 'fas fa-info-circle',
            label: 'Info',
            locked: false,
            key: 'info',
          })}
        </ul>
      </div>
      <div
        className={classnames('sidebar-content', {
          open: !!currentOverlay,
        })}
      >
        {currentOverlay}
      </div>
    </div>
  )
}
