/*
 * SPDX-FileCopyrightText: © Hypermode Inc. <hello@hypermode.com>;
 * SPDX-License-Identifier: Apache-2.0
 */

// import memoizeOne from "memoize-one";
import JSONbigint from 'json-bigint'

export function createCookie(name, val, days, options = {}) {
  const cookie = [`${name}=${val}`, 'path=/']
  if (options.crossDomain) {
    cookie.push('domain=.dgraph.io')
  }

  if (days) {
    const date = new Date(Date.now() + days * 24 * 60 * 60 * 1000)
    cookie.push(`expires=${date.toUTCString()}`)
  }

  document.cookie = cookie.join('; ')
}

export function readCookie(name) {
  const nameEQ = name + '='
  const matchedStr = document.cookie
    .split(';')
    .map((str) => str.trim())
    .find((str) => str.startsWith(nameEQ))

  return matchedStr ? matchedStr.substring(nameEQ.length) : null
}

export function eraseCookie(name, options) {
  createCookie(name, '', -1, options)
}

export function serverLatency(latencyObj) {
  let totalLatency = 0
  // Server returns parsing, processing and encoding latencies in ns separately.
  for (const latency in latencyObj) {
    if (latencyObj.hasOwnProperty(latency)) {
      totalLatency += parseFloat(latencyObj[latency])
    }
  }

  totalLatency /= 1e6

  if (totalLatency < 1) {
    return Math.round(totalLatency * 1000) + 'μs'
  } else if (totalLatency > 1000) {
    return Math.round(totalLatency / 1000) + 's'
  } else {
    return Math.round(totalLatency) + 'ms'
  }
}

export function humanizeBytes(space) {
  let n = parseInt(space)
  let unitIdx = 0
  const units = ['B', 'kB', 'MB', 'GB', 'TB']
  while (n > 1024 * 0.9 && unitIdx < units.length - 1) {
    unitIdx++
    n /= 1024
  }
  return `${Number(n).toFixed(1)}${units[unitIdx]}`
}

let dgraphServerUrl = getDefaultUrl()
let dgraphAuthToken = null
let dgraphSlashApiKey = null
let dgraphQueryTimeout = null

export function setCurrentServerUrl(url) {
  dgraphServerUrl = url
}

export const parseDgraphUrl = (url) => {
  // Handle dgraph:// protocol
  if (url.startsWith('dgraph://')) {
    const [_protocol, rest] = url.split('://')
    const [host, queryString] = rest.split('?')
    const params = new URLSearchParams(queryString || '')

    // Get sslmode with default as 'disable'
    const sslmode = params.get('sslmode') || 'disable'

    // Only strip port for hypermode hosts
    const isHypermodeHost =
      host.includes('hypermode.host') || host.includes('hypermode-stage.host')
    const hostWithoutPort = isHypermodeHost ? host.split(':')[0] : host

    // Use http for disable, https for others (require/verify-ca)
    const protocol = sslmode === 'disable' ? 'http' : 'https'

    const finalUrl = isHypermodeHost
      ? `${protocol}://${hostWithoutPort}/dgraph`
      : `${protocol}://${host}`

    return {
      url: finalUrl,
      sslmode,
      bearertoken: params.get('bearertoken'),
    }
  }

  // Handle regular http(s) URLs
  return {
    url,
    sslmode: 'verify-ca',
    bearertoken: null,
  }
}

export async function setCurrentServerQueryTimeout(timeout) {
  dgraphQueryTimeout = timeout
}

export function setCurrentServerSlashApiKey(slashApiKey) {
  dgraphSlashApiKey = slashApiKey
}

export function setCurrentServerAuthToken(authToken) {
  dgraphAuthToken = authToken
}

// Helper to build headers
function buildHeaders(contentType = 'application/dql') {
  const headers = {
    'Content-Type': contentType,
  }
  if (dgraphAuthToken) headers['X-Dgraph-AccessToken'] = dgraphAuthToken
  if (dgraphSlashApiKey) headers['X-Auth-Token'] = dgraphSlashApiKey
  return headers
}

