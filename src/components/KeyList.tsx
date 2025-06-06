import React, { useState, useEffect } from 'react';
import { Form, InputGroup, ListGroup, Collapse, Button } from 'react-bootstrap';

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
    const [treeRoot, setTreeRoot] = useState<TreeNode>({ key: '', fullPath: '', children: {}, isExpanded: true });

    // Convert flat keys list to tree structure for nested display
    useEffect(() => {
        if (nestedMode) {
            const root: TreeNode = { key: '', fullPath: '', children: {}, isExpanded: true };

            keys.forEach((key) => {
                const parts = key.split('.');
                let currentNode = root;

                parts.forEach((part, index) => {
                    const currentPath = parts.slice(0, index + 1).join('.');

                    if (!currentNode.children[part]) {
                        currentNode.children[part] = {
                            key: part,
                            fullPath: currentPath,
                            children: {},
                            isExpanded: false
                        };
                    }

                    currentNode = currentNode.children[part];
                });
            });

            setTreeRoot(root);
        }
    }, [keys, nestedMode]);

    const filteredKeys = keys.filter((key) => key.toLowerCase().includes(searchTerm.toLowerCase()));

    const toggleNodeExpansion = (node: TreeNode) => {
        node.isExpanded = !node.isExpanded;
        setTreeRoot({ ...treeRoot }); // Force re-render
    };

    const renderTreeNode = (node: TreeNode, level = 0) => {
        const hasChildren = Object.keys(node.children).length > 0;
        const isSelected = selectedKey === node.fullPath;
        const isChildSelected = selectedKey?.startsWith(node.fullPath + '.') || false;

        // If search is active, skip nodes that don't match unless they have matching children
        if (searchTerm && !node.fullPath.toLowerCase().includes(searchTerm.toLowerCase())) {
            return null;
        }

        return (
            <div key={node.fullPath || 'root'} className="tree-node">
                {node.key && (
                    <div
                        className={`tree-node-item d-flex align-items-center ${isSelected ? 'active' : ''}`}
                        style={{ paddingLeft: `${level * 15}px` }}
                    >
                        {hasChildren && (
                            <span
                                className="me-2 expand-icon"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    toggleNodeExpansion(node);
                                }}
                            >
                                {node.isExpanded ? '▼' : '►'}
                            </span>
                        )}

                        <span
                            className={`flex-grow-1 p-2 ${isSelected ? 'selected' : ''} ${
                                isChildSelected ? 'parent-selected' : ''
                            }`}
                            onClick={() => node.fullPath && onSelectKey(node.fullPath)}
                        >
                            {node.key}
                        </span>
                    </div>
                )}

                {(node.isExpanded || searchTerm) && hasChildren && (
                    <div className="tree-children">
                        {Object.values(node.children)
                            .sort((a, b) => a.key.localeCompare(b.key))
                            .map((child) => renderTreeNode(child, level + 1))}
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
            </Form.Group>

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
