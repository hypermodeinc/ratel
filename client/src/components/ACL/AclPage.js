/*
 * SPDX-FileCopyrightText: © Hypermode Inc. <hello@hypermode.com>
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react'

import memoize from 'memoize-one'
import TimeAgo from 'react-timeago'
import useInterval from 'use-interval'

import AutosizeGrid from 'components/AutosizeGrid'
import VerticalPanelLayout from '../PanelLayout/VerticalPanelLayout'
import CreateGroupModal from './CreateGroupModal'
import EditUserModal from './EditUserModal'
import GroupDetailsPane from './GroupDetailsPane'
import UserDetailsPane from './UserDetailsPane'

import GqlDataAdapter, { isGqlSupported, STATE_LOADING } from './GqlDataAdapter'
import JsonDataAdapter from './JsonDataAdapter'

import './AclPage.scss'

const userColumns = [
  {
    key: 'name',
    name: 'User',
    resizable: true,
    sortable: true,
  },
  {
    key: 'groups',
    name: 'Groups',
    resizable: true,
    sortable: true,
  },
]

const groupColumns = [
  {
    key: 'name',
    name: 'Group',
    resizable: true,
    sortable: true,
  },
  {
    key: 'userCount',
    name: 'No. of Users',
    resizable: true,
    sortable: true,
  },
  {
    key: 'totalPredicateCount',
    name: 'Predicate Count',
    resizable: true,
    sortable: true,
  },
]

const formatUser = ({ name, groups, ...other }) => ({
  name,
  ...other,
  groups:
    groups.length < 4
      ? groups.map((g) => g.name).join(', ')
      : groups
          .map((g) => g.name)
          .slice(0, 3)
          .join(', ') + `and ${groups.length - 3} more`,
})

function SortableGrid({
  rows,
  selection: [selectedName, setSelectedName],
  columns,
}) {
  const [sortColumn, setSortColumn] = useState('name')
  const [sortDirection, setSortDirection] = useState('ASC')

  const getGridData = memoize((rows, usersSortColumn, usersSortDirection) => {
    const sortDir = usersSortDirection === 'DESC' ? -1 : 1
    rows = rows.slice()

    rows.sort((a, b) => {
      a = a[usersSortColumn]
      b = b[usersSortColumn]
      return a > b ? sortDir : -sortDir
    })

    rows = rows.map((row) => {
      return {
        ...row,
        totalPredicateCount:
          (row.acl &&
            row.acl.length &&
            row.acl.map((acl) => acl.predicate).length) ||
          0,
      }
    })

    return rows
  })

  const gridData = getGridData(rows, sortColumn, sortDirection)

  const handleSort = (column, direction) => {
    if (direction === 'NONE') {
      column = 'name'
      direction = 'ASC'
    }
    setSortColumn(column)
    setSortDirection(direction)
  }

  return (
    <AutosizeGrid
      className='datagrid'
      enableCellAutoFocus={false}
      columns={columns}
      rows={gridData}
      onGridSort={handleSort}
      onRowClick={(idx) => setSelectedName(gridData[idx]?.name)}
      rowSelection={{
        showCheckbox: false,
        selectBy: {
          keys: {
            rowKey: 'name',
            values: [selectedName],
          },
        },
      }}
    />
  )
}

export default function AclPage() {
  const [fetchState, setFetchState] = useState(STATE_LOADING)

  const [groups, setGroups] = useState({})
  const [users, setUsers] = useState({})
  const [predicates, setPredicates] = useState([])

  const [leftTab, setLeftTab] = useState('users')
  const [loadingError, setLoadingError] = useState(null)
  const [lastUpdated, setLastUpdated] = useState(null)
  const [modal, setModal] = useState(null)

  const [selectedUserName, setSelectedUserName] = useState(null)
  const [selectedGroupName, setSelectedGroupName] = useState(null)

  const [aclModel, setAclModel] = useState(null)

  useEffect(() => {
    isGqlSupported().then((gqlSupported) => {
      const factory = gqlSupported ? GqlDataAdapter : JsonDataAdapter
      setAclModel(
        factory(
          setFetchState,
          setLastUpdated,
          setUsers,
          setGroups,
          setPredicates,
          setLoadingError,
        ),
      )
    })
  }, [
    setFetchState,
    setLastUpdated,
    setUsers,
    setGroups,
    setPredicates,
    setLoadingError,
  ])

  useEffect(() => {
    setTimeout(() => aclModel?.loadData(), 1000)
    aclModel && aclModel.loadData()
  }, [aclModel])

  useInterval(() => aclModel?.loadData() && undefined, 5000)

  if (!aclModel) {
    return (
      <div className='acl-view'>
        <h2>Access Control</h2>
        <h3>Detecting GraphQL support</h3>
      </div>
    )
  }

  const getTimeAgoWidget = () =>
    !lastUpdated ? null : (
      <span
        style={{
          color: '#888',
          display: 'inline-block',
          fontSize: 12,
          padding: '8px 0 0 8px',
        }}
      >
        Updated&nbsp;
        <TimeAgo date={lastUpdated} minPeriod={10} />
      </span>
    )

  const handleNewUserClick = () => setModal('addUser')

  const renderModalComponent = () => {
    switch (modal) {
      case 'addUser':
        return (
          <EditUserModal
            isCreate={true}
            onCancel={() => setModal(null)}
            onDone={() => {
              setModal(null)
              aclModel.loadData()
            }}
            saveUser={aclModel.saveUser}
          />
        )

      case 'addGroup':
        return (
          <CreateGroupModal
            onCancel={() => setModal(null)}
            onDone={() => {
              setModal(null)
              aclModel.loadData()
            }}
            createGroup={aclModel.createGroup}
          />
        )

      default:
        return null
    }
  }

  const renderUsersToolbar = () => {
    return (
      <div className='btn-toolbar' key='buttonsDiv'>
        <button className='btn btn-primary btn-sm' onClick={handleNewUserClick}>
          Add User
        </button>

        <button className='btn btn-sm' onClick={() => setLeftTab('users')}>
          <input
            type='radio'
            name='action'
            checked={true}
            onChange={() => setLeftTab('users')}
          />
          &nbsp;Users
        </button>

        <button className='btn btn-sm' onClick={() => setLeftTab('groups')}>
          <input
            className='btn btn-sm'
            type='radio'
            name='action'
            checked={false}
            onChange={() => setLeftTab('groups')}
          />
          &nbsp;Groups
        </button>

        <button
          className='btn btn-default btn-sm'
          disabled={fetchState === STATE_LOADING}
          onClick={aclModel.loadData}
        >
          {fetchState === STATE_LOADING ? 'Refreshing...' : 'Refresh'}
        </button>
        {getTimeAgoWidget()}
      </div>
    )
  }

  const renderGroupsToolbar = () => (
    <div className='btn-toolbar schema-toolbar' key='buttonsDiv'>
      <button
        className='btn btn-primary btn-sm'
        onClick={() => setModal('addGroup')}
      >
        Add Group
      </button>

      <button className='btn btn-sm' onClick={() => setLeftTab('users')}>
        <input
          type='radio'
          name='action'
          checked={false}
          onChange={() => setLeftTab('users')}
        />
        &nbsp;Users
      </button>

      <button className='btn btn-sm' onClick={() => setLeftTab('groups')}>
        <input
          className='btn btn-sm'
          type='radio'
          name='action'
          checked={true}
          onChange={() => setLeftTab('groups')}
        />
        &nbsp;Groups
      </button>

      <button
        className='btn btn-default btn-sm'
        disabled={fetchState === STATE_LOADING}
        onClick={aclModel.loadData}
      >
        {fetchState === STATE_LOADING ? 'Refreshing...' : 'Refresh'}
      </button>
      {getTimeAgoWidget()}
    </div>
  )

  const renderRightPanel = (leftTab, obj) => {
    if (!obj) {
      return <div />
    }
    if (leftTab === 'users' && obj) {
      return (
        <UserDetailsPane
          user={obj}
          groups={groups}
          changeUser={aclModel.changeUser}
          onRefresh={aclModel.loadData}
          saveUser={aclModel.saveUser}
          deleteUser={aclModel.deleteUser}
        />
      )
    }
    if (leftTab === 'groups' && obj) {
      return (
        <GroupDetailsPane
          group={obj}
          predicates={predicates}
          saveGroupAcl={aclModel.saveGroupAcl}
          deleteGroup={aclModel.deleteGroup}
          onRefresh={aclModel.loadData}
        />
      )
    }
    return <pre>{JSON.stringify(obj, null, 2)}</pre>
  }

  const leftToolbar =
    leftTab === 'users' ? renderUsersToolbar() : renderGroupsToolbar()
  const leftGrid =
    leftTab === 'users' ? (
      <SortableGrid
        rows={Object.values(users).map(formatUser)}
        selection={[selectedUserName, setSelectedUserName]}
        columns={userColumns}
      />
    ) : (
      <SortableGrid
        rows={Object.values(groups)}
        selection={[selectedGroupName, setSelectedGroupName]}
        columns={groupColumns}
      />
    )

  const rightPanel = renderRightPanel(
    leftTab,
    leftTab === 'users'
      ? Object.values(users).find((u) => u?.name === selectedUserName)
      : Object.values(groups).find((g) => g?.name === selectedGroupName),
  )

  const renderPanels = () => (
    <VerticalPanelLayout
      defaultRatio={0.5}
      first={
        <>
          <h3 className='panel-title'>
            Showing{' '}
            {leftTab === 'users'
              ? `${Object.values(users).length} users`
              : `${Object.values(groups).length} groups`}
          </h3>
          {leftToolbar}
          {leftGrid}
        </>
      }
      second={rightPanel}
    />
  )

  const isAclError = () => {
    const errMsg = JSON.stringify(loadingError) || ''
    return (
      // "only groot..." was an error message from pre-2.0 Dgraph
      errMsg.includes('only groot is allowed') ||
      errMsg.includes('code = Unauthenticated desc = no accessJwt')
    )
  }

  const maybeShowError = () => {
    if (!loadingError) {
      return null
    }
    if (isAclError()) {
      return (
        <div className='alert alert-danger'>
          You need to login as a <strong>guardians group</strong> member to see
          ACL settings.
        </div>
      )
    }
    return (
      <div className='alert alert-danger'>
        Error fetching ACL data: {JSON.stringify(loadingError)}
      </div>
    )
  }

  return (
    <div className='acl-view'>
      <h2>Access Control</h2>
      {maybeShowError()}
      {!isAclError() && renderPanels()}
      {renderModalComponent()}
    </div>
  )
}
