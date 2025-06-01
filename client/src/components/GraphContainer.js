/*
 * SPDX-FileCopyrightText: © Hypermode Inc. <hello@hypermode.com>
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react'

import EdgeProperties from 'components/EdgeProperties'
import NodeProperties from 'components/NodeProperties'
import PartialRenderInfo from 'components/PartialRenderInfo'

import D3Graph from 'components/D3Graph'
import MovablePanel from 'components/MovablePanel'

import '../assets/css/Graph.scss'

export default ({
  graphUpdateHack,
  edgesDataset,
  highlightPredicate,
  nodesDataset,
  onCollapseNode,
  onExpandNode,
  onSetPanelMinimized,
  onShowMoreNodes,
  onPanelResize,
  panelMinimized,
  panelHeight,
  panelWidth,
  remainingNodes,
}) => {
  const [selectedNode, setSelectedNode] = React.useState(null)
  const [hoveredNode, setHoveredNode] = React.useState(null)

  const [hoveredEdge, setHoveredEdge] = React.useState(null)
  const [selectedEdge, setSelectedEdge] = React.useState(null)

  const onEdgeSelected = (edge) => {
    setSelectedNode(null)
    setSelectedEdge(edge)
  }
  const onNodeSelected = (node) => {
    setSelectedEdge(null)
    setSelectedNode(node)
  }

  const activeNode = hoveredNode || selectedNode
  const activeEdge = !hoveredNode ? hoveredEdge || selectedEdge : null

  const nodeProps = () => (
    <NodeProperties
      node={activeNode}
      onCollapseNode={onCollapseNode}
      onExpandNode={onExpandNode}
    />
  )

  const edgeProps = () => (
    <EdgeProperties
      edge={activeEdge}
      onSelectSource={() => onNodeSelected(activeEdge.source)}
      onSelectTarget={() => onNodeSelected(activeEdge.target)}
    />
  )

  const renderPanelContent = () => {
    if (hoveredNode) {
      return nodeProps()
    }
    if (hoveredEdge) {
      return edgeProps()
    }
    if (selectedNode) {
      return nodeProps()
    }
    if (selectedEdge) {
      return edgeProps()
    }
    return null
  }

  const panelContent = renderPanelContent()

  return (
    <div className='graph-container'>
      <D3Graph
        edges={edgesDataset}
        highlightPredicate={highlightPredicate}
        nodes={nodesDataset}
        graphUpdateHack={graphUpdateHack}
        onEdgeHovered={setHoveredEdge}
        onEdgeSelected={onEdgeSelected}
        onNodeDoubleClicked={(node) =>
          !node.expanded ? onExpandNode(node.uid) : onCollapseNode(node.uid)
        }
        onNodeHovered={setHoveredNode}
        onNodeSelected={onNodeSelected}
        activeNode={activeNode}
        activeEdge={activeEdge}
      />
      {!remainingNodes ? null : (
        <PartialRenderInfo
          remainingNodes={remainingNodes}
          onShowMoreNodes={onShowMoreNodes}
        />
      )}
      <MovablePanel
        boundingSelector='.graph-container'
        collapsed={!selectedNode && !selectedEdge}
        minimized={panelMinimized}
        title={
          panelContent
            ? null
            : remainingNodes > 0
              ? `Showing ${
                  nodesDataset.size + remainingNodes
                } nodes (${remainingNodes} hidden) and ${edgesDataset.size} edges`
              : `Showing ${nodesDataset.size} nodes and ${edgesDataset.size} edges`
        }
        height={panelHeight}
        width={panelWidth}
        onSetPanelMinimized={onSetPanelMinimized}
        onResize={onPanelResize}
      >
        {renderPanelContent()}
      </MovablePanel>
    </div>
  )
}
