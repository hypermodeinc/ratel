/*
 * SPDX-FileCopyrightText: © Hypermode Inc. <hello@hypermode.com>
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react'
import Badge from 'react-bootstrap/Badge'
import { useDispatch, useSelector } from 'react-redux'

import './index.scss'
import { startBackup } from 'actions/backup'
import AutosizeGrid from '../AutosizeGrid'
import ConfirmBackupModal from './ConfirmBackupModal'
import StartBackupModal from './StartBackupModal'

import { getBackupSettings } from './backupModel'

import { DEFAULT_BACKUP_CONFIG } from 'actions/backup'

export default function BackupsView(props) {
  const [backupModal, setBackupModal] = useState(false)
  const [confirmModal, setConfirmModal] = useState(false)

  const dgraphUrl = useSelector(
    (state) => state.connection.serverHistory[0].url,
  )

  const backupConfig =
    useSelector((state) => state.backup && state.backup.config) ||
    DEFAULT_BACKUP_CONFIG

  const backupsList =
    useSelector((state) => state.backup && state.backup.backups) || []
  const dispatch = useDispatch()

  async function onStartBackup(backupConfig) {
    dispatch(startBackup(dgraphUrl, backupConfig))
  }

  const renderToolbar = () => {
    return (
      <div className='btn-toolbar' key='buttonsDiv'>
        <button
          className='btn btn-primary btn-sm'
          onClick={() => setBackupModal(true)}
        >
          Create Backup
        </button>
      </div>
    )
  }

  const renderBackupsTable = () => {
    const columns = [
      {
        key: 'startTime',
        name: 'Start Time',
        resizable: true,
        formatter: ({ value }) => new Date(value).toLocaleString(),
      },
      {
        key: 'dest',
        name: 'Destination',
        resizable: true,
        formatter: ({ value }) => (
          <span title={value.path}>
            <Badge variant='secondary'>{value.type}</Badge> {value.path}
          </span>
        ),
      },
      {
        key: 'flags',
        name: 'Settings',
        resizable: true,
      },
      {
        key: 'result',
        name: 'Result',
        resizable: true,
        formatter: ({ value }) => {
          const gqlResponse = value.result?.data?.backup?.response
          if (gqlResponse) {
            const isOk = gqlResponse.code === 'Success'
            return (
              <span title={gqlResponse.message}>
                <Badge variant={isOk ? 'success' : 'danger'}>
                  {gqlResponse.code}
                </Badge>{' '}
                {gqlResponse.message}
              </span>
            )
          }
          if (value.error) {
            const err = value.error
            const msg =
              err.errors?.[0].message || err.message || JSON.stringify(err)
            return (
              <span title={msg}>
                <Badge variant='danger'>{err.name || 'Error'}</Badge> {msg}
              </span>
            )
          }
          return (
            <span title='Unknown result'>
              <Badge variant='warning'>Awaiting Response</Badge>
            </span>
          )
        },
      },
    ]

    const data = backupsList
      .filter(({ serverUrl }) => serverUrl === dgraphUrl)
      .map(({ error, config, result, startTime }) => ({
        startTime,
        dest: { type: config.destinationType, path: config.backupPath },
        result: { error, result },
        flags: getBackupSettings(config).join(', '),
      }))

    return (
      <AutosizeGrid className='backups-table' columns={columns} rows={data} />
    )
  }

  return (
    <div className='backups-view'>
      <h2>Backups</h2>

      {renderToolbar()}
      {renderBackupsTable()}
      {backupModal && (
        <StartBackupModal
          backupConfig={backupConfig}
          onCancel={() => setBackupModal(false)}
          onStartBackup={() => {
            setBackupModal(false)
            setConfirmModal(true)
          }}
        />
      )}
      {confirmModal && (
        <ConfirmBackupModal
          backupConfig={backupConfig}
          onCancel={() => {
            setConfirmModal(false)
            setBackupModal(true)
          }}
          onStartBackup={() => {
            onStartBackup(backupConfig)
            setBackupModal(false)
            setConfirmModal(false)
          }}
        />
      )}
    </div>
  )
}
