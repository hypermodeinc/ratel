/*
 * SPDX-FileCopyrightText: © Hypermode Inc. <hello@hypermode.com>
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react'
import Button from 'react-bootstrap/Button'
import Form from 'react-bootstrap/Form'
import Modal from 'react-bootstrap/Modal'

import PredicatesTable from './PredicatesTable'

export default function EditTypeModal({
  executeQuery,
  onCancel,
  onAfterUpdate,
  isCreate,
  schema,
  type,
  types,
}) {
  const [updating, setUpdating] = useState(false)
  const [errorMessage, setErrorMessage] = useState(null)

  const [typeName, setTypeName] = useState((type && type.name) || '')

  const initialPreds = isCreate
    ? {}
    : type.fields.reduce((acc, f) => Object.assign(acc, { [f.name]: true }), {})
  const [selectedPreds, setSelectedPreds] = useState(initialPreds)

  const flipField = (name, isSelected) =>
    setSelectedPreds(Object.assign({}, selectedPreds, { [name]: isSelected }))

  const removeBrackets = (s) =>
    s && s[0] === '[' && s[s.length - 1] === ']' ? s.slice(1, s.length - 1) : s
  const typeFieldValues = isCreate
    ? {}
    : type.fields.reduce(
        (acc, f) => Object.assign(acc, { [f.name]: removeBrackets(f.type) }),
        {},
      )
  const [selectedTypes, setSelectedTypes] = useState(typeFieldValues)
  const changeFieldType = (name, type) => {
    setSelectedTypes(Object.assign({}, selectedTypes, { [name]: type }))
  }

  const schemaWithSelection = schema.map((p) =>
    Object.assign({}, p, {
      checkbox: {
        value: !!selectedPreds[p.predicate],
        invert: () => flipField(p.predicate, !selectedPreds[p.predicate]),
      },
      typeDropdown: {
        value: selectedTypes[p.predicate] || p.type,
        isList: p.list,
        isDropdown: p.type === 'uid',
        change: (newType) => changeFieldType(p.predicate, newType),
      },
    }),
  )

  const getTypeFromPredicate = (p) => {
    // TODO: !p is needed for cases when predicate is not in schema
    if (!p || p.type === 'default') {
      return 'uid'
    }
    const typeName = selectedTypes[p.predicate] || p.type
    return p.list ? `[${typeName}]` : typeName
  }

  const getQuery = () => {
    const fields = Object.entries(selectedPreds)
      .filter((p) => p[1])
      // Remove predicates that are not in schema.
      .filter(([name, _]) => schema.find((p) => p.predicate === name))
      .map(([name, _]) => {
        const pred = schema.find((p) => p.predicate === name)
        return {
          name,
          type: getTypeFromPredicate(pred),
        }
      })

    return `
          type <${typeName}> {
            ${fields.map((f) => `<${f.name}>: <${selectedTypes[f.name] || f.type}>`).join('\n')}
          }
        `
  }

  const saveType = async () => {
    setUpdating(true)

    try {
      await executeQuery(getQuery(), 'alter')
      onAfterUpdate()
      setErrorMessage(null)
      onAfterUpdate()
    } catch (err) {
      setErrorMessage(err?.message)
    } finally {
      setUpdating(false)
    }
  }

  return (
    <Modal show={true} size='lg' onHide={onCancel}>
      <Modal.Header closeButton>
        <Modal.Title>{isCreate ? 'Create Type' : 'Edit Type'}</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <Form.Group controlId='typeName'>
          <Form.Label>Type Name</Form.Label>
          <Form.Control
            type='text'
            placeholder='MyType'
            onChange={(e) => setTypeName(e.target.value)}
            value={typeName}
            disabled={!isCreate}
          />
        </Form.Group>

        <Form.Group style={{ minHeight: 200, display: 'flex' }}>
          <PredicatesTable
            schema={schemaWithSelection}
            onChangeSelectedPredicate={() => undefined}
            showCheckboxes={true}
            hideIndices={true}
            types={types}
          />
        </Form.Group>

        {!errorMessage ? null : (
          <div className='alert alert-danger'>{errorMessage}</div>
        )}
      </Modal.Body>
      <Modal.Footer style={{ justifyContent: 'space-between' }}>
        <Button className='pull-left' variant='secondary' onClick={onCancel}>
          Cancel
        </Button>

        <Button
          variant='primary'
          onClick={saveType}
          disabled={updating || !typeName}
        >
          {updating ? 'Updating...' : isCreate ? 'Create Type' : 'Save'}
        </Button>
      </Modal.Footer>
    </Modal>
  )
}
