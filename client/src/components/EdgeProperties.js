/*
 * SPDX-FileCopyrightText: © Hypermode Inc. <hello@hypermode.com>
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react'
import Button from 'react-bootstrap/Button'
import Table from 'react-bootstrap/Table'

import 'assets/css/NodeProperties.scss'

export default function EdgeProperties({
  edge,
  onSelectSource,
  onSelectTarget,
}) {
  if (!edge) {
    return null
  }

  const { facets } = edge

  return (
    <div>
      <label>{`${edge.source.uid} <${edge.predicate}> ${edge.target.uid}`}</label>
      <div
        className='btn-toolbar mb-2'
        role='toolbar'
        aria-label='Edge Options'
      >
        <Button
          className='mr-2'
          variant='info'
          size='sm'
          onClick={onSelectSource}
        >
          Find Source
        </Button>

        <Button
          className='mr-2'
          variant='info'
          size='sm'
          onClick={onSelectTarget}
        >
          Find Target
        </Button>
      </div>

      {facets && Object.keys(facets).length ? (
        <Table striped bordered size='sm' hover>
          <thead>
            <tr>
              <th>facet</th>
              <th>value</th>
            </tr>
          </thead>
          <tbody>
            {Object.keys(facets).map((k) => (
              <tr key={k}>
                <td>{k}</td>
                <td>{String(facets[k])}</td>
              </tr>
            ))}
          </tbody>
        </Table>
      ) : null}
    </div>
  )
}
