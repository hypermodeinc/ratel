/*
 * SPDX-FileCopyrightText: © Hypermode Inc. <hello@hypermode.com>
 * SPDX-License-Identifier: Apache-2.0
 */

import moment from 'moment'
import React from 'react'
import { useDispatch, useSelector } from 'react-redux'
import useInterval from 'use-interval'

import { getClusterState } from 'actions/cluster'
import { dismissLicenseWarning } from 'actions/connection'

import './LicenseWarning.scss'

// After user has closed the license warning it will re-appear after the
// NAG_INTERVAL in case they closed it accidentally or forgot.
const NAG_INTERVAL = moment.duration(1, 'days')

// How long before expiryTs we start showing the warning
const EXPIRES_SOON_WINDOW = moment.duration(7, 'days')

// How long after the expiryTs we stop warning them - in case they decided not
// to renew this warning will become annoying to them.
const HAS_EXPIRED_WINDOW = moment.duration(14, 'days')

export default function LicenseWarning() {
  const dispatch = useDispatch()

  useInterval(() => {
    dispatch(getClusterState())
  }, 60000)

  const currentServer = useSelector(
    (state) => state.connection.serverHistory[0],
  )
  const licenseWarningDismissedTs =
    currentServer.licenseWarningDismissedTs || -1
  const { clusterState } = useSelector((state) => state.cluster)

  const license = clusterState?.license

  if (
    !license ||
    moment.duration(Date.now() - licenseWarningDismissedTs) < NAG_INTERVAL
  ) {
    return null
  }

  const timeLeft = moment.duration(license.expiryTs * 1000 - Date.now())

  if (
    timeLeft > EXPIRES_SOON_WINDOW ||
    (timeLeft < 0 && timeLeft.abs() > HAS_EXPIRED_WINDOW)
  ) {
    return null
  }

  if (license.enabled && timeLeft < EXPIRES_SOON_WINDOW) {
    return (
      <div className='license-warning'>
        Your enterprise license will expire{' '}
        <strong>{timeLeft.humanize(true)}</strong> from now. To continue using
        enterprise features after <strong>{timeLeft.humanize()}</strong> from
        now, apply a valid license. To get a new license, contact us at{' '}
        <a
          href='https://dgraph.io/contact'
          target='_blank'
          rel='noopener noreferrer'
        >
          https://dgraph.io/contact
        </a>
        .
        <button
          className='dismiss'
          onClick={() => dispatch(dismissLicenseWarning())}
        >
          dismiss
        </button>
      </div>
    )
  }

  return (
    <div className='license-warning expired'>
      Your enterprise license has expired and enterprise features are disabled.
      To continue using enterprise features, apply a valid license. To receive a
      new license, contact us at{' '}
      <a
        href='https://dgraph.io/contact'
        target='_blank'
        rel='noopener noreferrer'
      >
        https://dgraph.io/contact
      </a>
      .
      <button
        className='dismiss'
        onClick={() => dispatch(dismissLicenseWarning())}
      >
        dismiss
      </button>
    </div>
  )
}
