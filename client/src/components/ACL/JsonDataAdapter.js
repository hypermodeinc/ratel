/*
 * SPDX-FileCopyrightText: © Hypermode Inc. <hello@hypermode.com>
 * SPDX-License-Identifier: Apache-2.0
 */

import { executeQuery } from 'lib/helpers'

export const STATE_LOADING = 0
export const STATE_SUCCESS = 1
export const STATE_ERROR = 2

const mainQuery = `{
  users(func: has(dgraph.password)) {
    uid,
    name: dgraph.xid,

    userGroup: dgraph.user.group {
      uid,
      name: dgraph.xid,
    }
  }

  groups(func: has(dgraph.xid)) {
    uid,
    name: dgraph.xid,
    aclJson: dgraph.group.acl,
  }
}`

export default function JsonDataAdapter(
  setFetchState,
  setLastUpdated,
  setUsers,
  setGroups,
  setPredicates,
  setLoadingError,
) {
  const fetchQuery = async (query) => {
    setFetchState(STATE_LOADING)

    let newIsError = false

    try {
      const res = await executeQuery(query)
      setLastUpdated(new Date())
      return res
    } catch (e) {
      newIsError = true
      throw e
    } finally {
      setFetchState(newIsError ? STATE_ERROR : STATE_SUCCESS)
    }
  }

  const sendMutation = async (mutation) => {
    setFetchState(STATE_LOADING)
    let newIsError = false

    try {
      return await executeQuery(mutation, { action: 'mutate' })
    } catch (e) {
      newIsError = true
      throw e
    } finally {
      setFetchState(newIsError ? STATE_ERROR : STATE_SUCCESS)
    }
  }

  const executeMutation = async (mutation) => {
    try {
      const res = await sendMutation(mutation)

      if (res.errors) {
        throw { serverErrorMessage: res.errors[0].message }
      }

      return res
    } catch (error) {
      if (!error) {
        throw 'Could not connect to the Alpha: Unkown Error'
      }
      if (error.serverErrorMessage) {
        // This is an error thrown from above. Rethrow.
        throw error.serverErrorMessage
      }
      // If no response, it's a network error or client side runtime error.
      const errorText = error.response
        ? await error.response.text()
        : error.message || error

      throw `Alpha Error: ${errorText}`
    }
  }

  const saveGroupAcl = async (group, acl) => {
    // WARNING: double JSON.stringify is intentional.
    const resp = await sendMutation(`{
          set {
            <${group.uid}> <dgraph.group.acl> ${JSON.stringify(JSON.stringify(acl))} .
          }
        }`)
    if (resp?.data?.code !== 'Success') {
      alert(`Something went wrong, could not modify group ${group.name}`)
    }
    await loadData()
  }

  const changeUser = async (isAdd, user, group) => {
    const resp = await sendMutation(`{
          ${isAdd ? 'set' : 'delete'} {
            <${user.uid}> <dgraph.user.group> <${group.uid}> .
          }
        }`)
    if (resp?.data?.code !== 'Success') {
      alert(`Something went wrong, could not modify user ${user.name}`)
    }
    await loadData()
  }

  const saveUser = async (isCreate, userUid, userName, password) => {
    const uid = isCreate ? '<_:newUser>' : `<${userUid}>`
    return await executeMutation(`{
          set {
            ${uid} <dgraph.xid> ${JSON.stringify(userName)} .
            ${uid} <dgraph.password> ${JSON.stringify(password)} .
            ${uid} <dgraph.type> "User" .
          }
        }`)
  }

  const deleteUser = async (user) =>
    await executeMutation(`{
          delete {
            <${user.uid}> * * .
          }
        }`)

  const createGroup = async (groupName) =>
    await executeMutation(`{
          set {
            <_:group> <dgraph.xid> ${JSON.stringify(groupName)} .
            <_:group> <dgraph.type> "Group" .
          }
        }`)

  const deleteGroup = async (group) =>
    await executeMutation(`{
          delete {
            <${group.uid}> * * .
          }
        }`)

  const parseResponse = (data = { users: [], groups: [] }) => {
    const users = {}
    const groups = {}

    const getOrCreateGroup = (uid, name) =>
      groups[uid] || (groups[uid] = { uid, name, userCount: 0, acl: [] })

    const parseUserGroups = (groups) =>
      (groups || []).map(({ uid, name }) => getOrCreateGroup(uid, name))

    data.users.forEach(({ uid, name, userGroup }) => {
      users[uid] = {
        uid,
        name,
        groups: parseUserGroups(userGroup),
      }
    })

    data.groups.forEach(({ uid, name, aclJson }) => {
      if (users[uid]) {
        // This is a user, skip
        return
      }
      getOrCreateGroup(uid, name).acl = JSON.parse(aclJson || '[]')
    })

    Object.values(users).forEach((u) =>
      u.groups.forEach((g) => {
        g.userCount++
      }),
    )

    return { groups, users }
  }

  const loadData = async () => {
    // Fetch chema without blocking this function.
    ;(async () => {
      try {
        const schema = await fetchQuery('schema {}')
        setPredicates(schema?.data?.schema || [])
      } catch (err) {
        console.error(err)
        console.error('Unable to fetch schema for ACL')
      }
    })()

    let isError = false

    try {
      const { data } = await fetchQuery(mainQuery)
      const { users, groups } = parseResponse(data)

      setUsers(users)
      setGroups(groups)
      setLoadingError(undefined)
    } catch (err) {
      console.error(err)
      setLoadingError(JSON.stringify(err?.errors?.[0]))
      isError = true
    } finally {
      setFetchState(isError ? STATE_ERROR : STATE_SUCCESS)
    }
  }

  return {
    changeUser,
    deleteUser,
    createGroup,
    deleteGroup,
    loadData,
    saveGroupAcl,
    saveUser,
  }
}
