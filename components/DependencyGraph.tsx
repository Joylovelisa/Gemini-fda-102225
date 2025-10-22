import React from 'react';
import { AgentConfig } from '../types';

interface DependencyGraphProps {
  agents: AgentConfig[];
}

const DependencyGraph: React.FC<DependencyGraphProps> = ({ agents }) => {
  if (agents.length === 0) {
    return (
        <div className="p-4 text-center text-gray-500 bg-gray-100 rounded-lg">
            Add an agent to start building your workflow.
        </div>
    );
  }

  const nodeWidth = 160;
  const nodeHeight = 40;
  const horizontalGap = 80;
  const verticalGap = 60;

  // Simple column-based layout
  const positions: { [key: string]: { x: number; y: number } } = {};
  agents.forEach((agent, index) => {
    positions[agent.id] = {
      x: (index % 4) * (nodeWidth + horizontalGap) + nodeWidth / 2,
      y: Math.floor(index / 4) * (nodeHeight + verticalGap) + nodeHeight / 2,
    };
  });
  
  const width = Math.min(4, agents.length) * (nodeWidth + horizontalGap);
  const height = (Math.floor((agents.length -1) / 4) + 1) * (nodeHeight + verticalGap);


  return (
    <div className="p-4 bg-white/50 rounded-lg border border-[var(--color-border)] overflow-x-auto">
      <svg width={width} height={height} className="min-w-full">
        <defs>
          <marker
            id="arrowhead"
            markerWidth="10"
            markerHeight="7"
            refX="9"
            refY="3.5"
            orient="auto"
          >
            <polygon points="0 0, 10 3.5, 0 7" fill="var(--color-secondary)" />
          </marker>
        </defs>
        
        {/* Render lines/arrows first so they are under the nodes */}
        {agents.map(agent =>
          agent.dependencies.map(depId => {
            const startPos = positions[depId];
            const endPos = positions[agent.id];
            if (!startPos || !endPos) return null;
            
            // Calculate line end point to be on the edge of the node, not center
            const dx = endPos.x - startPos.x;
            const dy = endPos.y - startPos.y;
            const angle = Math.atan2(dy, dx);
            const endX = endPos.x - (nodeWidth / 2) * Math.cos(angle);
            const endY = endPos.y - (nodeWidth / 2) * Math.sin(angle);


            return (
              <line
                key={`${depId}-${agent.id}`}
                x1={startPos.x}
                y1={startPos.y}
                x2={endX}
                y2={endY}
                stroke="var(--color-secondary)"
                strokeWidth="2"
                markerEnd="url(#arrowhead)"
              />
            );
          })
        )}
        
        {/* Render nodes */}
        {agents.map((agent, index) => {
          const pos = positions[agent.id];
          if (!pos) return null;
          return (
            <g key={agent.id} transform={`translate(${pos.x}, ${pos.y})`}>
              <rect
                x={-nodeWidth / 2}
                y={-nodeHeight / 2}
                width={nodeWidth}
                height={nodeHeight}
                rx="8"
                fill="var(--color-background-start)"
                stroke="var(--color-primary)"
                strokeWidth="2"
              />
              <text
                x="0"
                y="0"
                textAnchor="middle"
                dominantBaseline="middle"
                fill="var(--color-text-primary)"
                fontSize="12"
                fontWeight="bold"
                className="select-none"
              >
                Agent {index + 1}
              </text>
               <text
                x="0"
                y="10"
                textAnchor="middle"
                dominantBaseline="middle"
                fill="var(--color-text-secondary)"
                fontSize="9"
                className="select-none"
               >
                ({agent.name.length > 20 ? agent.name.substring(0, 18) + '...' : agent.name})
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
};

export default DependencyGraph;
