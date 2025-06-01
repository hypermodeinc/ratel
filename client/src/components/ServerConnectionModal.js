/*
 * SPDX-FileCopyrightText:  Hypermode Inc. <hello@hypermode.com>
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react'

import Alert from 'react-bootstrap/Alert'
import Button from 'react-bootstrap/Button'
import Col from 'react-bootstrap/Col'
import Container from 'react-bootstrap/Container'
import Form from 'react-bootstrap/Form'
import ListGroup from 'react-bootstrap/ListGroup'
import Modal from 'react-bootstrap/Modal'
import Row from 'react-bootstrap/Row'
import Tab from 'react-bootstrap/Tab'
import Tabs from 'react-bootstrap/Tabs'

import { useDispatch, useSelector } from 'react-redux'
import useInterval from 'use-interval'

import * as actions from 'actions/connection'
import { clickSidebarUrl } from 'actions/ui'
import { OK } from 'lib/constants'
import { sanitizeUrl } from 'lib/helpers'

import DgraphLogo from '../assets/images/diggy.png'
import HealthDot from './HealthDot'
import ServerLoginWidget from './ServerLoginWidget'
import WizardSteps from './WizardSteps'
import ZeroUrlWidget from './ZeroUrlWidget'

import './ServerConnectionModal.scss'

const CHECK_HEALTH_INTERVAL = 30000

export default function ServerConnectionModal() {
  const dispatch = useDispatch()
  const onHide = () => dispatch(clickSidebarUrl(''))
  const { serverHistory } = useSelector((state) => state.connection)
  const [urlInput, setUrlInput] = useState(serverHistory[0].url)
  const [showError, setShowError] = useState(false)

  const urlInputSanitized = sanitizeUrl(urlInput)
  const activeServer = serverHistory.find((s) => s.url === urlInputSanitized)

  const activeUrl = serverHistory[0].url

  const alreadyConnected = urlInputSanitized === activeUrl

  const isAclEnabled =
    !activeServer || activeServer.isAclEnabled || activeServer?.aclState !== OK

  useEffect(() => {
    // When connected server URL is changed by any action -- update input
    setUrlInput(activeUrl)
  }, [activeUrl])

  useInterval(() => {
    if (!alreadyConnected) {
      return
    }
    dispatch(actions.checkHealth({ unknownOnStart: false }))
  }, CHECK_HEALTH_INTERVAL)

  const connectTo = (url) => {
    if (url.startsWith('dgraph://')) {
      dispatch(actions.setUrlAndSlashApiKey(url))
      onHide()
      return
    }
    if (!url || !url.trim()) {
      setShowError(true)
      return
    }
    url = sanitizeUrl(url)
    if (!url.trim()) {
      setShowError(true)
      return
    }
    dispatch(actions.updateUrl(url))
  }

  const renderSettings = () => {
    if (!activeServer) {
      return (
        <Alert variant='warning'>
          New URL entered. Click 'Connect' before customizing{' '}
          <strong>{urlInputSanitized}</strong>{' '}
        </Alert>
      )
    }

    return (
      <Tabs
        defaultActiveKey={isAclEnabled ? 'acl' : 'extra-settings'}
        id='connection-settings-tabs'
      >
        <Tab eventKey='acl' title='ACL Account'>
          {isAclEnabled ? (
            <ServerLoginWidget
              isMultiTenancyEnabled={activeServer.isMultiTenancyEnabled}
            />
          ) : (
            <em>
              This Alpha has unrestricted access (Access Control Lists are
              disabled)
            </em>
          )}
        </Tab>

        <Tab eventKey='zeroUrl' title='Dgraph Zero'>
          <ZeroUrlWidget />
        </Tab>

        <Tab eventKey='extra-settings' title='Extra Settings'>
          <Form.Group controlId='queryTimeoutInput'>
            <Form.Label>Query timeout (seconds):</Form.Label>
            <Form.Control
              type='number'
              min='1'
              step='1'
              placeholder='<timeout in seconds>'
              value={activeServer.queryTimeout}
              onChange={(e) => {
                const newTimeout = parseInt(e.target.value)
                if (newTimeout > 0) {
                  dispatch(
                    actions.setQueryTimeout(activeServer.url, newTimeout),
                  )
                }
              }}
            />
          </Form.Group>
          <Form.Group controlId='slashApiKeyInput'>
            <Form.Label>Authorization Key (Bearer Token)</Form.Label>
            <Form.Control
              type='text'
              placeholder='••••••••••••'
              value={activeServer.slashApiKey || ''}
              onChange={(e) =>
                dispatch(
                  actions.setSlashApiKey(activeServer.url, e.target.value),
                )
              }
            />
          </Form.Group>
        </Tab>
      </Tabs>
    )
  }

  const wizardSteps = [
    {
      title: 'Network Access',
      className:
        !activeServer || !alreadyConnected
          ? ''
          : activeServer.health === OK
            ? 'ok'
            : 'error',
      content: (
        <a
          className='wizard-link'
          rel='noopener noreferrer'
          target='_blank'
          href={activeUrl}
        >
          <i className='fas fa-plug' />
        </a>
      ),
    },
    {
      title: 'Alpha Health',
      className:
        !activeServer || !alreadyConnected
          ? ''
          : activeServer.health === OK
            ? 'ok'
            : 'warning',
      content: <i className='fas fa-heartbeat' />,
    },

    {
      title:
        activeServer?.aclState !== OK
          ? 'Error reading data! Try logging in'
          : 'Database Access - OK',
      className:
        !activeServer || !alreadyConnected
          ? ''
          : activeServer.aclState === OK
            ? 'ok'
            : 'warning',
      content:
        activeServer?.aclState === OK ? (
          <i className='fas fa-unlock-alt' />
        ) : (
          <i className='fas fa-lock' />
        ),
    },
  ]

  const urlInputBlock = (
    <Form
      className='url-input-box'
      onSubmit={(e) => {
        e.preventDefault()
        connectTo(urlInput)
      }}
    >
      <Form.Group controlId='serverUrlInput'>
        <Form.Label>Dgraph Connection String:</Form.Label>
        <Form.Control
          type='text'
          placeholder='https://dgraph.example.com:port'
          value={urlInput}
          onChange={(event) => {
            const value = event.target.value
            setShowError(value && !value.trim())
            setUrlInput(value)
          }}
          style={{ width: '100%' }}
        />
        {showError ? (
          <p
            style={{
              color: '#dc3545',
              marginTop: '5px',
            }}
          >
            The URL field cannot be empty
          </p>
        ) : (
          <p />
        )}
      </Form.Group>
      <Button
        size='sm'
        type='submit'
        variant={!alreadyConnected ? 'primary' : 'default'}
        onClick={() => connectTo(urlInput)}
        disabled={alreadyConnected || showError}
      >
        {alreadyConnected ? (
          <>
            <span style={{ color: 'var(--success)' }}>✓</span> Connected
          </>
        ) : (
          'Connect'
        )}
      </Button>

      <WizardSteps steps={wizardSteps} />
    </Form>
  )

  const historyDisplay = (
    <>
      <h6>Recent Dgraph Connections</h6>
      <ListGroup>
        {serverHistory.map((s, index) => (
          <ListGroup.Item
            key={s.url}
            title={s.url}
            active={s.url === urlInputSanitized}
            onClick={() => setUrlInput(sanitizeUrl(s.url))}
            onDoubleClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              setUrlInput(sanitizeUrl(s.url))
              connectTo(s.url)
            }}
          >
            <p>{s.url}</p>
            <p className='minor'>
              <button
                className='removeUrl text-danger'
                onClick={(e) => {
                  e.stopPropagation()
                  dispatch(actions.removeUrl(s.url))
                }}
                title={`Remove ${s.url} from server history`}
              >
                <i className='fas fa-trash-alt' />
              </button>{' '}
              {index === 0 && (
                <HealthDot health={s.health} version={s.version} />
              )}{' '}
              {s.version}
            </p>
            <Button
              disabled={s.url === serverHistory[0].url}
              className='btn-connect'
              variant={s.url === serverHistory[0].url ? 'light' : 'primary'}
              size='sm'
              onClick={() => connectTo(s.url)}
            >
              {s.url === serverHistory[0].url ? (
                <i className='fas fa-check-circle' />
              ) : (
                <i className='fas fa-chevron-circle-right' />
              )}
            </Button>
          </ListGroup.Item>
        ))}
      </ListGroup>
    </>
  )

  return (
    <Modal show={true} onHide={onHide} backdrop='static' keyboard={false}>
      <Modal.Header closeButton>
        <Modal.Title>
          <img src={DgraphLogo} alt='Dgraph Logo' className='logo' />
          <span className='title'>Dgraph Connections</span>
        </Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <Container>
          <Row className='main-row'>
            <Col xs={6} lg={4} className='col-history'>
              {historyDisplay}
            </Col>
            <Col xs={6} lg={8} className='col-props'>
              {urlInputBlock}
              <div className='settings'>{renderSettings()}</div>
            </Col>
          </Row>
        </Container>
      </Modal.Body>
      <Modal.Footer>
        <Button onClick={onHide} disabled={false} variant='default'>
          Return to Ratel
        </Button>
        <Button
          onClick={onHide}
          disabled={false}
          variant={
            alreadyConnected && activeServer.aclState === OK
              ? 'primary'
              : 'secondary'
          }
          className='pull-right'
        >
          Continue »
        </Button>
      </Modal.Footer>
    </Modal>
  )
}
