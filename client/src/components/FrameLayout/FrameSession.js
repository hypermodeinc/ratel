/*
 * SPDX-FileCopyrightText: © Hypermode Inc. <hello@hypermode.com>
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";
import memoize from "memoize-one";
import { useDispatch, useSelector } from "react-redux";

import { setPanelMinimized, setPanelSize } from "actions/ui";

import GraphContainer from "components/GraphContainer";
import EntitySelector from "components/EntitySelector";
import { executeQuery } from "lib/helpers";
import { GraphParser } from "lib/graph";
import SchemaGraphParser from "lib/SchemaGraphParser";

const getGraphParser = memoize((response, isSchemaGraph) => {
    const graphParser = isSchemaGraph
        ? new SchemaGraphParser()
        : new GraphParser();
    if (!response) {
        return graphParser;
    }
    // TODO: add support for custom name regex in UI
    const regexStr = "Name";

    graphParser.addResponseToQueue(response.data);
    graphParser.processQueue(regexStr);
    return graphParser;
});

export default function FrameSession({ frame, tabResult }) {
    const { panelMinimized, panelHeight, panelWidth } = useSelector(
        store => store.ui,
    );

    const dispatch = useDispatch();

    const handlePanelResize = panelSize => dispatch(setPanelSize(panelSize));
    const handleSetPanelMinimized = minimized =>
        dispatch(setPanelMinimized(minimized));

    const [hoveredPredicate, setHoveredPredicate] = React.useState(null);

    // TODO: updating graphUpdateHack will force Graphcontainer > D3Graph
    // to re-render, and before render it will refresh nodes/edges dataset.
    // When GraphParser creates a new node or edge the d3 renderer needs to
    // be notified, because they share nodes/edges arrays.
    // But right now d3 renderer and graphParser live in different components.
    // There's no way to send this notification.
    // Most likely solution - make d3 force layout a part of graphParser,
    // that way graphParser will be able to control/update it.
    const [graphUpdateHack, setGraphUpdateHack] = React.useState("");

    const isSchemaGraph =
        frame.action === "query" &&
        /^[ \t\n]*schema[{ \t\n].*/.test(frame.query);

    const graphParser =
        frame.action === "query" &&
        getGraphParser(tabResult && tabResult.response, isSchemaGraph);

    const forceReRender = () => {
        const graph = graphParser.getCurrentGraph();
        setGraphUpdateHack(
            `${Date.now()} ${graph.edges.length} ${graph.nodes.length}`,
        );
    };

    const onShowMoreNodes = () => {
        graphParser.processQueue();
        forceReRender();
    };

    const handleCollapseNode = uid => {
        graphParser.collapseNode(uid);
        forceReRender();
    };

    const handleExpandNode = async uid => {
        const query = `{
          node(func:uid(${uid})) {
            uid
            expand(_all_) {
              uid
              expand(_all_)
            }
          }
        }`;
        try {
            const { data } = await executeQuery(query, {
                action: "query",
                debug: true,
            });
            sendNodesToGraphParser(data, uid);
        } catch (error) {
            // Ignore errors and exceptions on this RPC.
            console.error(error);
        }
    };

    const sendNodesToGraphParser = (data, expansionNode) => {
        graphParser.addResponseToQueue(data, expansionNode);
        graphParser.processQueue("Name");
        forceReRender();
    };

    const graph = graphParser && graphParser.getCurrentGraph();

    return (
        <React.Fragment>
            <GraphContainer
                graphUpdateHack={graphUpdateHack}
                edgesDataset={graph.edges}
                highlightPredicate={hoveredPredicate}
                onShowMoreNodes={onShowMoreNodes}
                nodesDataset={graph.nodes}
                onCollapseNode={handleCollapseNode}
                onExpandNode={handleExpandNode}
                onSetPanelMinimized={handleSetPanelMinimized}
                onPanelResize={handlePanelResize}
                panelMinimized={panelMinimized}
                panelHeight={panelHeight}
                panelWidth={panelWidth}
                remainingNodes={graph.remainingNodes}
            />
            <EntitySelector
                graphLabels={graph.labels}
                onPredicateHovered={setHoveredPredicate}
            />
        </React.Fragment>
    );
}
