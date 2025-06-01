/*
 * SPDX-FileCopyrightText: © Hypermode Inc. <hello@hypermode.com>
 * SPDX-License-Identifier: Apache-2.0
 */

import CodeMirror from 'codemirror'
import 'codemirror/addon/hint/show-hint.css'
import 'codemirror/addon/hint/show-hint'
import 'codemirror/addon/comment/comment'
import 'codemirror/addon/edit/matchbrackets'
import 'codemirror/addon/edit/closebrackets'
import 'codemirror/addon/fold/foldcode'
import 'codemirror/addon/fold/foldgutter'
import 'codemirror/addon/fold/brace-fold'
import 'codemirror/addon/lint/lint'
import 'codemirror/keymap/sublime'
import 'codemirror/mode/javascript/javascript'
import 'codemirror-graphql/hint'
import 'codemirror-graphql/lint'
import 'codemirror-graphql/info'
import 'codemirror-graphql/jump'
import 'codemirror-graphql/mode'

export default CodeMirror

function sortMatches(a, b) {
  if (a[0] > b[0]) {
    return -1
  }
  if (a[0] < b[0]) {
    return 1
  }

  const nameA = a[1].toLowerCase()
  const nameB = b[1].toLowerCase()

  return nameA < nameB ? -1 : nameA > nameB ? 1 : 0
}

function termMatchesWord(term, word) {
  term = term.trim()
  word = word.toLowerCase().trim()
  if (term.length > word.length) {
    return [false, 0]
  }

  if (word.startsWith(term)) {
    return [true, term.length]
  }

  const Lw = word.length,
    Lt = term.length

  let it = 0,
    iw = 0,
    match = 0,
    weight = 1.0

  while (it < Lt && iw < Lw) {
    if (term[it] === word[iw]) {
      match += weight
      it++
      iw++
      continue
    }
    // Term's character hasn't been found
    iw++
    weight /= 2
  }
  return [it === Lt, match]
}

CodeMirror.registerHelper('hint', 'fromList', (cm, options) => {
  const cur = cm.getCursor()
  const token = cm.getTokenAt(cur)

  const to = CodeMirror.Pos(cur.line, token.end)
  let from = '',
    term = ''
  if (token.string) {
    term = token.string
    from = CodeMirror.Pos(cur.line, token.start)
  } else {
    term = ''
    from = to
  }

  // So that we don't autosuggest for anyof/allof filter values which
  // would be inside quotes.
  if (term.length > 0 && term[0] === '"') {
    return { list: [], from: from, to: to }
  }

  // TODO: This is a hack because Graphiql mode considers . as an invalidchar.
  // Ideally we should write our own mode which allows . in predicate.
  if (
    token.type === 'invalidchar' &&
    token.state.prevState !== undefined &&
    token.state.prevState.kind === 'Field'
  ) {
    term = token.state.prevState.name + token.string
    from.ch -= token.state.prevState.name.length
  }

  // Because Codemirror strips the @ from a directive.
  if (token.state.kind === 'Directive') {
    term = '@' + term
    from.ch -= 1
  }

  const emptyMatch = { list: [], from, to }

  term = term.toLowerCase().trim()
  if (!term) {
    return emptyMatch
  }

  const found = options.words
    .map((word) => [...termMatchesWord(term, word), word])
    .filter((match) => match[0])
    .map(([flag, weight, word]) => [weight, word])

  if (!found.length) {
    return emptyMatch
  }
  return {
    list: found.sort(sortMatches).map(([p, w]) => w),
    from,
    to,
  }
})
