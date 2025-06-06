import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Form, InputGroup } from 'react-bootstrap';
import TreeItem from './TreeItem';
import { useTreeStructure, nodeMatchesSearch } from '../utils/treeUtils';

interface KeyListProps {
    keys: string[];
    selectedKey: string | null;
    onSelectKey: (key: string) => void;
    nestedMode?: boolean;
}

interface TreeNode {
    key: string;
    fullPath: string;
    children: { [key: string]: TreeNode };
    isExpanded: boolean;
}

const KeyList: React.FC<KeyListProps> = ({ keys, selectedKey, onSelectKey, nestedMode = false }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set([''])); // Track expanded nodes by path

    // Use optimized tree structure utility
    const treeRoot = useTreeStructure(keys, nestedMode);

    // Memoize filtered keys for better performance
    const filteredKeys = useMemo(() => {
        return keys.filter((key) => key.toLowerCase().includes(searchTerm.toLowerCase()));
    }, [keys, searchTerm]);

    // When selectedKey changes, make sure all parent nodes are expanded
    useEffect(() => {
        if (selectedKey && nestedMode) {
            const parts = selectedKey.split('.');

            setExpandedNodes((prevExpandedNodes) => {
                const newExpandedNodes = new Set(prevExpandedNodes);

                // Add all parent paths to expanded set
                for (let i = 0; i < parts.length - 1; i++) {
                    const parentPath = parts.slice(0, i + 1).join('.');
                    newExpandedNodes.add(parentPath);
                }

                return newExpandedNodes;
            });
        }
    }, [selectedKey, nestedMode]);

    const toggleNodeExpansion = useCallback((nodePath: string) => {
        setExpandedNodes((prevExpandedNodes) => {
            const newExpandedNodes = new Set(prevExpandedNodes);
            if (newExpandedNodes.has(nodePath)) {
                newExpandedNodes.delete(nodePath);
            } else {
                newExpandedNodes.add(nodePath);
            }
            return newExpandedNodes;
        });
    }, []); // Use regular function for renderTreeNode to avoid dependency issues
    const renderTreeNode = (node: TreeNode, level = 0) => {
        const hasChildren = Object.keys(node.children).length > 0;
        const isSelected = selectedKey === node.fullPath;
        const isChildSelected = selectedKey?.startsWith(node.fullPath + '.') || false;
        const isExpanded = expandedNodes.has(node.fullPath); // If search is active, skip nodes that don't match and don't have matching children
        if (searchTerm && !nodeMatchesSearch(node, searchTerm)) {
            return null;
        }
        return (
            <div key={node.fullPath || 'root'} className="tree-node">
                {node.key && (
                    <TreeItem
                        nodeName={node.key}
                        fullPath={node.fullPath}
                        level={level}
                        isSelected={isSelected}
                        isChildSelected={isChildSelected}
                        isExpanded={isExpanded}
                        hasChildren={hasChildren}
                        onSelect={onSelectKey}
                        onToggleExpand={toggleNodeExpansion}
                    />
                )}

                {(isExpanded || searchTerm) && hasChildren && (
                    <div className="tree-children">
                        {Object.values(node.children)
                            .sort((a: TreeNode, b: TreeNode) => a.key.localeCompare(b.key))
                            .map((child: TreeNode) => renderTreeNode(child, level + 1))}
                    </div>
                )}
            </div>
        );
    };

    return (
        <div className="key-list-container">
            <h5 className="mb-3">Translation Keys</h5>
            <Form.Group className="search-box mb-3">
                <InputGroup>
                    <Form.Control
                        type="text"
                        placeholder="Search keys..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                    {searchTerm && (
                        <InputGroup.Text style={{ cursor: 'pointer' }} onClick={() => setSearchTerm('')}>
                            ×
                        </InputGroup.Text>
                    )}
                </InputGroup>
            </Form.Group>{' '}
            {nestedMode ? (
                <div className="nested-key-list">
                    {Object.keys(treeRoot.children).length === 0 ? (
                        <p className="text-muted">No keys found</p>
                    ) : (
                        renderTreeNode(treeRoot)
                    )}
                </div>
            ) : filteredKeys.length === 0 ? (
                <p className="text-muted">No matching keys found</p>
            ) : (
                <ul className="key-list">
                    {filteredKeys.map((key) => (
                        <li
                            key={key}
                            className={`key-list-item ${selectedKey === key ? 'active' : ''}`}
                            onClick={() => onSelectKey(key)}
                        >
                            {key}
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
};

export default KeyList;
