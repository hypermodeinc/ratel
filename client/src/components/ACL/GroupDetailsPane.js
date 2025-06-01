/*
 * SPDX-FileCopyrightText: © Hypermode Inc. <hello@hypermode.com>
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react'

import AutosizeGrid from 'components/AutosizeGrid'
import PredicateSearchBar from 'components/PredicateSearchBar'
import { isAclPredicate } from 'lib/dgraph-syntax'

const ACL_READ = 4
const ACL_WRITE = 2
const ACL_MODIFY = 1

export default class GroupDetailsPane extends React.Component {
  state = {
    lastUpdatedAt: Date.now(),
    filteredPredicates: [...this.props.predicates],
  }

  handleDeleteGroup = async () => {
    const { deleteGroup, onRefresh, group } = this.props
    if (
      !window.confirm(`Are you sure you want to delete group "${group.name}"?`)
    ) {
      return
    }
    await deleteGroup(group)
    onRefresh()
  }

  /*
   * Called when PredicateSearchBar fires the 'onFilter' event
   */
  handleFilter = (predicates) => {
    this.setState({
      filteredPredicates: predicates,
      lastUpdatedAt: Date.now(),
    })
  }

  /*
   * Filters predicates and returns only ACL predicates
   * @return - Array of filtered ACL predicates
   */
  getFilteredACLPredicates = () => {
    const { filteredPredicates } = this.state
    return filteredPredicates.filter((p) => isAclPredicate(p.predicate))
  }

  /*
   * Checks whether this predicate exists and if it is selected
   * @param predicate - predicate to check
   * @param mask - mask to check
   * @return - Booleans, whether this predicate exists and if it is selected
   */
  getPredicateACLStatus = (predicate, mask) => {
    const { group } = this.props

    const existing = group.acl.find((x) => x.predicate === predicate)
    const selected = !!existing && !!(existing.perm & mask)

    return { existing, selected }
  }

  /*
   * Toggles ACL for this predicate
   * @param predicate - predicate to toggle ACL for
   */
  toggleACL = (predicate, mask) => {
    const { group } = this.props
    const { existing, selected } = this.getPredicateACLStatus(predicate, mask)

    if (!existing) {
      group.acl.push({
        predicate: predicate,
        perm: mask,
      })
    } else {
      existing.perm += !selected ? mask : -mask
    }
  }

  /*
   * Saves ACL for this group
   */
  saveACL = () => {
    const { group, saveGroupAcl } = this.props
    saveGroupAcl(group, group.acl)
  }

  /*
   * Returns grid data for ACL predicates
   * @return - Array of objects used to create grid
   */
  getGridData = () => {
    const predicates = this.getFilteredACLPredicates()

    const getToggler = (p, mask) => {
      const { selected } = this.getPredicateACLStatus(p, mask)
      return {
        name: p,
        selected,
        toggle: () => {
          this.toggleACL(p, mask)
          this.saveACL()
        },
      }
    }

    return predicates.map((p) => ({
      name: p.predicate,
      read: getToggler(p.predicate, ACL_READ),
      modify: getToggler(p.predicate, ACL_MODIFY),
      write: getToggler(p.predicate, ACL_WRITE),
    }))
  }

  /*
   * Renders the header with a 'Select All' checkbox
   * @return - Function to render the header
   */
  getHeaderRenderer = (mask) => {
    return ({ column }) => {
      const getPredicateNames = () =>
        this.getFilteredACLPredicates().map((p) => p.predicate)
      const getAllPredicatesSelected = (predicates) =>
        predicates.every((p) => this.getPredicateACLStatus(p, mask).selected)

      // Toggle all visible predicates
      const toggleAll = () => {
        const predicates = getPredicateNames()
        const allPredicatesSelected = getAllPredicatesSelected(predicates)

        predicates.forEach((p) => {
          const { selected } = this.getPredicateACLStatus(p, mask)

          if (selected === allPredicatesSelected) {
            this.toggleACL(p, mask)
          }
        })

        this.saveACL()
        this.setState({ lastUpdatedAt: Date.now() })
      }

      const predicates = getPredicateNames()
      const isCheckboxSelected =
        predicates.length > 0 && getAllPredicatesSelected(predicates)

      return (
        <span>
          <input
            className='mr-1'
            type='checkbox'
            checked={isCheckboxSelected}
            onChange={toggleAll}
          />
          {column.name}
        </span>
      )
    }
  }

  render() {
    const { group, predicates } = this.props
    const { lastUpdatedAt } = this.state
    const gridData = this.getGridData()
    const headerRenderer = this.getHeaderRenderer

    const checkboxFormatter = (cell) => (
      <input
        type='checkbox'
        checked={cell.value.selected}
        onChange={cell.value.toggle}
      />
    )

    const columns = [
      {
        key: 'name',
        name: 'Predicate',
        [lastUpdatedAt]: 0, // This forces the headers to refresh every time there's an update
        resizable: true,
      },
      {
        key: 'read',
        name: 'Read',
        resizable: true,
        width: 85,
        formatter: checkboxFormatter,
        headerRenderer: headerRenderer(ACL_READ),
      },
      {
        key: 'modify',
        name: 'Modify',
        resizable: true,
        width: 85,
        formatter: checkboxFormatter,
        headerRenderer: headerRenderer(ACL_MODIFY),
      },
      {
        key: 'write',
        name: 'Write',
        resizable: true,
        width: 85,
        formatter: checkboxFormatter,
        headerRenderer: headerRenderer(ACL_WRITE),
      },
    ]

    return (
      <div className='details-pane-content'>
        <h3 className='panel-title'>Group: {group.name}</h3>

        <div className='btn-toolbar'>
          {' '}
          <button
            className='btn btn-danger btn-sm'
            style={{ float: 'right' }}
            onClick={this.handleDeleteGroup}
          >
            Delete Group
          </button>
        </div>

        <PredicateSearchBar
          predicates={predicates}
          onFilter={this.handleFilter}
        />

        <AutosizeGrid
          className='datagrid'
          columns={columns}
          rows={gridData}
          rowSelection={{
            showCheckbox: false,
            selectBy: {
              keys: {
                rowKey: 'name',
                values: [''],
              },
            },
          }}
        />
      </div>
    )
  }
}
