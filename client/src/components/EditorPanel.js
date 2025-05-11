/*
 * SPDX-FileCopyrightText: © Hypermode Inc. <hello@hypermode.com>
 * SPDX-License-Identifier: Apache-2.0
 */

import classnames from 'classnames'
import React from 'react'
import Dropdown from 'react-bootstrap/Dropdown'
import DropdownButton from 'react-bootstrap/DropdownButton'
import { useDispatch, useSelector } from 'react-redux'

import { runQuery } from 'actions/frames'
import {
  updateAction,
  updateBestEffort,
  updateQuery,
  updateQueryVars,
  updateReadOnly,
} from 'actions/query'

import QueryVarsEditor from 'components/QueryVarsEditor'
import Editor from 'containers/Editor'

import '../assets/css/EditorPanel.scss'

export default function EditorPanel() {
  const dispatch = useDispatch()
  const { action, query, queryVars, bestEffort, readOnly } = useSelector(
    (state) => state.query,
  )
  console.log('Redux query state:', query)

  const setReadOnly = (value) => dispatch(updateReadOnly(value))
  const setBestEffort = (value) => dispatch(updateBestEffort(value))

  const onClearQuery = () => {
    dispatch(updateQuery(''))
    dispatch(updateQueryVars([]))
  }
  const onUpdateQuery = (query) => dispatch(updateQuery(query))
  const onUpdateAction = (action) => dispatch(updateAction(action))

  const onRunCurrentQuery = () =>
    dispatch(
      runQuery(query, action, {
        bestEffort,
        readOnly,
        queryVars: action === 'query' ? queryVars : undefined,
      }),
    )

  const renderRadioBtn = (action, title, selectedAction, onUpdateAction) => (
    <button
      className='action actionable'
      onClick={() => onUpdateAction(action)}
    >
      <label className='editor-label'>
        <input
          className='editor-type'
          type='radio'
          name='action'
          value={action}
          checked={selectedAction === action}
          onChange={() => onUpdateAction(action)}
        />
        &nbsp;
        {title}
      </label>
    </button>
  )

  const isQueryDirty = query.trim() !== ''
  const hasQueryVars = action === 'query' && queryVars?.length

  // Query options only appear if current mode is query
  const queryOptions = action === 'query' && (
    <DropdownButton
      id='query-sliders-dropdown'
      className='action actionable'
      title={<i className='fas fa-sliders-h' />}
    >
      <Dropdown.Item onClick={() => setReadOnly(!readOnly)}>
        <input type='checkbox' checked={readOnly} /> Read Only
      </Dropdown.Item>
      <Dropdown.Item
        onClick={() => setBestEffort(!bestEffort)}
        disabled={!readOnly}
      >
        <input type='checkbox' checked={bestEffort} /> Best Effort
      </Dropdown.Item>
    </DropdownButton>
  )

  return (
    <div className='editor-panel'>
      <div className='header'>
        <div className='actions'>
          {renderRadioBtn('query', 'Query', action, onUpdateAction)}
          {renderRadioBtn('mutate', 'Mutate', action, onUpdateAction)}
        </div>

        {queryOptions}

        <div className='actions right'>
          <button
            className={classnames('action', {
              actionable: isQueryDirty || hasQueryVars,
            })}
            onClick={() => onClearQuery()}
          >
            <i className='fa fa-times' /> Clear
          </button>
          <button
            className={classnames('action', {
              actionable: isQueryDirty,
            })}
            onClick={() => {
              // if (query === "") {
              //     return
              // }

              onRunCurrentQuery()
            }}
          >
            <i className='fa fa-play' /> Run
          </button>
        </div>
      </div>
      <Editor
        onUpdateQuery={onUpdateQuery}
        onHotkeyRun={onRunCurrentQuery}
        query={query}
        maxHeight='fillParent'
      />
      {action === 'query' && <QueryVarsEditor />}
    </div>
  )
}