// Main query/mutation executor
export async function executeQuery(
  query,
  {
    action = 'query',
    debug = false,
    readOnly = false,
    bestEffort = false,
    queryVars = undefined,
  } = {},
) {
  console.log('[executeQuery] called with:', {
    query,
    action,
    debug,
    readOnly,
    bestEffort,
    queryVars,
  })
  const url = dgraphServerUrl
  const headers = buildHeaders('application/dql')
  let body = query
  let endpoint = '/query'
  const params = []
  if (debug) params.push('debug=true')
  if (readOnly) params.push('ro=true')
  if (bestEffort) params.push('be=true')
  if (dgraphQueryTimeout) {
    // If the value is a number or a string without a unit, append 's' for seconds
    const timeoutStr =
      typeof dgraphQueryTimeout === 'number' ||
      /^[0-9]+$/.test(dgraphQueryTimeout)
        ? `${dgraphQueryTimeout}s`
        : dgraphQueryTimeout
    params.push(`timeout=${timeoutStr}`)
  }
  if (params.length) endpoint += `?${params.join('&')}`

  if (action === 'mutate') {
    endpoint = '/mutate'
    headers['Content-Type'] = 'application/rdf'
  }
  if (action === 'alter') {
    return executeAlter(query)
  }

  // Support GraphQL variables (for /query)
  if (queryVars && Object.keys(queryVars).length > 0) {
    headers['Content-Type'] = 'application/json'
    body = JSON.stringify({ query, variables: queryVars })
  }

  console.log('[executeQuery] fetch to:', url + endpoint)
  const response = await fetch(url + endpoint, {
    method: 'POST',
    headers,
    body,
  })
  console.log('[executeQuery] response status:', response.status)
  const text = await response.text()
  console.log('[executeQuery] response text:', text)
  if (!response.ok) throw new Error(text)
  return JSONbigint.parse(text)
}

export async function executeAlter(schema) {
  const url = dgraphServerUrl + '/alter'
  const headers = buildHeaders('application/dql')
  const response = await fetch(url, {
    method: 'POST',
    headers,
    body: schema,
  })
  if (!response.ok) throw new Error(await response.text())
  return JSONbigint.parse(await response.text())
}

export async function executeAdminGql(query, variables) {
  // POSTs to /admin endpoint with GraphQL
  const url = dgraphServerUrl + '/admin'
  const headers = buildHeaders('application/json')
  const body = JSON.stringify({ query, variables, operationName: null })
  const response = await fetch(url, {
    method: 'POST',
    headers,
    body,
  })
  if (!response.ok) throw new Error(await response.text())
  return JSONbigint.parse(await response.text())
}

export function getHashParams() {
  const params = [...new URLSearchParams(window.location.hash)]
  if (!params.length) {
    return {}
  }
  params[0][0] = params[0][0].slice(1)
  return params.reduce(
    (acc, [key, value]) => Object.assign(acc, { [key]: value }),
    {},
  )
}

export function getAddrParam() {
  return (
    getHashParams().addr ||
    new URLSearchParams(window.location.search).get('addr') ||
    ''
  )
}

export function getDefaultUrl() {
  const addrParam = getAddrParam()
  if (addrParam) {
    return addrParam
  }
  if (window.SERVER_ADDR) {
    return window.SERVER_ADDR
  }

  const hostname = window.location.hostname
  let port = ':8080'
  if (hostname !== 'localhost' && hostname !== '127.0.0.1') {
    port = window.location.port ? ':' + window.location.port : ''
  }

  return `${window.location.protocol}//${hostname}${port}`
}

export function sanitizeUrl(url) {
  // Add http if a scheme is not specified.
  if (!/^[a-zA-Z][a-zA-Z+.-]*?:\/\//i.test(url)) {
    url = 'http://' + url
  }

  const parser = document.createElement('a')
  parser.href = url

  return ensureNoSlash(`${parser.protocol}//${parser.host}${parser.pathname}`)
}

function ensureNoSlash(path) {
  if (path.endsWith('/')) {
    return path.substring(0, path.length - 1)
  }
  return path
}
