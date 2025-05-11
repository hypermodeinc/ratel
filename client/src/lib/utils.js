/*
 * SPDX-FileCopyrightText: © Hypermode Inc. <hello@hypermode.com>
 * SPDX-License-Identifier: Apache-2.0
 */

export const getSpace = (tablet) =>
  tablet ? tablet.space || tablet.onDiskBytes : null
