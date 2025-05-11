/*
 * SPDX-FileCopyrightText:  Hypermode Inc. <hello@hypermode.com>
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react'
import TimeAgo from 'react-timeago'

import VerticalPanelLayout from '../PanelLayout/VerticalPanelLayout'
import EditTypeModal from './EditTypeModal'
import PredicateTabs from './PredicateTabs'
import PredicatesTable from './PredicatesTable'
import SchemaDropDataModal from './SchemaDropDataModal'
import SchemaPredicateModal from './SchemaPredicateModal'
import SchemaRawModeModal from './SchemaRawModeModal'
import TypeProperties from './TypeProperties'
import TypesTable from './TypesTable'

import { isUserPredicate } from 'lib/dgraph-syntax'
import { executeQuery } from 'lib/helpers'

import './Schema.scss'

const STATE_LOADING = 0
const STATE_SUCCESS = 1
const STATE_ERROR = 2

function timeAgoFormatter(value, unit, suffix) {
  if (unit === 'second') {
    return `a few moments ${suffix}`
  }
  if (value !== 1) {
    unit += 's'
  }

  return `${value} ${unit} ${suffix}`
}

export default class Schema extends React.Component {
  state = {
    schema: [],
    types: [],
    leftPaneTab: 'predicates', // predicates or types
    fetchState: STATE_LOADING,
    modalKey: 0,
  }

  componentDidMount() {
    this.fetchSchema()

    setTimeout(() => {
      this.fetchSchema()
    }, 1000)
  }

  fetchSchema = async () => {
    this.setState({
      fetchState: STATE_LOADING,
    })

    try {
      const schemaResponse = await executeQuery('schema {}', {
        action: 'query',
      })

      const data = schemaResponse.data
      this.setState({ lastUpdated: new Date() })

      this.setState({
        schema: data.schema,
        types: data.types,
        fetchState: STATE_SUCCESS,
        errorMsg: '',
      })
    } catch (error) {
      console.error(error)

      this.setState({
        schema: [],
        types: [],
        fetchState: STATE_ERROR,
        errorMsg: `Error fetching schema from Alpha: ${error?.message}`,
      })

      return error
    }
  }

  showModal = (modalType) => {
    this.setState({
      modalKey: this.state.modalKey + 1,
      activeModalName: modalType,
    })
  }

  handleNewPredicateClick = () => this.showModal('CreatePredicate')

  handleDropDataClick = () => this.showModal('DropAllData')

  handleRawSchemaClick = () => this.showModal('BulkSchema')

  handleNewTypeClick = () => this.showModal('CreateType')

  handleCloseModal = () =>
    this.setState({
      activeModalName: null,
    })

  handleEditSelectedType = () => {
    if (!this.getSelectedType()) {
      return
    }
    this.showModal('EditSelectedType')
  }

  handleAfterDropData = () => {
    this.fetchSchema()
    this.handleCloseModal()
  }

  handleAfterDropSelectedPredicate = () => {
    this.setState({
      selectedPredicateName: null,
    })
    this.fetchSchema()
  }

  handleAfterUpdate = () => {
    this.fetchSchema()
    this.handleCloseModal()
  }

  executeSchemaQuery = async (query, action) => {
    try {
      const res = await executeQuery(query, { action })
      if (res.errors) {
        throw { serverErrorMessage: res.errors[0].message }
      }
      return res
    } catch (error) {
      if (error.serverErrorMessage) {
        // This is an error thrown from above. Rethrow.
        throw new Error(error.serverErrorMessage)
      }
      // If no response, it's a network error or client side runtime error.
      const errorText = error.response
        ? await error.response.text()
        : error.message

      throw new Error(
        errorText || (error.toString && error.toString()) || error,
      )
    }
  }

  isSchemaEmpty = () => {
    const { schema } = this.state
    if (schema == null || schema.length === 0) {
      return true
    }
    if (schema.length > 3) {
      return false
    }
    return schema.findIndex((p) => isUserPredicate(p.predicate)) < 0
  }

  renderModalComponent = () => {
    const { activeModalName, modalKey, schema, types } = this.state

    switch (activeModalName) {
      case 'CreatePredicate':
        return (
          <SchemaPredicateModal
            key={modalKey}
            create={true}
            predicate={{}}
            onAfterUpdate={this.handleAfterUpdate}
            executeQuery={this.executeSchemaQuery}
            onCancel={this.handleCloseModal}
          />
        )
      case 'DropAllData':
        return (
          <SchemaDropDataModal
            key={modalKey}
            executeQuery={this.executeSchemaQuery}
            onAfterDropData={this.handleAfterDropData}
            onCancel={this.handleCloseModal}
          />
        )
      case 'BulkSchema':
        return (
          <SchemaRawModeModal
            key={modalKey}
            schema={schema}
            types={types}
            executeQuery={this.executeSchemaQuery}
            onAfterUpdate={this.handleAfterUpdate}
            onCancel={this.handleCloseModal}
            onDropData={this.handleDropDataClick}
          />
        )
      case 'CreateType':
        return (
          <EditTypeModal
            key={modalKey}
            executeQuery={this.executeSchemaQuery}
            schema={schema}
            types={types}
            onAfterUpdate={this.handleAfterUpdate}
            onCancel={this.handleCloseModal}
            isCreate={true}
          />
        )
      case 'EditSelectedType':
        return (
          <EditTypeModal
            key={modalKey}
            executeQuery={this.executeSchemaQuery}
            schema={schema}
            onAfterUpdate={this.handleAfterUpdate}
            onCancel={this.handleCloseModal}
            isCreate={false}
            type={this.getSelectedType()}
            types={types}
          />
        )
      default:
        return null
    }
  }

  renderToolbar = () => {
    const { fetchState, lastUpdated, leftPaneTab } = this.state
    return (
      <div className='btn-toolbar schema-toolbar' key='buttonsDiv'>
        {leftPaneTab === 'predicates' && (
          <button
            className='btn btn-primary btn-sm'
            onClick={this.handleNewPredicateClick}
          >
            Add Predicate
          </button>
        )}

        {leftPaneTab === 'types' && (
          <button
            className='btn btn-primary btn-sm'
            onClick={this.handleNewTypeClick}
          >
            Add Type
          </button>
        )}

        <button
          className='btn btn-sm'
          onClick={() => this.setState({ leftPaneTab: 'predicates' })}
        >
          <input
            type='radio'
            name='action'
            checked={leftPaneTab === 'predicates'}
            readOnly
          />
          &nbsp;Predicates
        </button>

        <button
          className='btn btn-sm'
          onClick={() => this.setState({ leftPaneTab: 'types' })}
        >
          <input
            type='radio'
            name='action'
            checked={leftPaneTab === 'types'}
            readOnly
          />
          &nbsp;Types
        </button>

        <button
          className='btn btn-default btn-sm btn-discouraged'
          disabled={fetchState === STATE_LOADING}
          onClick={this.handleRawSchemaClick}
        >
          Bulk Edit
        </button>

        <button
          className='btn btn-default btn-sm'
          disabled={fetchState === STATE_LOADING}
          onClick={this.fetchSchema}
        >
          {fetchState === STATE_LOADING
            ? 'Refreshing Schema...'
            : 'Refresh Schema'}
        </button>
        {!lastUpdated ? null : (
          <span
            style={{
              color: '#888',
              display: 'inline-block',
              fontSize: 12,
              padding: '8px 0 0 8px',
            }}
          >
            Updated&nbsp;
            <TimeAgo
              date={lastUpdated}
              formatter={timeAgoFormatter}
              minPeriod={10}
            />
          </span>
        )}
      </div>
    )
  }

  getSelectedType = () => {
    const { types = [], selectedTypeName } = this.state
    const res = types.find((t) => t.name === selectedTypeName)
    if (selectedTypeName && !res) {
      this.setState({ selectedTypeName: null })
    }
    return res
  }

  render() {
    const {
      errorMsg,
      fetchState,
      leftPaneTab,
      schema,
      selectedPredicateName,
      types = [],
    } = this.state
    const { onOpenGeneratedQuery } = this.props

    const selectedPredicate =
      schema && schema.find((p) => p.predicate === selectedPredicateName)

    if (selectedPredicateName && !selectedPredicate) {
      this.setState({ selectedPredicateName: null })
    }

    const selectedType = this.getSelectedType()

    const isAccessError =
      errorMsg?.indexOf(
        'rpc error: code = Unauthenticated desc = no accessJwt available',
      ) >= 0

    const alertDiv =
      fetchState !== STATE_ERROR ? null : (
        <div className='col-sm-12' style={{ flex: 0, margin: '32px 0 64px' }}>
          <div className='alert alert-danger' role='alert'>
            <p>
              {isAccessError
                ? 'You must be logged in to view Schema on this Alpha'
                : errorMsg}
            </p>
            <button
              className='btn btn-secondary btn-sm'
              onClick={this.fetchSchema}
            >
              Refresh Schema
            </button>
          </div>
        </div>
      )

    const renderSchemaTable = () =>
      !schema || this.isSchemaEmpty() ? (
        <div className='panel panel-default' key='dataDiv'>
          <div className='panel-body'>
            There are no predicates in the schema. Click the button above to add
            a new predicate.
          </div>
        </div>
      ) : (
        <PredicatesTable
          schema={schema}
          selectedPredicate={selectedPredicate}
          onChangeSelectedPredicate={(p) =>
            this.setState({
              selectedPredicateName: p && p.predicate,
            })
          }
        />
      )

    const renderTypesTable = () =>
      !types.length ? (
        <div className='panel panel-default' key='dataDiv'>
          <div className='panel-body'>There are no types in schema</div>
        </div>
      ) : (
        <TypesTable
          types={types}
          selectedType={selectedType}
          onChangeSelectedType={(t) =>
            this.setState({ selectedTypeName: t && t.name })
          }
        />
      )

    const dataDiv =
      leftPaneTab === 'predicates' ? renderSchemaTable() : renderTypesTable()

    const rightPane =
      leftPaneTab === 'predicates' ? (
        <PredicateTabs
          executeQuery={this.executeSchemaQuery}
          onAfterDrop={this.fetchSchema}
          onAfterUpdate={this.handleAfterUpdate}
          onOpenGeneratedQuery={onOpenGeneratedQuery}
          predicate={selectedPredicate}
        />
      ) : selectedType ? (
        <TypeProperties
          type={selectedType}
          onEdit={this.handleEditSelectedType}
        />
      ) : (
        <div>Please select a type.</div>
      )

    return (
      <div className='schema-view'>
        <h2>Schema</h2>
        {alertDiv}
        {!isAccessError && (
          <VerticalPanelLayout
            defaultRatio={0.5}
            first={
              <React.Fragment>
                {this.renderToolbar()}
                {dataDiv}
              </React.Fragment>
            }
            second={rightPane}
          />
        )}

        {this.renderModalComponent()}
      </div>
    )
  }
}
