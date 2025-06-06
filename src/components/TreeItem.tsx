import React, { memo } from 'react';

interface TreeNodeProps {
    nodeName: string;
    fullPath: string;
    level: number;
    isSelected: boolean;
    isChildSelected: boolean;
    isExpanded: boolean;
    hasChildren: boolean;
    onSelect: (path: string) => void;
    onToggleExpand: (path: string) => void;
}

// Memoized tree item component to prevent unnecessary re-renders
const TreeItem: React.FC<TreeNodeProps> = memo(
    ({ nodeName, fullPath, level, isSelected, isChildSelected, isExpanded, hasChildren, onSelect, onToggleExpand }) => {
        return (
            <div
                className={`tree-node-item d-flex align-items-center ${isSelected ? 'active' : ''}`}
                style={{ paddingLeft: `${level * 15}px` }}
            >
                {hasChildren && (
                    <span
                        className="me-2 expand-icon"
                        onClick={(e) => {
                            e.stopPropagation();
                            onToggleExpand(fullPath);
                        }}
                    >
                        {isExpanded ? '▼' : '►'}
                    </span>
                )}

                <span
                    className={`flex-grow-1 p-2 ${isSelected ? 'selected' : ''} ${
                        isChildSelected ? 'parent-selected' : ''
                    }`}
                    onClick={() => fullPath && onSelect(fullPath)}
                >
                    {nodeName}
                </span>
            </div>
        );
    },
    (prevProps, nextProps) => {
        // Custom comparison for memoization
        return (
            prevProps.isSelected === nextProps.isSelected &&
            prevProps.isChildSelected === nextProps.isChildSelected &&
            prevProps.isExpanded === nextProps.isExpanded &&
            prevProps.level === nextProps.level
        );
    }
);

export default TreeItem;
