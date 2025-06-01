/*
 * SPDX-FileCopyrightText: © Hypermode Inc. <hello@hypermode.com>
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react'

import AutosizeGrid from 'components/AutosizeGrid'
import EditUserModal from './EditUserModal'

export default class UserDetailsPane extends React.Component {
  state = {
    showEditUserModal: false,
  }
  handleEditPassword = () => {
    this.setState({ showEditUserModal: true })
  }

  renderEditUserModal = () =>
    !this.state.showEditUserModal ? null : (
      <EditUserModal
        isCreate={false}
        userName={this.props.user.name}
        userUid={this.props.user.uid}
        onCancel={() => this.setState({ showEditUserModal: false })}
        onDone={() => {
          this.setState({ showEditUserModal: false })
          this.props.onRefresh()
        }}
        saveUser={this.props.saveUser}
      />
    )

  handleDeleteUser = async () => {
    const { deleteUser, onRefresh, user } = this.props
    if (!window.confirm(`Are you sure you want to delete "${user.name}"?`)) {
      return
    }
    await deleteUser(user)
    onRefresh()
  }

  render() {
    const { changeUser, groups, onRefresh, user } = this.props

    const groupColumns = [
      {
        key: 'membership',
        name: '',
        width: 32,
        resizable: true,
        formatter: (cell) => (
          <input
            type='checkbox'
            checked={cell.value.checked}
            onChange={cell.value.invert}
          />
        ),
      },
      {
        key: 'name',
        name: 'Group',
        resizable: true,
      },
      {
        key: 'groups',
        name: 'Predicate Count',
        resizable: true,
        formatter: ({ row }) => {
          return row?.acl?.filter((a) => a.perm).length
        },
      },
    ]

    const isUsersGroup = (groupToCheck) =>
      !!user.groups.find((g) => g.name === groupToCheck.name)

    const gridData = Object.values(groups)
      .slice()
      .sort((a, b) => (a.name < b.name ? -1 : 1))
      .map((g) =>
        Object.assign({}, g, {
          membership: {
            checked: isUsersGroup(g),
            invert: async () => {
              await changeUser(!isUsersGroup(g), user, g)
              await onRefresh()
            },
          },
        }),
      )

    const grid = (
      <AutosizeGrid
        className='datagrid'
        enableCellAutoFocus={false}
        enableCellSelect={false}
        columns={groupColumns}
        rows={gridData}
      />
    )

    return (
      <div className='details-pane-content'>
        <h3 className='panel-title'>User: {user.name}</h3>
        <div className='btn-toolbar'>
          <button
            className='btn btn-primary btn-sm'
            onClick={this.handleEditPassword}
          >
            Change Password
          </button>
          &nbsp;
          <button
            className='btn btn-danger btn-sm'
            style={{ float: 'right' }}
            onClick={this.handleDeleteUser}
          >
            Delete User
          </button>
        </div>
        {grid}
        {this.renderEditUserModal()}
      </div>
    )
  }
}
