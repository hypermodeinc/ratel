/*
 * SPDX-FileCopyrightText: © Hypermode Inc. <hello@hypermode.com>
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react'
import Button from 'react-bootstrap/Button'
import Form from 'react-bootstrap/Form'
import Modal from 'react-bootstrap/Modal'

export default function EditUserModal({
  executeMutation,
  isCreate,
  onCancel,
  onDone,
  saveUser,
  userName: userNameSupplied,
  userUid,
}) {
  const [loading, setLoading] = useState(false)
  const [userName, setUserName] = useState(userNameSupplied || '')
  const [password, setPassword] = useState('')
  const [passwordConfirm, setPasswordConfirm] = useState('')
  const [errorMessage, setErrorMessage] = useState('')

  const validate = () => {
    if (isCreate && !userName) {
      setErrorMessage('Username is required')
      return false
    }
    if (!password) {
      setErrorMessage('Password is required')
      return false
    }
    if (password !== passwordConfirm) {
      setErrorMessage('Passwords do not match')
      return false
    }
    return true
  }

  const handleSave = async () => {
    if (!validate()) {
      return
    }

    setLoading(true)

    try {
      await saveUser(isCreate, userUid, userName, password)
      setLoading(false)
      onDone()
    } catch (errorMessage) {
      setErrorMessage(`Could not save user: ${errorMessage}`)
      setLoading(false)
    }
  }

  return (
    <Modal show={true} onHide={onCancel} backdrop='static' keyboard={false}>
      <Modal.Header closeButton>
        <Modal.Title>{isCreate ? 'Create' : 'Edit'} User</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <Form.Group controlId='userId'>
          <Form.Label>Username</Form.Label>
          <Form.Control
            type='text'
            placeholder='Username'
            disabled={!isCreate || loading}
            onChange={({ target: { value: userName } }) =>
              setUserName(userName)
            }
            value={userName}
          />
        </Form.Group>

        <Form.Group controlId='password'>
          <Form.Label>Password</Form.Label>
          <Form.Control
            type='password'
            placeholder='Enter password'
            disabled={loading}
            onChange={({ target: { value } }) => setPassword(value)}
            value={password}
          />
        </Form.Group>

        <Form.Group controlId='passwordRepeat'>
          Re-enter password
          <Form.Control
            type='password'
            placeholder='Enter password again'
            onChange={({ target: { value } }) => setPasswordConfirm(value)}
            disabled={loading}
            value={passwordConfirm}
          />
        </Form.Group>
        {errorMessage && (
          <div className='alert alert-danger'>{errorMessage}</div>
        )}
      </Modal.Body>
      <Modal.Footer>
        <Button
          onClick={onCancel}
          disabled={loading}
          variant='default'
          className='pull-left'
        >
          Cancel
        </Button>

        <Button variant='primary' disabled={loading} onClick={handleSave}>
          &nbsp;
          {loading ? 'Altering ACL...' : 'Save'}
        </Button>
      </Modal.Footer>
    </Modal>
  )
}
