"use client"

import {
  type Edge,
  Handle,
  MarkerType,
  type Node,
  type NodeProps,
  Position,
  ReactFlow,
  ReactFlowProvider,
  useReactFlow,
} from "@xyflow/react"
import { useEffect, useMemo, useRef, useState } from "react"

import { cn } from "@/lib/utils"

export type CapabilityNodeVariant = "input" | "process" | "database" | "output"

type FlowDirection = "horizontal" | "vertical"

type CapabilityFlowPosition = {
  x: number
  y: number
}

export type CapabilityFlowDefinition = {
  ariaLabel: string
  nodes: {
    id: string
    label: string
    variant?: CapabilityNodeVariant
    desktop: CapabilityFlowPosition
    mobile: CapabilityFlowPosition
  }[]
  edges: {
    source: string
    target: string
  }[]
}

type CapabilityFlowProps = {
  graph: CapabilityFlowDefinition
}

type CapabilityNodeData = {
  direction: FlowDirection
  label: string
  variant: CapabilityNodeVariant
}

type CapabilityNode = Node<CapabilityNodeData, "capability">

function CapabilityNodeView({ data }: NodeProps<CapabilityNode>) {
  const isHorizontal = data.direction === "horizontal"

  return (
    <div
      className={`capability-flow__node capability-flow__node--${data.variant}`}
    >
      <Handle
        id="target"
        type="target"
        position={isHorizontal ? Position.Left : Position.Top}
        isConnectable={false}
        className="!h-px !w-px !border-0 !bg-transparent !opacity-0"
      />

      <span>{data.label}</span>

      <Handle
        id="source"
        type="source"
        position={isHorizontal ? Position.Right : Position.Bottom}
        isConnectable={false}
        className="!h-px !w-px !border-0 !bg-transparent !opacity-0"
      />
    </div>
  )
}

const nodeTypes = { capability: CapabilityNodeView }

function createNodes(
  graph: CapabilityFlowDefinition,
  direction: FlowDirection,
): CapabilityNode[] {
  return graph.nodes.map((node) => {
    const variant = node.variant ?? "process"
    const configuredPosition =
      direction === "horizontal" ? node.desktop : node.mobile
    const position = {
      x: configuredPosition.x,
      y:
        direction === "horizontal" && variant !== "database"
          ? configuredPosition.y + 6
          : configuredPosition.y,
    }

    return {
      id: node.id,
      type: "capability",
      position,
      data: {
        direction,
        label: node.label,
        variant,
      },
      draggable: false,
      selectable: false,
      focusable: false,
    }
  })
}

function createEdges(graph: CapabilityFlowDefinition): Edge[] {
  return graph.edges.map((edge, index) => ({
    id: `${edge.source}-${edge.target}-${index}`,
    source: edge.source,
    sourceHandle: "source",
    target: edge.target,
    targetHandle: "target",
    type: "smoothstep" as const,
    markerEnd: {
      type: MarkerType.ArrowClosed,
      width: 14,
      height: 14,
      color: "var(--muted-foreground)",
    },
    selectable: false,
    focusable: false,
    deletable: false,
  }))
}

function CapabilityFlowCanvas({
  edges,
  isComplex,
  label,
  nodes,
  renderKey,
}: {
  edges: Edge[]
  isComplex: boolean
  label: string
  nodes: CapabilityNode[]
  renderKey: string
}) {
  const containerRef = useRef<HTMLDivElement>(null)
  const { fitView } = useReactFlow()

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    let frame = 0
    const scheduleFitView = () => {
      if (frame) cancelAnimationFrame(frame)
      frame = requestAnimationFrame(() => {
        fitView({ padding: 0.1 })
        frame = 0
      })
    }

    const observer = new ResizeObserver(scheduleFitView)
    observer.observe(container)
    scheduleFitView()

    return () => {
      observer.disconnect()
      if (frame) cancelAnimationFrame(frame)
    }
  }, [fitView])

  return (
    <div
      ref={containerRef}
      className={cn(
        "capability-flow mt-5 w-full overflow-hidden",
        isComplex ? "h-96 md:h-72" : "h-80 md:h-52",
      )}
      role="img"
      aria-label={label}
    >
      <ReactFlow
        key={renderKey}
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.1 }}
        minZoom={0.55}
        maxZoom={1.1}
        nodesDraggable={false}
        nodesConnectable={false}
        nodesFocusable={false}
        edgesFocusable={false}
        elementsSelectable={false}
        panOnDrag={false}
        zoomOnScroll={false}
        zoomOnPinch={false}
        zoomOnDoubleClick={false}
        preventScrolling={false}
        proOptions={{ hideAttribution: true }}
        defaultEdgeOptions={{
          type: "smoothstep",
          style: {
            stroke: "var(--muted-foreground)",
            strokeWidth: 1.25,
            opacity: 0.7,
          },
          markerEnd: {
            type: MarkerType.ArrowClosed,
            width: 14,
            height: 14,
            color: "var(--muted-foreground)",
          },
        }}
      />
    </div>
  )
}

function useFlowDirection(): FlowDirection {
  const [direction, setDirection] = useState<FlowDirection>("vertical")

  useEffect(() => {
    const mediaQuery = window.matchMedia("(min-width: 768px)")
    const updateDirection = () => {
      setDirection(mediaQuery.matches ? "horizontal" : "vertical")
    }

    updateDirection()
    mediaQuery.addEventListener("change", updateDirection)

    return () => mediaQuery.removeEventListener("change", updateDirection)
  }, [])

  return direction
}

export function CapabilityFlow({ graph }: CapabilityFlowProps) {
  const direction = useFlowDirection()
  const nodes = useMemo(() => createNodes(graph, direction), [direction, graph])
  const edges = useMemo(() => createEdges(graph), [graph])

  if (graph.nodes.length === 0) return null

  const renderKey = `${direction}:${graph.ariaLabel}`

  return (
    <ReactFlowProvider>
      <CapabilityFlowCanvas
        edges={edges}
        isComplex={graph.nodes.length > 4}
        label={graph.ariaLabel}
        nodes={nodes}
        renderKey={renderKey}
      />
    </ReactFlowProvider>
  )
}
