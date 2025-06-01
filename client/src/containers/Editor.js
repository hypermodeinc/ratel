/*
 * SPDX-FileCopyrightText: © Hypermode Inc. <hello@hypermode.com>
 * SPDX-License-Identifier: Apache-2.0
 */

import isEmpty from 'lodash.isempty'
import React, { useCallback, useEffect, useRef, useState } from 'react'
import { useSelector } from 'react-redux'

import CodeMirror from './CodeMirror'

import '../assets/css/Editor.scss'

import { executeQuery } from 'lib/helpers'

function isJSON(value) {
  return /^\s*{\s*"/.test(value)
}

export default function Editor({
  maxHeight,
  mode,
  onHotkeyRun,
  onUpdateQuery,
  query,
}) {
  const _editorRef = useRef(null)
  const _bodyRef = useRef(null)

  const [height, setHeight] = useState(200)

  const [editorInstance, setEditorInstance] = useState(undefined)
  const [keywords, setKeywords] = useState([])
  const getValue = () => editorInstance?.getValue() || ''

  const allState = useSelector((state) => state)

  const checkLayoutSize = () => {
    if (!_bodyRef.current) {
      return
    }
    const { offsetHeight } = _bodyRef.current
    // Only set height when it has really changed to avoid infinite loop
    if (offsetHeight !== height) {
      setTimeout(() => {
        setHeight(offsetHeight)
      })
    }
  }
  useEffect(checkLayoutSize, [_bodyRef, height, allState])

  const fetchSchema = useCallback(async () => {
    try {
      const schemaResponse = await executeQuery('schema {}', {
        action: 'query',
      })

      const schema = schemaResponse.data.schema
      const types = schemaResponse.data.types
      if (schema && !isEmpty(schema)) {
        setKeywords((keywords) =>
          keywords.concat(
            schema.map((kw) => kw.predicate),
            schema.map((kw) => `<${kw.predicate}>`),
            types.map((type) => type.name),
          ),
        )
      }
    } catch (error) {
      console.warn('Editor: Error while fetching schema', error)
    }
  }, [setKeywords])

  const fetchUiKeywords = useCallback(async () => {
    try {
      const response = await fetch('/ui/keywords')
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      const data = await response.json()
      setKeywords((kws) => kws.concat(data.keywords.map((kw) => kw.name)))
    } catch (error) {
      console.warn('Editor: Error while fetching ui/keywords', error)
    }
  }, [setKeywords])

  // Once after mount
  useEffect(() => {
    fetchUiKeywords()
    fetchSchema()
  }, [fetchUiKeywords, fetchSchema])

  // Every time keywords change
  useEffect(() => {
    CodeMirror.commands.autocomplete = (cm) => {
      CodeMirror.showHint(cm, CodeMirror.hint.fromList, {
        completeSingle: false,
        words: keywords,
      })
    }
  }, [keywords])

  // Once after mount
  useEffect(() => {
    if (_editorRef.current && _editorRef.current.firstChild) {
      _editorRef.current.removeChild(_editorRef.current.firstChild)
    }
    const editor = CodeMirror(_editorRef.current, {
      value: query || '',
      lineNumbers: true,
      tabSize: 2,
      lineWrapping: true,
      mode: 'graphql',
      readOnly: false,
      theme: 'neo',
      keyMap: 'sublime',
      autoCloseBrackets: true,
      completeSingle: false,
      showCursorWhenSelecting: true,
      foldGutter: true,
      gutters: ['CodeMirror-linenumbers', 'CodeMirror-foldgutter'],
      viewportMargin: 200,
    })
    setEditorInstance(editor)
    editor.setCursor(editor.lineCount(), 0) // Set the cursor at the end of existing content
    // Force-focus the editor
    setTimeout(() => {
      editor.refresh()
      editor.focus()
    })

    return () => {
      // Remove the CodeMirror instance from the DOM
      if (_editorRef.current && _editorRef.current.firstChild) {
        _editorRef.current.removeChild(_editorRef.current.firstChild)
      }
    }
  }, [])

  const useEditorEffect = (fn, deps) =>
    useEffect(() => {
      if (!editorInstance) {
        return
      }
      return fn()
    }, [editorInstance, ...deps])

  useEditorEffect(() => editorInstance.setOption('mode', mode), [mode])

  useEditorEffect(
    () =>
      editorInstance.setOption('extraKeys', {
        'Ctrl-Space': (cm) => CodeMirror.commands.autocomplete(cm),
        'Cmd-Space': (cm) => CodeMirror.commands.autocomplete(cm),
        'Cmd-Enter': () => onHotkeyRun?.(),
        'Ctrl-Enter': () => onHotkeyRun?.(),
      }),
    [onHotkeyRun],
  )

  // Every time editor is created or callback for onUpdateQuery is updated
  useEditorEffect(() => {
    const onChangeHandler = (cm) => {
      const value = editorInstance.getValue()
      const isJsonValue = isJSON()

      console.log('CodeMirror change:', value)

      if (editorInstance.getMode().name === 'graphql') {
        if (isJsonValue) {
          editorInstance.setOption('mode', {
            name: 'javascript',
            json: true,
          })
        }
      } else if (!isJsonValue) {
        editorInstance.setOption('mode', 'graphql')
      }

      if (onUpdateQuery) {
        console.log('Updating query:', value)
        onUpdateQuery(value)
      }
    }

    editorInstance.on('change', onChangeHandler)
    return () => editorInstance.off('change', onChangeHandler)
  }, [onUpdateQuery])

  useEditorEffect(() => {
    editorInstance.on('keydown', (cm, event) => {
      const code = event.keyCode
      if (!event.ctrlKey && code >= 65 && code <= 90) {
        CodeMirror.commands.autocomplete(cm)
      }
    })
  }, [])

  // Every time query changes
  useEditorEffect(() => {
    if (query !== getValue()) {
      console.log('Setting query:', query)
      editorInstance.setValue(query)
    }
  }, [query])

  function getEditorStyles(maxHeight) {
    let h = 0
    const isFillParent =
      maxHeight === 'fillParent' ||
      maxHeight === null ||
      maxHeight === undefined
    if (isFillParent) {
      h = height
    } else {
      const lineCount = editorInstance?.lineCount() || 1
      // These magic numbers have been measured using current CodeMirror
      // styles and automatic resizing of the editor div.
      // Every new line increases editor height by 20px, and editor with
      // N lines has height of 20*N+8 pixels.
      h = Math.min(8 + 20 * lineCount, maxHeight)
      h = Math.max(h, 68)
    }
    return {
      outer: { height: isFillParent ? null : h },
      inner: { height: `${h}px` },
    }
  }

  const style = getEditorStyles(maxHeight)

  return (
    <div className='editor-outer' style={style.outer} ref={_bodyRef}>
      <div ref={_editorRef} className='editor-size-el' style={style.inner} />
    </div>
  )
}
