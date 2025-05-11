/*
 * SPDX-FileCopyrightText: © Hypermode Inc. <hello@hypermode.com>
 * SPDX-License-Identifier: Apache-2.0
 */

import { setCurrentServerUrl } from 'lib/helpers'

export const GET_INSTANCE_HEALTH_RESULT = 'cluster/GET_INSTANCE_HEALTH_RESULT'
export const GET_CLUSTER_STATE_RESULT = 'cluster/GET_CLUSTER_STATE_RESULT'
export const SET_IS_AUTHORIZED = 'cluster/SET_IS_AUTHORIZED'
// Helper to get the current server URL from state
function getServerUrl(getState) {
  return getState().connection.serverHistory[0]?.url
}

export function getInstanceHealth() {
  return async (dispatch, getState) => {
    const url = getServerUrl(getState)
    setCurrentServerUrl(url)
    try {
      const response = await fetch(url + '/health')
      if (!response.ok) throw new Error(await response.text())
      const health = await response.json()
      dispatch(getInstanceHealthResult(health))
      dispatch(setIsAuthorized(true))
    } catch (err) {
      if (isPermissionError(err)) {
        dispatch(setIsAuthorized(false))
      }
      dispatch(getInstanceHealthResult(null))
    }
  }
}

export function getInstanceHealthResult(json) {
  return {
    type: GET_INSTANCE_HEALTH_RESULT,
    json,
  }
}

export function getClusterState() {
  return async (dispatch, getState) => {
    const url = getServerUrl(getState)
    setCurrentServerUrl(url)
    try {
      const response = await fetch(url + '/state')
      if (!response.ok) throw new Error(await response.text())
      const clusterState = await response.json()
      dispatch(getClusterStateResult(clusterState))
      dispatch(setIsAuthorized(true))
    } catch (err) {
      if (isPermissionError(err)) {
        dispatch(setIsAuthorized(false))
      }
      dispatch(getClusterStateResult(null))
    }
  }
}

export function getClusterStateResult(json) {
  return {
    type: GET_CLUSTER_STATE_RESULT,
    json,
  }
}

function isPermissionError(err) {
  const msg = err.errors?.[0]?.message || err.message
  if (msg && msg.indexOf('PermissionDenied') > 0) {
    return true
  }
  return false
}

export function setIsAuthorized(isAuthorized) {
  return {
    type: SET_IS_AUTHORIZED,
    isAuthorized,
  }
}
