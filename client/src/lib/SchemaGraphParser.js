/*
 * SPDX-FileCopyrightText: © Hypermode Inc. <hello@hypermode.com>
 * SPDX-License-Identifier: Apache-2.0
 */

import { produce } from 'immer'

import { GraphParser } from './graph'

export default class SchemaGraphParser extends GraphParser {
  addResponseToQueue(data) {
    data = produce(data, (data) => {
      if (data.schema) {
        data.schema.forEach((p) => {
          p.uid = p.name = p.predicate
        })
      }

      if (data.types) {
        data.types.forEach((type) => {
          type.fields.forEach((f) => {
            f.uid = f.name
          })
        })
      }
    })

    return super.addResponseToQueue(data)
  }
}
