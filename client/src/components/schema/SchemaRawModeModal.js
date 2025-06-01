/*
 * SPDX-FileCopyrightText: © Hypermode Inc. <hello@hypermode.com>
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react'
import Button from 'react-bootstrap/Button'
import Modal from 'react-bootstrap/Modal'

import Editor from 'containers/Editor'
import { getRawSchema } from 'lib/dgraph-syntax'

export default function SchemaRawModeModal({
  executeQuery,
  onAfterUpdate,
  onCancel,
  onDropData,
  schema,
  types,
}) {
  const [value, setValue] = useState(getRawSchema(schema, types))
  const [editorKey, setEditorKey] = useState(1)
  const [errorMsg, setErrorMsg] = useState(null)
  const [updating, setUpdating] = useState(false)

  const handleUpdate = async () => {
    setUpdating(true)
    setErrorMsg(null)

    try {
      await executeQuery(value + '\n', 'alter', true)
      onAfterUpdate()
    } catch (error) {
      setErrorMsg(`Could not alter schema: ${error?.message}`)
    } finally {
      setUpdating(false)
    }
  }

  const handleResetClick = () => {
    setValue(getRawSchema(schema, types))
    setEditorKey(editorKey + 1)
    setErrorMsg(null)
  }

  return (
    <Modal
      show={true}
      size='lg'
      onHide={onCancel}
      backdrop='static'
      keyboard={false}
    >
      <Modal.Header closeButton>
        <Modal.Title>Edit Schema File</Modal.Title>
      </Modal.Header>
      <Modal.Body style={{ padding: 0 }}>
        <div style={{ border: '1px solid #e5e5e5' }}>
          <Editor
            key={editorKey}
            query={value}
            maxHeight={314}
            onUpdateQuery={(value) => setValue(value)}
          />
        </div>
        {!errorMsg ? null : (
          <div className='alert alert-danger'>{errorMsg}</div>
        )}
      </Modal.Body>
      <Modal.Footer style={{ justifyContent: 'space-between' }}>
        <Button className='pull-left' variant='secondary' onClick={onCancel}>
          Cancel
        </Button>
        <Button variant='light' onClick={handleResetClick} disabled={updating}>
          {updating ? 'Updating...' : 'Refresh Schema'}
        </Button>

        <Button variant='danger' size='sm' onClick={onDropData}>
          Drop Data
        </Button>

        <Button variant='primary' onClick={handleUpdate} disabled={updating}>
          {updating ? 'Updating...' : 'Apply Schema'}
        </Button>
      </Modal.Footer>
    </Modal>
  )
}
