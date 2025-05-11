/*
 * SPDX-FileCopyrightText: © Hypermode Inc. <hello@hypermode.com>
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react'
import Button from 'react-bootstrap/Button'
import Col from 'react-bootstrap/Col'
import Collapse from 'react-bootstrap/Collapse'
import Form from 'react-bootstrap/Form'
import Modal from 'react-bootstrap/Modal'
import { useDispatch, useSelector } from 'react-redux'

import { DEFAULT_BACKUP_CONFIG, setBackupConfig } from 'actions/backup'
import RadioSelect from './RadioSelect'
import { DISPLAY_STRINGS } from './backupModel'

export default function StartBackupModal({ onCancel, onStartBackup }) {
  const backupTypes = ['nfs', 'aws', 'minio']

  const dispatch = useDispatch()
  const patchBackupConfig = (cfg) => dispatch(setBackupConfig(cfg))
  const backupConfig =
    useSelector((state) => state.backup && state.backup.config) ||
    DEFAULT_BACKUP_CONFIG

  const {
    destinationType,
    backupPath,
    accessKey,
    anonymous,
    secretKey,
    sessionToken,
    forceFull,
    overrideCredentials,
  } = backupConfig

  const isNfs = destinationType === 'nfs'

  const formGroup = (fragment, label, noColumn) => (
    <Form.Group as={Form.Row}>
      {label && (
        <Form.Label column sm={12}>
          {label}
        </Form.Label>
      )}
      {noColumn ? fragment : <Col sm={12}>{fragment}</Col>}
    </Form.Group>
  )

  return (
    <Modal show={true} onHide={onCancel} backdrop='static' keyboard={false}>
      <Modal.Header closeButton>
        <Modal.Title>Start New Backup</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <Form>
          {formGroup(
            <RadioSelect
              value={destinationType}
              radioItems={backupTypes}
              itemLabels={backupTypes.map((t) => DISPLAY_STRINGS[t].name)}
              onChange={(destinationType) =>
                patchBackupConfig({ destinationType })
              }
            />,
            'Destination Type:',
          )}

          {formGroup(
            <Form.Control
              type='text'
              id='backup-path'
              placeholder={DISPLAY_STRINGS[destinationType].placeholder}
              value={backupPath}
              onChange={(e) =>
                patchBackupConfig({
                  backupPath: e.target.value,
                })
              }
            />,
            DISPLAY_STRINGS[destinationType].pathName + ':',
          )}

          {formGroup(
            <Form.Check
              type='checkbox'
              checked={forceFull}
              id='check-force-full'
              label='Force Full Backup'
              onChange={(e) =>
                patchBackupConfig({
                  forceFull: e.target.checked,
                })
              }
            />,
          )}

          {formGroup(
            <Form.Check
              type='checkbox'
              disabled={isNfs}
              checked={overrideCredentials && !isNfs}
              id='check-override-credentials'
              label='Override Credentials'
              onChange={(e) =>
                patchBackupConfig({
                  overrideCredentials: e.target.checked,
                })
              }
            />,
          )}
          <Collapse in={overrideCredentials && !isNfs}>
            <div className='backup-well'>
              {formGroup(
                <Form.Check
                  type='checkbox'
                  id='backup-a'
                  checked={anonymous}
                  label='Public Bucket (no credentials)'
                  onChange={(e) =>
                    patchBackupConfig({
                      anonymous: e.target.checked,
                    })
                  }
                />,
              )}
              {formGroup(
                <Form.Control
                  type='text'
                  id='backup-a-k'
                  placeholder='<your access key>'
                  value={accessKey}
                  onChange={(e) =>
                    patchBackupConfig({
                      accessKey: e.target.value,
                    })
                  }
                />,
                'Access Key',
              )}
              {formGroup(
                <Form.Control
                  type='text'
                  id='backup-s-k'
                  placeholder='<your secret key>'
                  value={secretKey}
                  onChange={(e) =>
                    patchBackupConfig({
                      secretKey: e.target.value,
                    })
                  }
                />,
                'Secret Key',
              )}
              {formGroup(
                <Form.Control
                  type='text'
                  id='backup-s-t'
                  placeholder='<session token>'
                  value={sessionToken}
                  onChange={(e) =>
                    patchBackupConfig({
                      sessionToken: e.target.value,
                    })
                  }
                />,
                'Session Token',
              )}
            </div>
          </Collapse>
        </Form>
      </Modal.Body>
      <Modal.Footer>
        <Button variant='secondary' onClick={onCancel}>
          Cancel
        </Button>
        <Button variant='primary' onClick={onStartBackup}>
          Next »
        </Button>
      </Modal.Footer>
    </Modal>
  )
}
