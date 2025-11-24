import React, { memo } from 'react';
import './TreeItem.css';

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
                        className={`expand-icon ${isExpanded ? 'chevron-down' : 'chevron-right'}`}
                        onClick={(e) => {
                            e.stopPropagation();
                            onToggleExpand(fullPath);
                        }}
                    >
                        <svg
                            width="16"
                            height="16"
                            viewBox="0 0 16 16"
                            fill="currentColor"
                            xmlns="http://www.w3.org/2000/svg"
                        >
                            <path d="M4 6l4 4 4-4H4z" />
                        </svg>
                    </span>
                )}

                <span
                    className={`node-content ${isSelected ? 'selected' : ''} ${
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
